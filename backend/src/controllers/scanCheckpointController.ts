import { Request, Response } from 'express'
import {
  findScanCheckpointBySourceDirectoryId,
  findAllScanCheckpoints,
  updateScanCheckpoint
} from '../services/scanCheckpointService'

export async function getScanCheckpoint(req: Request, res: Response) {
  try {
    const { sourceDirectoryId } = req.params
    const checkpoint = await findScanCheckpointBySourceDirectoryId(sourceDirectoryId)
    
    if (!checkpoint) {
      return res.status(404).json({ error: 'Scan checkpoint not found' })
    }
    res.json(checkpoint)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scan checkpoint' })
  }
}

export async function getAllScanCheckpoints(req: Request, res: Response) {
  try {
    const checkpoints = await findAllScanCheckpoints()
    res.json(checkpoints)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scan checkpoints' })
  }
}

export async function updateScanCheckpointHandler(req: Request, res: Response) {
  try {
    const { sourceDirectoryId } = req.params
    const { status, progress, totalFiles, scannedFiles, errorCount } = req.body
    
    const updated = await updateScanCheckpoint(sourceDirectoryId, {
      status,
      progress,
      totalFiles,
      scannedFiles,
      errorCount
    })
    
    if (!updated) {
      return res.status(404).json({ error: 'Scan checkpoint not found' })
    }
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update scan checkpoint' })
  }
}