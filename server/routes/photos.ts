import { Router } from 'express'
import { 
  getAllPhotos, 
  getPhotoById, 
  deletePhoto, 
  addPhotoToAlbum, 
  removePhotoFromAlbum 
} from '../services/PhotoService.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100
    const offset = parseInt(req.query.offset as string) || 0
    const photos = await getAllPhotos(limit, offset)
    res.json(photos)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch photos' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const photo = await getPhotoById(req.params.id)
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' })
    }
    res.json(photo)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch photo' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await deletePhoto(req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete photo' })
  }
})

router.post('/:id/albums/:albumId', async (req, res) => {
  try {
    await addPhotoToAlbum(req.params.id, req.params.albumId)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to add photo to album' })
  }
})

router.delete('/:id/albums/:albumId', async (req, res) => {
  try {
    await removePhotoFromAlbum(req.params.id, req.params.albumId)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove photo from album' })
  }
})

export default router
