import { Router } from 'express'
import {
  getAllMedia,
  getMediaById,
  deleteMedia
} from '../controllers/mediaController'
import { basicAuth } from '../middleware/auth'

const router = Router()

router.get('/', basicAuth, getAllMedia)
router.get('/:id', basicAuth, getMediaById)
router.delete('/:id', basicAuth, deleteMedia)

export default router