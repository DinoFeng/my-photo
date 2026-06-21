import { Router } from 'express'
import { getMediaList } from '../../controllers/mediaController'
import { basicAuth } from '../../middleware/authMiddleware'

const router: Router = Router()

router.get('/', basicAuth, getMediaList)

export default router