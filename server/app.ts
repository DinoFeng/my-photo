import express from 'express'
import cors from 'cors'
import { initializeDatabase } from './db/index.js'
import { createSystemAlbums } from './services/AlbumService.js'
import photosRouter from './routes/photos.js'
import albumsRouter from './routes/albums.js'
import settingsRouter from './routes/settings.js'
import importRouter from './routes/import.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use('/api/photos', photosRouter)
app.use('/api/albums', albumsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/import', importRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

export async function startServer(): Promise<void> {
  try {
    await initializeDatabase()
    await createSystemAlbums()
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer()
}
