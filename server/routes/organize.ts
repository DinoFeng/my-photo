import { Router } from 'express'
import { organizePhotos, previewOrganize, getOrganizeStats } from '../services/OrganizeService.js'

const router = Router()

router.get('/preview', async (req, res) => {
  try {
    const previews = await previewOrganize()
    res.json({ previews })
  } catch (error) {
    console.error('Preview organize failed:', error)
    res.status(500).json({ error: 'Preview organize failed' })
  }
})

router.post('/execute', async (req, res) => {
  try {
    const { createBackup = true } = req.body
    const result = await organizePhotos({ dryRun: false, createBackup })
    res.json(result)
  } catch (error) {
    console.error('Organize execute failed:', error)
    res.status(500).json({ error: 'Organize execute failed' })
  }
})

router.get('/stats', async (req, res) => {
  try {
    const stats = await getOrganizeStats()
    res.json(stats)
  } catch (error) {
    console.error('Get organize stats failed:', error)
    res.status(500).json({ error: 'Get organize stats failed' })
  }
})

export default router
