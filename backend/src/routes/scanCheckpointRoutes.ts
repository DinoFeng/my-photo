import { Router } from 'express'
import {
  getScanCheckpoint,
  getAllScanCheckpoints,
  updateScanCheckpoint
} from '../controllers/scanCheckpointController'
import { basicAuth } from '../middleware/auth'

const router = Router()

router.get('/', basicAuth, getAllScanCheckpoints)
router.get('/:sourceDirectoryId', basicAuth, getScanCheckpoint)
router.put('/:sourceDirectoryId', basicAuth, updateScanCheckpoint)

export default router