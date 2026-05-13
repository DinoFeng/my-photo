import { Router } from 'express'
import {
  getScanCheckpoint,
  getAllScanCheckpoints,
  updateScanCheckpointHandler
} from '../controllers/scanCheckpointController'
import { basicAuth } from '../middleware/authMiddleware'

const router: Router = Router()

router.get('/', basicAuth, getAllScanCheckpoints)
router.get('/:sourceDirectoryId', basicAuth, getScanCheckpoint)
router.put('/:sourceDirectoryId', basicAuth, updateScanCheckpointHandler)

export default router