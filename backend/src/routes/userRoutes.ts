import { Router } from 'express'
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController'
import { requireAdmin } from '../middleware/authMiddleware'

const router: Router = Router()

router.get('/', requireAdmin, getAllUsers)
router.post('/', requireAdmin, createUser)
router.put('/:id', requireAdmin, updateUser)
router.delete('/:id', requireAdmin, deleteUser)

export default router