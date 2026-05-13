import { Router } from 'express'
import { queue } from '../instances/queue'

const router: Router = Router()

router.get('/tasks', async (req, res) => {
  const tasks = await queue.getAllTasks()
  res.json(tasks)
})

router.get('/tasks/:id', async (req, res) => {
  const { id } = req.params
  const task = await queue.getTask(id)
  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }
  res.json(task)
})

router.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params
  const deleted = await queue.removeTask(id)
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' })
  }
  res.status(204).send()
})

export default router