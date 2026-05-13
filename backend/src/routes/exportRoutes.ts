import { Router } from 'express'
import { batchExport, getExportStatus } from '../controllers/exportController'
import { basicAuth } from '../middleware/authMiddleware'

const router: Router = Router()

router.post('/batch', basicAuth, batchExport)
router.get('/status', basicAuth, getExportStatus)

export default router