import { Router } from 'express'
import {
  getSharedAlbum,
  getSharedAlbumMedia,
  shareIndexHtml,
} from '../controllers/shareController'

const router: Router = Router()

// 公开分享页面入口 - 返回 HTML 重定向到前端
router.get('/album/:token', shareIndexHtml)

// 公开分享 API
router.get('/api/album/:token', getSharedAlbum)
router.get('/api/album/:token/media', getSharedAlbumMedia)

export default router