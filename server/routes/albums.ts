import { Router } from 'express'
import { 
  createAlbum, 
  getAllAlbums, 
  getAlbumById, 
  updateAlbum, 
  deleteAlbum 
} from '../services/AlbumService.js'
import { getPhotosByAlbum } from '../services/PhotoService.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const albums = await getAllAlbums()
    res.json(albums)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch albums' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const album = await getAlbumById(req.params.id)
    if (!album) {
      return res.status(404).json({ error: 'Album not found' })
    }
    res.json(album)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch album' })
  }
})

router.get('/:id/photos', async (req, res) => {
  try {
    const photos = await getPhotosByAlbum(req.params.id)
    res.json(photos)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch album photos' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, type = 'custom', rule } = req.body
    if (!name) {
      return res.status(400).json({ error: 'Album name is required' })
    }
    const album = await createAlbum(name, type as 'system' | 'custom', rule)
    res.json(album)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create album' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const updates = req.body
    const album = await updateAlbum(req.params.id, updates)
    if (!album) {
      return res.status(404).json({ error: 'Album not found' })
    }
    res.json(album)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update album' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await deleteAlbum(req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete album' })
  }
})

export default router
