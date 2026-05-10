import { Router } from 'express'
import { queueService } from '../services/queueService'

const router: Router = Router()

router.get('/tasks', async (req, res) => {
  const tasks = await queueService.getAllTasks()
  res.json(tasks)
})

router.get('/tasks/:id', async (req, res) => {
  const { id } = req.params
  const task = await queueService.getTask(id)
  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }
  res.json(task)
})

router.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params
  const deleted = await queueService.removeTask(id)
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' })
  }
  res.status(204).send()
})

export default router