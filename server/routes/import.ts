import { Router } from 'express'
import { scanWatchDirectory, processImportTasks, handleDuplicates } from '../services/ImportService.js'

const router = Router()

router.get('/scan', async (req, res) => {
  try {
    const result = await scanWatchDirectory()
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to scan directory' })
  }
})

router.post('/process', async (req, res) => {
  try {
    await processImportTasks()
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to process imports' })
  }
})

router.post('/duplicates', async (req, res) => {
  try {
    const { duplicates } = req.body
    await handleDuplicates(duplicates)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to handle duplicates' })
  }
})

export default router
