import { db } from '../db'
import { sourceDirectory, media, scanCheckpoint } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { scanDirectoryNonRecursive, calculateFileHash, isMediaFile } from '../utils/fileUtils'
import { queue } from '../instances/queue'
import { v4 as uuidv4 } from 'uuid'
import { eventBus } from '../instances/eventBus'
import fs from 'fs'
import path from 'path'

export async function startScan(sourceDirectoryId: string): Promise<void> {
  const result = await db.select().from(sourceDirectory).where(eq(sourceDirectory.id, sourceDirectoryId))
  const sourceDir = result[0]

  if (!sourceDir) {
    throw new Error('Source directory not found')
  }

  const now = new Date().toISOString()
  const checkpointResult = await db.select().from(scanCheckpoint).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
  const existingCheckpoint = checkpointResult[0]

  if (existingCheckpoint) {
    await db.update(scanCheckpoint).set({
      status: 'scanning',
      progress: 0,
      totalFiles: 0,
      scannedFiles: 0,
      errorCount: 0,
      startedAt: now,
      completedAt: null,
      updatedAt: now
    }).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
  } else {
    await db.insert(scanCheckpoint).values({
      id: uuidv4(),
      sourceDirectoryId,
      status: 'scanning',
      progress: 0,
      totalFiles: 0,
      scannedFiles: 0,
      errorCount: 0,
      startedAt: now,
      createdAt: now,
      updatedAt: now
    })
  }

  const updatedCheckpoint = await db.select().from(scanCheckpoint).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
  await eventBus.emit('scanProgressUpdated', { sourceDirectoryId, checkpoint: updatedCheckpoint[0] })

  try {
    const items = await scanDirectoryNonRecursive(sourceDir.path)
    
    const directoryItems = items.filter(item => item.type === 'directory')
    const fileItems = items.filter(item => item.type === 'file')

    await db.update(scanCheckpoint).set({
      totalFiles: fileItems.length,
      updatedAt: new Date().toISOString()
    }).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))

    let processedCount = 0

    for (const item of directoryItems) {
      await processSubDirectory(item.path, sourceDirectoryId)
    }

    for (const item of fileItems) {
      try {
        await processFile(item.path, sourceDirectoryId)
        processedCount++
        
        const progress = fileItems.length > 0 ? Math.round((processedCount / fileItems.length) * 100) : 100
        await db.update(scanCheckpoint).set({
          scannedFiles: processedCount,
          progress,
          updatedAt: new Date().toISOString()
        }).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))

        const checkpointAfterUpdate = await db.select().from(scanCheckpoint).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
        await eventBus.emit('scanProgressUpdated', { sourceDirectoryId, checkpoint: checkpointAfterUpdate[0] })
      } catch {
        const checkpointRes = await db.select({ errorCount: scanCheckpoint.errorCount }).from(scanCheckpoint)
          .where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
        const currentErrorCount = checkpointRes[0]?.errorCount || 0
        await db.update(scanCheckpoint).set({
          errorCount: currentErrorCount + 1,
          updatedAt: new Date().toISOString()
        }).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
      }
    }

    await db.update(sourceDirectory).set({
      lastScanned: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).where(eq(sourceDirectory.id, sourceDirectoryId))

    await db.update(scanCheckpoint).set({
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))

    const finalCheckpoint = await db.select().from(scanCheckpoint).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
    await eventBus.emit('scanProgressUpdated', { sourceDirectoryId, checkpoint: finalCheckpoint[0] })
  } catch (error) {
    await db.update(scanCheckpoint).set({
      status: 'failed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))

    const failedCheckpoint = await db.select().from(scanCheckpoint).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
    await eventBus.emit('scanProgressUpdated', { sourceDirectoryId, checkpoint: failedCheckpoint[0] })
    throw error
  }
}

async function processSubDirectory(dirPath: string, parentSourceDirectoryId: string): Promise<void> {
  const existing = await db.select().from(sourceDirectory).where(eq(sourceDirectory.path, dirPath))
  
  if (existing.length === 0) {
    const now = new Date().toISOString()
    const newDir = await db.insert(sourceDirectory).values({
      id: uuidv4(),
      path: dirPath,
      name: path.basename(dirPath),
      enabled: true,
      createdAt: now,
      updatedAt: now
    }).returning()
    
    await queue.enqueue('scan', { sourceDirectoryId: newDir[0].id })
  } else {
    if (existing[0].enabled) {
      await queue.enqueue('scan', { sourceDirectoryId: existing[0].id })
    }
  }
}

async function processFile(filePath: string, sourceDirectoryId: string): Promise<void> {
  const existingMediaResult = await db.select().from(media)
    .where(and(eq(media.filepath, filePath), eq(media.sourceDirectoryId, sourceDirectoryId)))
  const existingMedia = existingMediaResult[0]

  if (!existingMedia) {
    await queue.enqueue('source-file-add', { filePath, sourceDirId: sourceDirectoryId })
  } else {
    const currentHash = await calculateFileHash(filePath)
    if (existingMedia.hash !== currentHash) {
      await queue.enqueue('source-file-change', { filePath, sourceDirId: sourceDirectoryId })
    }
  }
}

export async function getScanStatus(sourceDirectoryId: string) {
  const result = await db.select().from(scanCheckpoint).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
  return result[0]
}