import express, { Express } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { db as drizzleDb } from './db'
import apiRoutes from './routes'
import { errorHandler, notFoundHandler } from './middleware/errorHandlerMiddleware'
import { accessLogger, errorLogger } from './middleware/loggerMiddleware'

import './listeners/queueHandlers'
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
app.use(errorHandler)

registerEventHandlers()

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app