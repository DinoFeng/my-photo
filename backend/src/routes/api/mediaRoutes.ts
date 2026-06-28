import { Router } from 'express'
import { getMediaList, getMediaGroups, getMediaPreview, getMediaThumbnail, getMediaRaw } from '../../controllers/mediaController'
import { basicAuthOptional, requireAuth } from '../../middleware/authMiddleware'

const router: Router = Router()

// parseUserSession 在 server.ts 里是全局中间件，先从 cookie 解析 user
// basicAuthOptional 作为兜底，支持用 HTTP Basic Auth 登录（导出脚本等外部调用）
// requireAuth 最终校验：必须有 user（cookie 或 Basic 任一方式）
router.get('/', basicAuthOptional, requireAuth, getMediaList)
router.get('/groups', basicAuthOptional, requireAuth, getMediaGroups)
router.get('/:id/thumbnail', basicAuthOptional, requireAuth, getMediaThumbnail)
router.get('/:id/preview', basicAuthOptional, requireAuth, getMediaPreview)
router.get('/:id/raw', basicAuthOptional, requireAuth, getMediaRaw)

export default router