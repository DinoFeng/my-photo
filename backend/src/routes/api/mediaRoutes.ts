import { Router } from 'express'
import { getMediaList, getMediaPreview, getMediaThumbnail, getMediaRaw } from '../../controllers/mediaController'
import { basicAuth, basicAuthOptional } from '../../middleware/authMiddleware'

const router: Router = Router()

router.get('/', basicAuth, getMediaList)
router.get('/:id/thumbnail', basicAuthOptional, getMediaThumbnail)
router.get('/:id/preview', basicAuthOptional, getMediaPreview)
router.get('/:id/raw', basicAuth, getMediaRaw)

export default router