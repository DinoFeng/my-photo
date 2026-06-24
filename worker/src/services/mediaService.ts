import fs from 'fs'
import path from 'path'
import { performance } from 'perf_hooks'
import { v4 as uuidv4 } from 'uuid'
import { eq } from 'drizzle-orm'
import type { ScanPayload } from '@my-photo/shared'
import type { UpsertResult } from '@my-photo/shared'
import { isMediaFile, getFileType, calculateFileHash, getFileMetadata } from '../utils/fileUtils'
import { db, media, toMediaRelativePath } from '@my-photo/shared'
import { appLogger } from '@my-photo/shared'
import type { LoggerWithException } from '@my-photo/shared'
import { setStep, clearStep } from '../utils/stepTracker'

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
  fileBirthtime: string | null
  fileMtime: string | null
  effectiveTime: string
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
  let dateTaken: string | null = null
  if (metadata.dateTaken && !isNaN(metadata.dateTaken.getTime())) {
    dateTaken = metadata.dateTaken.toISOString()
  }

  let fileBirthtime: string | null = null
  if (stat.birthtime && !isNaN(stat.birthtime.getTime())) {
    fileBirthtime = stat.birthtime.toISOString()
  }

  let fileMtime: string | null = null
  if (stat.mtime && !isNaN(stat.mtime.getTime())) {
    fileMtime = stat.mtime.toISOString()
  }

  const effectiveTime = dateTaken ?? fileBirthtime ?? fileMtime ?? now

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
    dateTaken,
    fileBirthtime,
    fileMtime,
    effectiveTime,
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
    fileBirthtime: record.fileBirthtime,
    fileMtime: record.fileMtime,
    effectiveTime: record.effectiveTime,
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
  fileBirthtime: data.fileBirthtime,
  fileMtime: data.fileMtime,
  effectiveTime: data.effectiveTime,
  latitude: data.latitude,
  longitude: data.longitude,
  metadata: data.metadata,
  thumbnailPath: null,
  status: 'active',
  createdAt: now,
  updatedAt: now,
}
}

export async function processReadFile(
  payload: ScanPayload,
  publish: (result: UpsertResult) => Promise<void>,
  opts?: { logger?: LoggerWithException },
): Promise<void> {

  if (payload.type !== 'file') return

  const log = opts?.logger ?? appLogger

  if (!isMediaFile(payload.currentPath)) {
    log.warn('Not a media file, skipping', { currentPath: payload.currentPath })
    return
  }

  if (!payload.sourcePath) {
    log.warn('No source directory found', { currentPath: payload.currentPath })
    return
  }
  try {
    const relativeFilepath = toMediaRelativePath(payload.currentPath)

    setStep(payload.currentPath, 'db')
    const t_db0 = performance.now()
    const existing = await db
      .select({ id: media.id, hash: media.hash })
      .from(media)
      .where(eq(media.filepath, relativeFilepath))
      .limit(1)
    const t_db1 = performance.now()

    setStep(payload.currentPath, 'stat')
    const stat = await fs.promises.stat(payload.currentPath)
    const t_stat1 = performance.now()

    setStep(payload.currentPath, 'hash')
    const hash = await calculateFileHash(payload.currentPath)
    const t_hash1 = performance.now()

    if (existing[0]?.hash === hash) {
      log.debug('File unchanged, skipping', { currentPath: payload.currentPath })
      return
    }

    setStep(payload.currentPath, 'exif')
    const fileType = getFileType(payload.currentPath)
    const filename = path.basename(payload.currentPath)
    const now = new Date().toISOString()

    const metadata = await getFileMetadata(payload.currentPath)
    const t_exif1 = performance.now()

    setStep(payload.currentPath, 'upsert')
    const mediaData = buildMediaData(stat, hash, metadata, fileType, filename, now)
    const result = await upsertMedia(relativeFilepath, payload.sourcePath, mediaData, existing[0]?.id)
    const t_upsert1 = performance.now()

    log.info('Media file processed', {
      action: result.action,
      currentPath: payload.currentPath,
      fileSize: stat.size,
      db: `${(t_db1 - t_db0).toFixed(0)}ms`,
      stat: `${(t_stat1 - t_db1).toFixed(0)}ms`,
      hash: `${(t_hash1 - t_stat1).toFixed(0)}ms`,
      exif: `${(t_exif1 - t_hash1).toFixed(0)}ms`,
      upsert: `${(t_upsert1 - t_exif1).toFixed(0)}ms`,
      total: `${(t_upsert1 - t_db0).toFixed(0)}ms`,
    })

    await publish(result)
  } finally {
    clearStep(payload.currentPath)
  }
}