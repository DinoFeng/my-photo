import { db } from '../db'
import { sourceDirectory, scanCheckpoint, media } from '../db/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { queue } from '../utils/queue'

export interface SourceDirectoryWithCheckpoint {
  id: string
  path: string
  name: string
  enabled: boolean | null
  lastScanned: string | null
  createdAt: string
  updatedAt: string
  scanCheckpointId: string | null
  scanCheckpointStatus: string | null
  scanCheckpointProgress: number | null
}

export async function findAllSourceDirectories(): Promise<SourceDirectoryWithCheckpoint[]> {
  return await db.select({
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
}

export async function findSourceDirectoryById(id: string): Promise<SourceDirectoryWithCheckpoint | null> {
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
  
  return result[0] || null
}

export async function createSourceDirectory(path: string, name?: string): Promise<typeof sourceDirectory.$inferSelect> {
  const now = new Date().toISOString()
  const result = await db.insert(sourceDirectory).values({
    id: uuidv4(),
    path,
    name: name || path.split('\\').pop() || path.split('/').pop() || '',
    enabled: true,
    createdAt: now,
    updatedAt: now
  }).returning()
  
  return result[0]
}

export async function updateSourceDirectory(id: string, data: { name?: string; enabled?: boolean }): Promise<typeof sourceDirectory.$inferSelect | null> {
  const result = await db.update(sourceDirectory).set({
    ...data,
    updatedAt: new Date().toISOString()
  }).where(eq(sourceDirectory.id, id)).returning()
  
  return result[0] || null
}

export async function deleteSourceDirectory(id: string): Promise<boolean> {
  const result = await db.delete(sourceDirectory).where(eq(sourceDirectory.id, id)).returning()
  return result.length > 0
}

export async function triggerScan(sourceDirectoryId: string): Promise<string> {
  return await queue.enqueue('scan', { sourceDirectoryId })
}

export async function getScanProgressData(sourceDirectoryId: string) {
  const [checkpointResult, mediaResult] = await Promise.all([
    db.select().from(scanCheckpoint)
      .where(eq(scanCheckpoint.sourceDirectoryId, sourceDirectoryId)),
    db.select().from(media)
      .where(eq(media.sourceDirectoryId, sourceDirectoryId))
  ])
  
  return {
    checkpoint: checkpointResult[0] || null,
    mediaList: mediaResult
  }
}