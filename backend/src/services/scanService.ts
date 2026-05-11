import { db } from '../db'
import { sourceDirectory, media, scanCheckpoint } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { scanDirectory, calculateFileHash, getFileMetadata, getFileType } from '../utils/fileUtils'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

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

  try {
    const files = await scanDirectory(sourceDir.path)
    
    await db.update(scanCheckpoint).set({ 
      totalFiles: files.length,
      updatedAt: new Date().toISOString()
    }).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))

    let scannedCount = 0
    for (const filePath of files) {
      try {
        const stat = fs.statSync(filePath)
        const hash = await calculateFileHash(filePath)
        const metadata = await getFileMetadata(filePath)
        const fileType = getFileType(filePath)

        const { metadata: rawMetadata, ...mediaData } = metadata

        const existingMediaResult = await db.select().from(media)
          .where(and(eq(media.filepath, filePath), eq(media.sourceDirectoryId, sourceDirectoryId)))
        const existingMedia = existingMediaResult[0]

        const currentNow = new Date().toISOString()
        const filename = filePath.split('\\').pop() || filePath.split('/').pop() || ''

        const processedMediaData = {
          ...mediaData,
          dateTaken: mediaData.dateTaken ? mediaData.dateTaken.toISOString() : undefined
        }

        if (existingMedia) {
          await db.update(media).set({
            filename,
            fileSize: stat.size,
            fileType,
            hash,
            ...processedMediaData,
            metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined,
            updatedAt: currentNow
          }).where(eq(media.id, existingMedia.id))
        } else {
          await db.insert(media).values({
            id: uuidv4(),
            sourceDirectoryId,
            filename,
            filepath: filePath,
            fileSize: stat.size,
            fileType,
            hash,
            ...processedMediaData,
            createdAt: currentNow,
            updatedAt: currentNow
          })
        }
      } catch {
        const checkpointRes = await db.select({ errorCount: scanCheckpoint.errorCount }).from(scanCheckpoint)
          .where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
        const currentErrorCount = checkpointRes[0]?.errorCount || 0
        await db.update(scanCheckpoint).set({ 
          errorCount: currentErrorCount + 1,
          updatedAt: new Date().toISOString()
        }).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
      }

      scannedCount++
      const progress = Math.round((scannedCount / files.length) * 100)
      await db.update(scanCheckpoint).set({ 
        scannedFiles: scannedCount, 
        progress,
        updatedAt: new Date().toISOString()
      }).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
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
  } catch (error) {
    await db.update(scanCheckpoint).set({
      status: 'failed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
    throw error
  }
}

export async function getScanStatus(sourceDirectoryId: string) {
  const result = await db.select().from(scanCheckpoint).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
  return result[0]
}