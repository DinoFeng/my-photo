import { Router } from 'express'
import exportRoutes from './exportRoutes'
import healthRoutes from './healthRoutes'
import queueRoutes from './queueRoutes'
import sseRoutes from './sseRoutes'

const router: Router = Router()

router.use('/export', exportRoutes)
router.use(healthRoutes)
router.use('/queue', queueRoutes)
router.use('/sse', sseRoutes)

export default router