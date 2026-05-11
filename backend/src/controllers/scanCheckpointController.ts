import { Request, Response } from 'express'
import { db } from '../db'
import { scanCheckpoint } from '../db/schema'
import { eq } from 'drizzle-orm'

export async function getScanCheckpoint(req: Request, res: Response) {
  try {
    const { sourceDirectoryId } = req.params
    const result = await db.select().from(scanCheckpoint).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
    const checkpoint = result[0]
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
    const checkpoints = await db.select().from(scanCheckpoint)
    res.json(checkpoints)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scan checkpoints' })
  }
}

export async function updateScanCheckpoint(req: Request, res: Response) {
  try {
    const { sourceDirectoryId } = req.params
    const { status, progress, totalFiles, scannedFiles, errorCount } = req.body
    const result = await db.update(scanCheckpoint).set({
      status,
      progress,
      totalFiles,
      scannedFiles,
      errorCount,
      updatedAt: new Date().toISOString()
    }).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId)).returning()
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Scan checkpoint not found' })
    }
    res.json(result[0])
  } catch (error) {
    res.status(500).json({ error: 'Failed to update scan checkpoint' })
  }
}