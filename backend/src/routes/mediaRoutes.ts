import { Router } from 'express'
import {
  getAllMedia,
  getMediaById,
  deleteMediaHandler,
  getMediaUpdates
} from '../controllers/mediaController'
import { basicAuth } from '../middleware/authMiddleware'

const router: Router = Router()

router.get('/', basicAuth, getAllMedia)
router.get('/updates', basicAuth, getMediaUpdates)
router.get('/:id', basicAuth, getMediaById)
router.delete('/:id', basicAuth, deleteMediaHandler)

export default router