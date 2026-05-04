import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

const photos: any[] = [
  { id: '1', fileName: 'photo1.jpg', filePath: '/photos/photo1.jpg', thumbnailPath: 'https://picsum.photos/400/300?random=1', takenDate: '2024-01-01', fileSize: 1024000, width: 1920, height: 1080 },
  { id: '2', fileName: 'photo2.jpg', filePath: '/photos/photo2.jpg', thumbnailPath: 'https://picsum.photos/400/300?random=2', takenDate: '2024-01-02', fileSize: 2048000, width: 1920, height: 1080 },
  { id: '3', fileName: 'photo3.jpg', filePath: '/photos/photo3.jpg', thumbnailPath: 'https://picsum.photos/400/300?random=3', takenDate: '2024-01-03', fileSize: 1536000, width: 1920, height: 1080 },
  { id: '4', fileName: 'photo4.jpg', filePath: '/photos/photo4.jpg', thumbnailPath: 'https://picsum.photos/400/300?random=4', takenDate: '2024-01-04', fileSize: 2048000, width: 1920, height: 1080 },
  { id: '5', fileName: 'photo5.jpg', filePath: '/photos/photo5.jpg', thumbnailPath: 'https://picsum.photos/400/300?random=5', takenDate: '2024-01-05', fileSize: 1024000, width: 1920, height: 1080 },
  { id: '6', fileName: 'photo6.jpg', filePath: '/photos/photo6.jpg', thumbnailPath: 'https://picsum.photos/400/300?random=6', takenDate: '2024-01-06', fileSize: 2560000, width: 1920, height: 1080 },
]

const albums: any[] = [
  { id: '1', name: '按日期', type: 'system', photoCount: 6, coverPath: photos[0]?.thumbnailPath },
  { id: '2', name: '按相机', type: 'system', photoCount: 6, coverPath: photos[1]?.thumbnailPath },
  { id: '3', name: '按地点', type: 'system', photoCount: 6, coverPath: photos[2]?.thumbnailPath },
  { id: '4', name: '自定义相册', type: 'custom', photoCount: 0, coverPath: null },
]

let settings = {
  id: 'default',
  photoSourcePath: '',
  watchPath: '',
  organizePattern: '{year}/{month}/{day}',
  duplicateDetection: 'hash',
  thumbnailQuality: 'medium',
  remoteAccess: false,
  remotePort: 3000,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

const importTasks: any[] = []
const duplicates: any[] = []

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.get('/api/photos', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100
  const offset = parseInt(req.query.offset as string) || 0
  res.json(photos.slice(offset, offset + limit))
})

app.get('/api/photos/:id', (req, res) => {
  const photo = photos.find(p => p.id === req.params.id)
  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' })
  }
  res.json(photo)
})

app.delete('/api/photos/:id', (req, res) => {
  const index = photos.findIndex(p => p.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Photo not found' })
  }
  photos.splice(index, 1)
  res.status(204).send()
})

app.get('/api/albums', (req, res) => {
  res.json(albums)
})

app.get('/api/albums/:id', (req, res) => {
  const album = albums.find(a => a.id === req.params.id)
  if (!album) {
    return res.status(404).json({ error: 'Album not found' })
  }
  res.json(album)
})

app.post('/api/albums', (req, res) => {
  const { name, type = 'custom' } = req.body
  const newAlbum = {
    id: String(albums.length + 1),
    name,
    type,
    photoCount: 0,
    coverPath: null
  }
  albums.push(newAlbum)
  res.status(201).json(newAlbum)
})

app.put('/api/albums/:id', (req, res) => {
  const album = albums.find(a => a.id === req.params.id)
  if (!album) {
    return res.status(404).json({ error: 'Album not found' })
  }
  Object.assign(album, req.body)
  res.json(album)
})

app.delete('/api/albums/:id', (req, res) => {
  const index = albums.findIndex(a => a.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Album not found' })
  }
  albums.splice(index, 1)
  res.status(204).send()
})

app.post('/api/albums/:albumId/photos', (req, res) => {
  const { photoId } = req.body
  const album = albums.find(a => a.id === req.params.albumId)
  if (!album) {
    return res.status(404).json({ error: 'Album not found' })
  }
  res.status(201).json({ success: true })
})

app.delete('/api/albums/:albumId/photos/:photoId', (req, res) => {
  res.status(204).send()
})

app.get('/api/settings', (req, res) => {
  res.json(settings)
})

app.put('/api/settings', (req, res) => {
  settings = {
    ...settings,
    ...req.body,
    updatedAt: new Date().toISOString()
  }
  res.json(settings)
})

app.get('/api/settings/import/tasks', (req, res) => {
  const { status } = req.query
  if (status) {
    res.json(importTasks.filter(t => t.status === status))
  } else {
    res.json(importTasks)
  }
})

app.post('/api/settings/import/tasks', (req, res) => {
  const { sourcePath, targetPath } = req.body
  const task = {
    id: String(importTasks.length + 1),
    sourcePath,
    targetPath: targetPath || null,
    fileName: sourcePath.split(/[/\\]/).pop() || 'unknown',
    fileHash: null,
    status: 'pending',
    errorMessage: null,
    createdAt: new Date().toISOString(),
    completedAt: null
  }
  importTasks.push(task)
  res.status(201).json(task)
})

app.delete('/api/settings/import/tasks/:id', (req, res) => {
  const index = importTasks.findIndex(t => t.id === req.params.id)
  if (index !== -1) {
    importTasks.splice(index, 1)
  }
  res.status(204).send()
})

app.post('/api/settings/import/process', (req, res) => {
  const result = {
    imported: Math.floor(Math.random() * 5),
    duplicates: Math.floor(Math.random() * 2),
    failed: 0
  }
  res.json(result)
})

app.get('/api/settings/duplicates', (req, res) => {
  res.json(duplicates)
})

app.delete('/api/settings/duplicates/:id', (req, res) => {
  res.status(204).send()
})

app.post('/api/settings/duplicates/:taskId/handle', (req, res) => {
  const { action } = req.body
  res.status(204).send()
})

app.get('/api/scanner/scan-directory', (req, res) => {
  res.json({ files: [], total: 0 })
})

app.get('/api/scanner/scan-watch', (req, res) => {
  res.json({ files: [], total: 0 })
})

app.get('/api/scanner/scan-source', (req, res) => {
  res.json({ files: [], total: 0 })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务器运行在 http://localhost:${PORT}`)
})
