import { Router } from 'express'
import { startScan } from '../services/scanService'
import { queue } from '../instances/queue'
import { basicAuth } from '../middleware/authMiddleware'

const router: Router = Router()

router.post('/all', basicAuth, async (req, res) => {
  try {
    const { db } = await import('../db')
    const { sourceDirectory } = await import('../db/schema')
    const dirs = await db.select().from(sourceDirectory)
    
    for (const dir of dirs) {
      await queue.enqueue('scan', { sourceDirectoryId: dir.id })
    }
    
    res.json({ message: `Scanning ${dirs.length} directories`, directories: dirs.map(d => d.name) })
  } catch (error) {
    res.status(500).json({ error: 'Failed to start scan' })
  }
})

router.post('/:sourceDirectoryId', basicAuth, async (req, res) => {
  try {
    const { sourceDirectoryId } = req.params
    await queue.enqueue('scan', { sourceDirectoryId })
    res.json({ message: 'Scan started', sourceDirectoryId })
  } catch (error) {
    res.status(500).json({ error: 'Failed to start scan' })
  }
})

export default router
