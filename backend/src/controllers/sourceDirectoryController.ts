import { Request, Response } from 'express'
import {
  findAllSourceDirectories,
  findSourceDirectoryById,
  createSourceDirectory,
  updateSourceDirectory,
  deleteSourceDirectory,
  triggerScan,
  getScanProgressData
} from '../services/sourceDirectoryService'
import { scanProgressService } from '../instances/sse'

export async function getAllSourceDirectories(req: Request, res: Response) {
  try {
    const directories = await findAllSourceDirectories()
    res.json(directories)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch source directories' })
  }
}

export async function getSourceDirectory(req: Request, res: Response) {
  try {
    const { id } = req.params
    const directory = await findSourceDirectoryById(id)
    
    if (!directory) {
      return res.status(404).json({ error: 'Source directory not found' })
    }
    res.json(directory)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch source directory' })
  }
}

export async function createSourceDirectoryHandler(req: Request, res: Response) {
  try {
    const { path, name } = req.body
    const directory = await createSourceDirectory(path, name)
    res.status(201).json(directory)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create source directory' })
  }
}

export async function updateSourceDirectoryHandler(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { name, enabled } = req.body
    const directory = await updateSourceDirectory(id, { name, enabled })
    
    if (!directory) {
      return res.status(404).json({ error: 'Source directory not found' })
    }
    res.json(directory)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update source directory' })
  }
}

export async function deleteSourceDirectoryHandler(req: Request, res: Response) {
  try {
    const { id } = req.params
    const deleted = await deleteSourceDirectory(id)
    
    if (!deleted) {
      return res.status(404).json({ error: 'Source directory not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete source directory' })
  }
}

export async function triggerScanHandler(req: Request, res: Response) {
  try {
    const { id } = req.params
    const taskId = await triggerScan(id)
    res.json({ message: 'Scan started', taskId })
  } catch (error) {
    res.status(500).json({ error: 'Failed to start scan' })
  }
}

export async function getScanProgress(req: Request, res: Response) {
  const { id: sourceDirectoryId } = req.params

  const { clientId } = scanProgressService.setupConnection(res, { sourceDirectoryId })

  const sendInitialData = async () => {
    try {
      const { checkpoint, mediaList } = await getScanProgressData(sourceDirectoryId)
      
      if (checkpoint) {
        scanProgressService.sendEvent(clientId, { event: 'progress', data: checkpoint })
      }
      
      if (mediaList.length > 0) {
        scanProgressService.sendEvent(clientId, { event: 'media-list', data: mediaList })
      }
    } catch (error) {
      console.error('Error sending initial data:', error)
    }
  }

  sendInitialData()

  req.on('close', () => {
    scanProgressService.removeClient(clientId)
  })
}