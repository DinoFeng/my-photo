import { Router } from 'express'
import {
  getAllSettings,
  getSetting,
  createSetting,
  updateSetting,
  deleteSetting
} from '../controllers/settingController'
import { basicAuth } from '../middleware/auth'

const router: Router = Router()

router.get('/', basicAuth, getAllSettings)
router.get('/:key', basicAuth, getSetting)
router.post('/', basicAuth, createSetting)
router.put('/:key', basicAuth, updateSetting)
router.delete('/:key', basicAuth, deleteSetting)

export default router