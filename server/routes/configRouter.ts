import express from 'express'
import {
  getSettings,
  updateSettings,
  validateDirectorySettings
} from '../services/SettingService.js'
import {
  createImportTask,
  getImportTasks,
  processImportTasks,
  deleteImportTask
} from '../services/ImportService.js'
import {
  findAllDuplicates,
  deleteDuplicate,
  handleDuplicate
} from '../services/DuplicateService.js'

const router = express.Router()

router.get('/settings', async (req, res) => {
  try {
    const settings = await getSettings()
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
})

router.put('/settings', async (req, res) => {
  try {
    const { photoSourcePath, watchPath, ...updates } = req.body
    
    if (photoSourcePath || watchPath) {
      const errors = await validateDirectorySettings(photoSourcePath || '', watchPath || '')
      if (errors) {
        return res.status(400).json({ errors })
      }
    }
    
    const settings = await updateSettings({ photoSourcePath, watchPath, ...updates })
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
})

router.get('/import/tasks', async (req, res) => {
  try {
    const { status } = req.query
    const tasks = await getImportTasks(status as string)
    res.json(tasks)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
})

router.post('/import/tasks', async (req, res) => {
  try {
    const { sourcePath, targetPath } = req.body
    const task = await createImportTask(sourcePath, targetPath)
    res.status(201).json(task)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
})

router.delete('/import/tasks/:id', async (req, res) => {
  try {
    await deleteImportTask(req.params.id)
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
})

router.post('/import/process', async (req, res) => {
  try {
    const result = await processImportTasks()
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
})

router.get('/duplicates', async (req, res) => {
  try {
    const duplicates = await findAllDuplicates()
    res.json(duplicates)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
})

router.delete('/duplicates/:id', async (req, res) => {
  try {
    await deleteDuplicate(req.params.id)
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Bad request' })
  }
})

router.post('/duplicates/:taskId/handle', async (req, res) => {
  try {
    const { action } = req.body
    await handleDuplicate(req.params.taskId, action as 'skip' | 'rename' | 'overwrite')
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Bad request' })
  }
})

export default router
