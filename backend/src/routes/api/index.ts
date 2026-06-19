import { Router } from 'express'
import exportRoutes from './exportRoutes'
import healthRoutes from './healthRoutes'
import queueRoutes from './queueRoutes'

const router: Router = Router()

router.use('/export', exportRoutes)
router.use(healthRoutes)
router.use('/queue', queueRoutes)

export default router