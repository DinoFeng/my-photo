import { Router } from 'express'
import { batchExport, getExportStatus } from '../../controllers/exportController'
import { basicAuthOptional, requireAdmin } from '../../middleware/authMiddleware'

const router: Router = Router()

// parseUserSession（全局）从 cookie 解析 user → basicAuthOptional 兜底 Basic Auth → requireAdmin 校验权限
// 支持前端管理员（cookie）和外部脚本（Basic Auth）两种调用方式
router.post('/batch', basicAuthOptional, requireAdmin, batchExport)
router.get('/status', basicAuthOptional, requireAdmin, getExportStatus)

export default router