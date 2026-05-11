import { Request, Response } from 'express'
import { db } from '../db'
import { media, sourceDirectory } from '../db/schema'
import { eq, like, and } from 'drizzle-orm'

export async function getAllMedia(req: Request, res: Response) {
  try {
    const { page = 1, limit = 20, sourceDirectoryId, search } = req.query
    
    const conditions: any[] = []
    if (sourceDirectoryId) {
      conditions.push(eq(media.sourceDirectoryId, sourceDirectoryId as string))
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
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit))

    res.json({
      data: medias,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / Number(limit))
      }
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media' })
  }
}

export async function getMediaById(req: Request, res: Response) {
  try {
    const { id } = req.params
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

    const mediaItem = result[0]
    if (!mediaItem) {
      return res.status(404).json({ error: 'Media not found' })
    }
    res.json(mediaItem)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media' })
  }
}

export async function deleteMedia(req: Request, res: Response) {
  try {
    const { id } = req.params
    const result = await db.delete(media).where(eq(media.id, id)).returning()
    if (result.length === 0) {
      return res.status(404).json({ error: 'Media not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete media' })
  }
}