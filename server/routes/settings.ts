import { Router } from 'express'
import { getSettings, updateSettings, validateDirectorySettings } from '../services/SettingService.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const settings = await getSettings()
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

router.put('/', async (req, res) => {
  try {
    const updates = req.body
    
    if (updates.photoSourcePath || updates.watchPath) {
      const errors = await validateDirectorySettings(
        updates.photoSourcePath || '',
        updates.watchPath || ''
      )
      if (errors) {
        return res.status(400).json({ errors })
      }
    }
    
    const settings = await updateSettings(updates)
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

export default router
