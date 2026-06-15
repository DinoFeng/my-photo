import express, { Express } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import apiRoutes from './routes/index'
import { errorHandler, notFoundHandler } from './middleware/errorHandlerMiddleware'
import { accessLogger, errorLogger } from './middleware/loggerMiddleware'
import { ensureDatabaseReady } from './services/dbInitService'
import { checkAndPublishChangedDirectories } from './services/startupService'
import { startAllQueues } from './listeners/queueHandlers'
import { registerEventHandlers } from './listeners/eventHandlers'
import { monitorService } from './instances/sse'

dotenv.config()

const app: Express = express()
app.locals.isReady = false
const PORT = process.env.PORT || 3000

app.use(accessLogger)
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

app.use('/api', apiRoutes)

app.use(notFoundHandler)
app.use(errorLogger)
app.use(errorHandler)

app.listen(PORT, async () => {
  console.log(`[Server] Running on port ${PORT}`)
  try {
    await ensureDatabaseReady()
    app.locals.isReady = true
    monitorService.broadcast({
      event: 'ready',
      data: { status: 'ready', timestamp: new Date().toISOString() },
    })
    console.log('[Server] Database ready, API available')

    registerEventHandlers()
    startAllQueues()
    await checkAndPublishChangedDirectories()
    console.log('[Server] Startup complete')
  } catch (error) {
    console.error('[Server] Startup failed:', error)
    process.exit(1)
  }
})