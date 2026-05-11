import { Request, Response } from 'express'
import { db } from '../db'
import { sourceDirectory, scanCheckpoint } from '../db/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { queueService } from '../services/queueService'

export async function getAllSourceDirectories(req: Request, res: Response) {
  try {
    const directories = await db.select({
      id: sourceDirectory.id,
      path: sourceDirectory.path,
      name: sourceDirectory.name,
      enabled: sourceDirectory.enabled,
      lastScanned: sourceDirectory.lastScanned,
      createdAt: sourceDirectory.createdAt,
      updatedAt: sourceDirectory.updatedAt,
      scanCheckpointId: scanCheckpoint.id,
      scanCheckpointStatus: scanCheckpoint.status,
      scanCheckpointProgress: scanCheckpoint.progress
    }).from(sourceDirectory)
      .leftJoin(scanCheckpoint, eq(sourceDirectory.id, scanCheckpoint.sourceDirectoryId))
    res.json(directories)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch source directories' })
  }
}

export async function getSourceDirectory(req: Request, res: Response) {
  try {
    const { id } = req.params
    const result = await db.select({
      id: sourceDirectory.id,
      path: sourceDirectory.path,
      name: sourceDirectory.name,
      enabled: sourceDirectory.enabled,
      lastScanned: sourceDirectory.lastScanned,
      createdAt: sourceDirectory.createdAt,
      updatedAt: sourceDirectory.updatedAt,
      scanCheckpointId: scanCheckpoint.id,
      scanCheckpointStatus: scanCheckpoint.status,
      scanCheckpointProgress: scanCheckpoint.progress
    }).from(sourceDirectory)
      .leftJoin(scanCheckpoint, eq(sourceDirectory.id, scanCheckpoint.sourceDirectoryId))
      .where(eq(sourceDirectory.id, id))
    
    const directory = result[0]
    if (!directory) {
      return res.status(404).json({ error: 'Source directory not found' })
    }
    res.json(directory)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch source directory' })
  }
}

export async function createSourceDirectory(req: Request, res: Response) {
  try {
    const { path, name } = req.body
    const now = new Date().toISOString()
    const result = await db.insert(sourceDirectory).values({
      id: uuidv4(),
      path,
      name: name || path.split('\\').pop() || path.split('/').pop() || '',
      enabled: true,
      createdAt: now,
      updatedAt: now
    }).returning()
    res.status(201).json(result[0])
  } catch (error) {
    res.status(500).json({ error: 'Failed to create source directory' })
  }
}

export async function updateSourceDirectory(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { name, enabled } = req.body
    const result = await db.update(sourceDirectory).set({
      name,
      enabled,
      updatedAt: new Date().toISOString()
    }).where(eq(sourceDirectory.id, id)).returning()
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Source directory not found' })
    }
    res.json(result[0])
  } catch (error) {
    res.status(500).json({ error: 'Failed to update source directory' })
  }
}

export async function deleteSourceDirectory(req: Request, res: Response) {
  try {
    const { id } = req.params
    const result = await db.delete(sourceDirectory).where(eq(sourceDirectory.id, id)).returning()
    if (result.length === 0) {
      return res.status(404).json({ error: 'Source directory not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete source directory' })
  }
}

export async function triggerScan(req: Request, res: Response) {
  try {
    const { id } = req.params
    const taskId = await queueService.enqueue('scan', { sourceDirectoryId: id })
    res.json({ message: 'Scan started', taskId })
  } catch (error) {
    res.status(500).json({ error: 'Failed to start scan' })
  }
}