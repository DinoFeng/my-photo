import express, { Express } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import apiRoutes from './routes/api/index'
import sseRoutes from './routes/sse/index'
import { errorHandler, notFoundHandler } from './middleware/errorHandlerMiddleware'
import { accessLoggerMiddleware, errorLogger } from './middleware/loggerMiddleware'
import { appLogger } from './utils/logging'
import { ensureDatabaseReady } from './services/dbInitService'
import { registerEventHandlers } from './listeners/eventHandlers'
import { monitorService } from './instances/sse'
import { eventBus } from './instances/eventBus'
import { DB_READY } from './utils/eventBus'

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

registerEventHandlers()

app.listen(PORT, async () => {
  appLogger.info(`Server running on port ${PORT}`)
  try {
    await ensureDatabaseReady()
    app.locals.isReady = true
    monitorService.broadcast({
      event: 'ready',
      data: { status: 'ready', timestamp: new Date().toISOString() },
    })
    appLogger.info('API ready')

    eventBus.emit(DB_READY)
  } catch (error) {
    appLogger.exception('Startup failed', error instanceof Error ? error : undefined)
    process.exit(1)
  }
})