import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { eq } from 'drizzle-orm'
import type { ScanPayload } from '../types/fanout'
import type { UpsertResult } from '../types/media'
import { isMediaFile, getFileType, calculateFileHash, getFileMetadata } from '../utils/fileUtils'
import { db } from '../db/index'
import { media } from '../db/schema'
import { eventBus } from '../instances/eventBus'

interface MediaData {
  filename: string
  fileSize: number
  fileType: string
  hash: string
  width: number | null
  height: number | null
  duration: number | null
  make: string | null
  model: string | null
  dateTaken: string | null
  latitude: number | null
  longitude: number | null
  metadata: string | null
  updatedAt: string
}

function buildMediaData(
  stat: fs.Stats,
  hash: string,
  metadata: Awaited<ReturnType<typeof getFileMetadata>>,
  fileType: string,
  filename: string,
  now: string,
): MediaData {
  return {
    filename,
    fileSize: stat.size,
    fileType,
    hash,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    duration: metadata.duration ?? null,
    make: metadata.make ?? null,
    model: metadata.model ?? null,
    dateTaken: metadata.dateTaken && !isNaN(metadata.dateTaken.getTime()) ? metadata.dateTaken.toISOString() : null,
    latitude: metadata.latitude ?? null,
    longitude: metadata.longitude ?? null,
    metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
    updatedAt: now,
  }
}

async function upsertMedia(
  filepath: string,
  sourcePath: string,
  data: MediaData,
  existingId: string | undefined,
): Promise<UpsertResult> {
  if (existingId) {
    await db.update(media)
      .set(data)
      .where(eq(media.id, existingId))

    const [record] = await db.select().from(media).where(eq(media.id, existingId)).limit(1)

    return {
      action: 'update',
      id: record.id,
      sourcePath: record.sourcePath,
      filename: record.filename,
      filepath: record.filepath,
      fileSize: record.fileSize,
      fileType: record.fileType,
      hash: record.hash,
      width: record.width,
      height: record.height,
      duration: record.duration,
      make: record.make,
      model: record.model,
      dateTaken: record.dateTaken,
      latitude: record.latitude,
      longitude: record.longitude,
      metadata: record.metadata,
      thumbnailPath: record.thumbnailPath,
      status: record.status ?? 'active',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }

  const id = uuidv4()
  const now = data.updatedAt

  await db.insert(media).values({
    id,
    sourcePath,
    filepath,
    status: 'active',
    createdAt: now,
    ...data,
  })

  return {
    action: 'insert',
    id,
    sourcePath,
    filename: data.filename,
    filepath,
    fileSize: data.fileSize,
    fileType: data.fileType,
    hash: data.hash,
    width: data.width,
    height: data.height,
    duration: data.duration,
    make: data.make,
    model: data.model,
    dateTaken: data.dateTaken,
    latitude: data.latitude,
    longitude: data.longitude,
    metadata: data.metadata,
    thumbnailPath: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
}

export async function processReadFile(payload: ScanPayload, publish: (result: UpsertResult) => Promise<void>): Promise<void> {
  if (payload.type !== 'file') return

  if (!isMediaFile(payload.currentPath)) {
    console.error(`[MediaService] Not a media file, skipping: ${payload.currentPath}`)
    return
  }

  if (!payload.sourcePath) {
    console.log(`[MediaService] No source directory found for: ${payload.currentPath}`)
    return
  }

  const [existing, stat] = await Promise.all([
    db
      .select({ id: media.id, hash: media.hash })
      .from(media)
      .where(eq(media.filepath, payload.currentPath))
      .limit(1),
    fs.promises.stat(payload.currentPath),
  ])

  const hash = await calculateFileHash(payload.currentPath)

  if (existing[0]?.hash === hash) {
    console.log(`[MediaService] File unchanged, skipping: ${payload.currentPath}`)
    return
  }

  const metadata = await getFileMetadata(payload.currentPath)
  const fileType = getFileType(payload.currentPath)
  const filename = path.basename(payload.currentPath)
  const now = new Date().toISOString()

  const mediaData = buildMediaData(stat, hash, metadata, fileType, filename, now)
  const result = await upsertMedia(payload.currentPath, payload.sourcePath, mediaData, existing[0]?.id)

  console.log(
    `[MediaService] Media file ${result.action === 'insert' ? 'imported' : 'updated'}: ${payload.currentPath}`,
  )

  await publish(result)

  if (result.action === 'insert') {
    eventBus.emit('mediaAdded', {
      sourceDirectoryId: payload.sourcePath,
      mediaItem: { id: result.id, filename, filepath: payload.currentPath, fileType },
    })
  }
}