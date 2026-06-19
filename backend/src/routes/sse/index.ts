import { Router } from 'express'
import sseRoutes from './sseRoutes'

const router: Router = Router()

router.use(sseRoutes)

export default router