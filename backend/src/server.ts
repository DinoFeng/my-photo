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
import { monitorService } from './instances/sse'

dotenv.config()

const app: Express = express()
app.locals.isReady = false
const PORT = process.env.PORT || 3000

app.use(accessLoggerMiddleware)
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

app.use('/sse', sseRoutes)
app.use('/api', apiRoutes)

app.use(notFoundHandler)
app.use(errorLogger)
app.use(errorHandler)

app.listen(PORT, async () => {
  appLogger.info(`API Server running on port ${PORT}`)
  try {
    await ensureDatabaseReady()
    app.locals.isReady = true
    monitorService.broadcast({
      event: 'ready',
      data: { status: 'ready', timestamp: new Date().toISOString() },
    })
    appLogger.info('API Server ready')
  } catch (error) {
    appLogger.exception('Startup failed', error instanceof Error ? error : undefined)
    process.exit(1)
  }
})