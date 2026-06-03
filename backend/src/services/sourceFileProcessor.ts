import { db } from '../db'
import { media } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { calculateFileHash, getFileMetadata, getFileType } from '../utils/fileUtils'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { eventBus } from '../instances/eventBus'

export async function processSourceFileAdded(filePath: string, sourceDirId: string): Promise<void> {
  const stat = fs.statSync(filePath)
  const hash = await calculateFileHash(filePath)
  const metadata = await getFileMetadata(filePath)
  const fileType = getFileType(filePath)
  const { metadata: rawMetadata, ...mediaData } = metadata
  const now = new Date().toISOString()

  const removedMediaWithSameHash = await db.select().from(media)
    .where(and(
      eq(media.sourceDirectoryId, sourceDirId),
      eq(media.hash, hash),
      eq(media.status, 'removed')
    ))

  const filename = filePath.split('\\').pop() || filePath.split('/').pop() || ''

  const processedMediaData = {
    ...mediaData,
    dateTaken: mediaData.dateTaken ? mediaData.dateTaken.toISOString() : undefined
  }

  if (removedMediaWithSameHash.length > 0) {
    await db.update(media).set({
      filename,
      filepath: filePath,
      fileSize: stat.size,
      fileType,
      hash,
      ...processedMediaData,
      metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined,
      status: 'active',
      updatedAt: now
    }).where(eq(media.id, removedMediaWithSameHash[0].id))

    const updatedMedia = { ...removedMediaWithSameHash[0], filename, filepath: filePath, fileSize: stat.size, fileType, hash, ...processedMediaData, status: 'active', updatedAt: now }
    await eventBus.emit('mediaAdded', { sourceDirectoryId: sourceDirId, mediaItem: updatedMedia })
  } else {
    const existingMediaResult = await db.select().from(media)
      .where(and(eq(media.filepath, filePath), eq(media.sourceDirectoryId, sourceDirId)))
    const existingMedia = existingMediaResult[0]

    if (existingMedia) {
      await db.update(media).set({
        filename,
        fileSize: stat.size,
        fileType,
        hash,
        ...processedMediaData,
        metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined,
        status: 'active',
        updatedAt: now
      }).where(eq(media.id, existingMedia.id))

      const updatedMedia = { ...existingMedia, filename, fileSize: stat.size, fileType, hash, ...processedMediaData, status: 'active', updatedAt: now }
      await eventBus.emit('mediaAdded', { sourceDirectoryId: sourceDirId, mediaItem: updatedMedia })
    } else {
      const newMediaId = uuidv4()
      const newMediaItem = {
        id: newMediaId,
        sourceDirectoryId: sourceDirId,
        filename,
        filepath: filePath,
        fileSize: stat.size,
        fileType,
        hash,
        ...processedMediaData,
        createdAt: now,
        updatedAt: now
      }
      await db.insert(media).values(newMediaItem)

      await eventBus.emit('mediaAdded', { sourceDirectoryId: sourceDirId, mediaItem: newMediaItem })
    }
  }
}

export async function processSourceFileChanged(filePath: string, sourceDirId: string): Promise<void> {
  const stat = fs.statSync(filePath)
  const hash = await calculateFileHash(filePath)
  const metadata = await getFileMetadata(filePath)
  const { metadata: rawMetadata, ...mediaData } = metadata
  const now = new Date().toISOString()

  const processedMediaData = {
    ...mediaData,
    dateTaken: mediaData.dateTaken ? mediaData.dateTaken.toISOString() : undefined
  }

  const existingByPath = await db.select().from(media)
    .where(and(eq(media.sourceDirectoryId, sourceDirId), eq(media.filepath, filePath)))

  if (existingByPath.length === 0) {
    const existingByHash = await db.select().from(media)
      .where(and(eq(media.sourceDirectoryId, sourceDirId), eq(media.hash, hash)))

    if (existingByHash.length > 0) {
      const filename = filePath.split('\\').pop() || filePath.split('/').pop() || ''
      await db.update(media).set({
        filename,
        filepath: filePath,
        fileSize: stat.size,
        hash,
        ...processedMediaData,
        metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined,
        updatedAt: now
      }).where(eq(media.id, existingByHash[0].id))

      const updatedMedia = { ...existingByHash[0], filename, filepath: filePath, fileSize: stat.size, hash, ...processedMediaData, updatedAt: now }
      await eventBus.emit('mediaAdded', { sourceDirectoryId: sourceDirId, mediaItem: updatedMedia })
      return
    }
  }

  await db.update(media).set({
    fileSize: stat.size,
    hash,
    ...processedMediaData,
    metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined,
    updatedAt: now
  }).where(and(eq(media.sourceDirectoryId, sourceDirId), eq(media.filepath, filePath)))
}

export async function processSourceFileRemoved(filePath: string, sourceDirId: string): Promise<void> {
  await db.update(media).set({
    status: 'removed',
    updatedAt: new Date().toISOString()
  }).where(and(eq(media.sourceDirectoryId, sourceDirId), eq(media.filepath, filePath)))
}