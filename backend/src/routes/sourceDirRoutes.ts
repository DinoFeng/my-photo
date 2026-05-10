import { Router } from 'express'
import {
  getAllSourceDirectories,
  getSourceDirectory,
  createSourceDirectory,
  updateSourceDirectory,
  deleteSourceDirectory,
  triggerScan
} from '../controllers/sourceDirectoryController'
import { basicAuth } from '../middleware/auth'

const router = Router()

router.get('/', basicAuth, getAllSourceDirectories)
router.get('/:id', basicAuth, getSourceDirectory)
router.post('/', basicAuth, createSourceDirectory)
router.put('/:id', basicAuth, updateSourceDirectory)
router.delete('/:id', basicAuth, deleteSourceDirectory)
router.post('/:id/scan', basicAuth, triggerScan)

export default router