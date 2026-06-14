import express, { Express } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { db as drizzleDb } from './db/index'
import apiRoutes from './routes/index'
import { errorHandler, notFoundHandler } from './middleware/errorHandlerMiddleware'
import { accessLogger, errorLogger } from './middleware/loggerMiddleware'
import { ensureDatabaseReady } from './services/dbInitService'
import { checkAndPublishChangedDirectories } from './services/startupService'
import { startAllQueues } from './listeners/queueHandlers'
import { registerEventHandlers } from './listeners/eventHandlers'

dotenv.config()

export const prisma = drizzleDb

const app: Express = express()
const PORT = process.env.PORT || 3000

app.use(accessLogger)
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

app.use('/api', apiRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use(notFoundHandler)
app.use(errorLogger)
app.use(errorHandler)

app.listen(PORT, async () => {
  console.log(`[Server] Running on port ${PORT}`)
  await ensureDatabaseReady()
  registerEventHandlers()
  startAllQueues()
  await checkAndPublishChangedDirectories()
})