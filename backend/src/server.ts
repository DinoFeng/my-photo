import express, { Express } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { appLogger } from '@my-photo/shared'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

// ================================================
// 启动前关键环境变量校验（必须在任何副作用前执行）
// ================================================
const _initUsername = process.env.INIT_USERNAME
const _initPassword = process.env.INIT_PASSWORD
if (!_initUsername || !_initPassword) {
  const SEP = '=================================================='
  appLogger.error(SEP)
  appLogger.error('[FATAL] 必须配置 INIT_USERNAME 和 INIT_PASSWORD 环境变量')
  appLogger.error('  否则系统将无法登录。请在启动时设置：')
  appLogger.error('  Linux/macOS:  INIT_USERNAME=admin INIT_PASSWORD=xxx npm run dev')
  appLogger.error('  Windows (PS):  $env:INIT_USERNAME="admin"; $env:INIT_PASSWORD="xxx"; npm run dev')
  appLogger.error('  Windows (CMD): set INIT_USERNAME=admin && set INIT_PASSWORD=xxx && npm run dev')
  appLogger.error('  Docker:        docker run -e INIT_USERNAME=xxx -e INIT_PASSWORD=xxx ...')
  appLogger.error('  或在 backend/.env / 项目根 .env 中添加：')
  appLogger.error('    INIT_USERNAME=admin')
  appLogger.error('    INIT_PASSWORD=你的密码')
  appLogger.error(SEP)
  process.exit(1)
}

import apiRoutes from './routes/api/index'
import sseRoutes from './routes/sse/index'
import shareRoutes from './routes/shareRoutes'
import { errorHandler, notFoundHandler } from './middleware/errorHandlerMiddleware'
import { accessLoggerMiddleware, errorLogger } from './middleware/loggerMiddleware'
import { parseUserSession } from './middleware/authMiddleware'
import { ensureDatabaseReady } from './services/dbInitService'
import { monitorService, broadcastTask } from './instances/sse'
import { WsClient } from './utils/wsClient'

dotenv.config()

const app: Express = express()
app.locals.isReady = false
const PORT = parseInt(process.env.PORT || '3000', 10)
const HOST = process.env.HOST || '0.0.0.0'
const WS_HUB_URL = process.env.WS_HUB_URL || 'ws://localhost:3001'

app.use(accessLoggerMiddleware)
app.use(cors({
  credentials: true,
  origin: true,
}))
app.use(express.json())
app.use(cookieParser())
app.use(parseUserSession)
app.use(express.static('public'))

app.use('/sse', sseRoutes)
app.use('/api', apiRoutes)
app.use('/share', shareRoutes)

app.use(notFoundHandler)
app.use(errorLogger)
app.use(errorHandler)

app.listen(PORT, HOST, async () => {
  appLogger.info(`API Server running on port ${PORT}`)
  try {
    await ensureDatabaseReady()
    appLogger.info('Database ready, connecting to WS Hub')

    const wsClient = new WsClient(WS_HUB_URL, 'backend')
    app.locals.wsClient = wsClient

    wsClient.onNotify((message) => {
      broadcastTask(message.event, message.queue, message.payload, message.error)
    })

    wsClient.onReady(() => {
      app.locals.isReady = true
      monitorService.broadcast({
        event: 'ready',
        data: { status: 'ready', timestamp: new Date().toISOString() },
      })
      appLogger.info('API Server ready')
    })

    wsClient.connect()
  } catch (error) {
    appLogger.exception('Startup failed', error instanceof Error ? error : undefined)
    process.exit(1)
  }
})