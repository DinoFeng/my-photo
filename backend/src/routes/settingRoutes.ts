import { Router } from 'express'
import {
  getAllSettings,
  getSetting,
  createSettingHandler,
  updateSettingHandler,
  deleteSettingHandler
} from '../controllers/settingController'
import { basicAuth } from '../middleware/authMiddleware'

const router: Router = Router()

router.get('/', basicAuth, getAllSettings)
router.get('/:key', basicAuth, getSetting)
router.post('/', basicAuth, createSettingHandler)
router.put('/:key', basicAuth, updateSettingHandler)
router.delete('/:key', basicAuth, deleteSettingHandler)

export default router