import { db } from '../db'
import { scanCheckpoint } from '../db/schema'
import { eq } from 'drizzle-orm'

export interface ScanCheckpointUpdate {
  status?: string
  progress?: number
  totalFiles?: number
  scannedFiles?: number
  errorCount?: number
}

export async function findScanCheckpointBySourceDirectoryId(sourceDirectoryId: string) {
  const result = await db.select().from(scanCheckpoint)
    .where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId))
  return result[0] || null
}

export async function findAllScanCheckpoints() {
  return await db.select().from(scanCheckpoint)
}

export async function updateScanCheckpoint(sourceDirectoryId: string, data: ScanCheckpointUpdate) {
  const result = await db.update(scanCheckpoint).set({
    ...data,
    updatedAt: new Date().toISOString()
  }).where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId)).returning()
  
  return result[0] || null
}