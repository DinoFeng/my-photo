import { Router } from 'express'
import {
  getAllSourceDirectories,
  getSourceDirectory,
  createSourceDirectoryHandler,
  updateSourceDirectoryHandler,
  deleteSourceDirectoryHandler,
  triggerScanHandler,
  getScanProgress
} from '../controllers/sourceDirectoryController'
import { basicAuth } from '../middleware/authMiddleware'

const router: Router = Router()

router.get('/', basicAuth, getAllSourceDirectories)
router.get('/:id', basicAuth, getSourceDirectory)
router.post('/', basicAuth, createSourceDirectoryHandler)
router.put('/:id', basicAuth, updateSourceDirectoryHandler)
router.delete('/:id', basicAuth, deleteSourceDirectoryHandler)
router.post('/:id/scan', basicAuth, triggerScanHandler)
router.get('/:id/scan-progress', basicAuth, getScanProgress)

export default router