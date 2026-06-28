import { Router } from 'express'
import exportRoutes from './exportRoutes'
import healthRoutes from './healthRoutes'
import internalRoutes from './internalRoutes'
import mediaRoutes from './mediaRoutes'
import queueRoutes from './queueRoutes'
import authRoutes from '../authRoutes'
import userRoutes from '../userRoutes'
import albumRoutes from '../albumRoutes'

const router: Router = Router()

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/albums', albumRoutes)
router.use('/export', exportRoutes)
router.use(healthRoutes)
router.use(internalRoutes)
router.use('/media', mediaRoutes)
router.use('/queue', queueRoutes)

export default router