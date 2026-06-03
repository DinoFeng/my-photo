import { Router } from 'express'
import mediaRoutes from './mediaRoutes'
import scanCheckpointRoutes from './scanCheckpointRoutes'
import scanRoutes from './scanRoutes'
import settingRoutes from './settingRoutes'
import exportRoutes from './exportRoutes'
import queueRoutes from './queueRoutes'
import monitorRoutes from './monitorRoutes'
import sseRoutes from './sseRoutes'

const router: Router = Router()

router.use('/media', mediaRoutes)
router.use('/scan-checkpoints', scanCheckpointRoutes)
router.use('/scan', scanRoutes)
router.use('/settings', settingRoutes)
router.use('/export', exportRoutes)
router.use('/queue', queueRoutes)
router.use('/monitor', monitorRoutes)
router.use('/sse', sseRoutes)

export default router