import { Router } from 'express'
import exportRoutes from './exportRoutes'
import healthRoutes from './healthRoutes'
import mediaRoutes from './mediaRoutes'
import queueRoutes from './queueRoutes'

const router: Router = Router()

router.use('/export', exportRoutes)
router.use(healthRoutes)
router.use('/media', mediaRoutes)
router.use('/queue', queueRoutes)

router.get('/test', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

export default router