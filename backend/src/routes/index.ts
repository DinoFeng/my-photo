import { Router } from 'express'
import sourceDirRoutes from './sourceDirRoutes'
import mediaRoutes from './mediaRoutes'
import scanCheckpointRoutes from './scanCheckpointRoutes'
import settingRoutes from './settingRoutes'
import exportRoutes from './exportRoutes'
import queueRoutes from './queueRoutes'

const router: Router = Router()

router.use('/source-dirs', sourceDirRoutes)
router.use('/media', mediaRoutes)
router.use('/scan-checkpoints', scanCheckpointRoutes)
router.use('/settings', settingRoutes)
router.use('/export', exportRoutes)
router.use('/queue', queueRoutes)

export default router