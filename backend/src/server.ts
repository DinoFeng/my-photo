import express, { Express } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import apiRoutes from './routes'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { accessLogger, errorLogger } from './middleware/logger'

// 导入消费者注册模块（确保消费者在应用启动时被注册）
import './services/queueConsumers'

dotenv.config()

export const prisma = new PrismaClient()

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app