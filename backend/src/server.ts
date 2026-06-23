import express, { Express } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

import apiRoutes from './routes/api/index'
import sseRoutes from './routes/sse/index'
import { errorHandler, notFoundHandler } from './middleware/errorHandlerMiddleware'
import { accessLoggerMiddleware, errorLogger } from './middleware/loggerMiddleware'
import { appLogger } from '@my-photo/shared'
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
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

app.use('/sse', sseRoutes)
app.use('/api', apiRoutes)

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