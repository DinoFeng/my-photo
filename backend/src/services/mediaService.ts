import { db } from '../db'
import { media, sourceDirectory } from '../db/schema'
import { eq, like, and, SQL } from 'drizzle-orm'

export interface MediaQueryOptions {
  page?: number
  limit?: number
  sourceDirectoryId?: string
  search?: string
}

export interface MediaWithSourceDirectory {
  id: string
  mediaSourceDirectoryId: string
  filename: string
  filepath: string
  fileSize: number | null
  fileType: string | null
  hash: string | null
  width: number | null
  height: number | null
  duration: number | null
  make: string | null
  model: string | null
  dateTaken: string | null
  latitude: number | null
  longitude: number | null
  metadata: string | null
  thumbnailPath: string | null
  status: string | null
  createdAt: string
  updatedAt: string
  sourceDirectoryId: string | null
  sourceDirectoryName: string | null
  sourceDirectoryPath: string | null
}

export interface MediaListResult {
  data: MediaWithSourceDirectory[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export async function findAllMedia(options: MediaQueryOptions = {}): Promise<MediaListResult> {
  const { page = 1, limit = 20, sourceDirectoryId, search } = options
  
  const conditions: SQL[] = []
  if (sourceDirectoryId) {
    conditions.push(eq(media.sourceDirectoryId, sourceDirectoryId))
  }
  if (search) {
    conditions.push(like(media.filename, `%${search}%`))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const totalResult = await db.select().from(media).where(whereClause)
  const totalCount = totalResult.length

  const medias = await db.select({
    id: media.id,
    mediaSourceDirectoryId: media.sourceDirectoryId,
    filename: media.filename,
    filepath: media.filepath,
    fileSize: media.fileSize,
    fileType: media.fileType,
    hash: media.hash,
    width: media.width,
    height: media.height,
    duration: media.duration,
    make: media.make,
    model: media.model,
    dateTaken: media.dateTaken,
    latitude: media.latitude,
    longitude: media.longitude,
    metadata: media.metadata,
    thumbnailPath: media.thumbnailPath,
    status: media.status,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
    sourceDirectoryId: sourceDirectory.id,
    sourceDirectoryName: sourceDirectory.name,
    sourceDirectoryPath: sourceDirectory.path
  }).from(media)
    .leftJoin(sourceDirectory, eq(media.sourceDirectoryId, sourceDirectory.id))
    .where(whereClause)
    .limit(limit)
    .offset((page - 1) * limit)

  return {
    data: medias,
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit)
    }
  }
}

export async function findMediaById(id: string): Promise<MediaWithSourceDirectory | null> {
  const result = await db.select({
    id: media.id,
    mediaSourceDirectoryId: media.sourceDirectoryId,
    filename: media.filename,
    filepath: media.filepath,
    fileSize: media.fileSize,
    fileType: media.fileType,
    hash: media.hash,
    width: media.width,
    height: media.height,
    duration: media.duration,
    make: media.make,
    model: media.model,
    dateTaken: media.dateTaken,
    latitude: media.latitude,
    longitude: media.longitude,
    metadata: media.metadata,
    thumbnailPath: media.thumbnailPath,
    status: media.status,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
    sourceDirectoryId: sourceDirectory.id,
    sourceDirectoryName: sourceDirectory.name,
    sourceDirectoryPath: sourceDirectory.path
  }).from(media)
    .leftJoin(sourceDirectory, eq(media.sourceDirectoryId, sourceDirectory.id))
    .where(eq(media.id, id))

  return result[0] || null
}

export async function deleteMedia(id: string): Promise<boolean> {
  const result = await db.delete(media).where(eq(media.id, id)).returning()
  return result.length > 0
}

export async function getAllMediaForSSE(): Promise<typeof media.$inferSelect[]> {
  return await db.select().from(media)
}