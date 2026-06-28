import { Router } from 'express'
import {
  getAuthStatus,
  getCurrentUser,
  loginWithPassword,
  loginWithInviteCode,
  changePassword,
  logout,
} from '../controllers/authController'
import { requireAuth } from '../middleware/authMiddleware'

const router: Router = Router()

router.get('/status', getAuthStatus)
router.get('/me', getCurrentUser)
router.post('/login', loginWithPassword)
router.post('/login-with-code', loginWithInviteCode)
router.post('/change-password', requireAuth, changePassword)
router.post('/logout', requireAuth, logout)

export default router