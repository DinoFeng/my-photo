import { Request, Response } from 'express'
import fs from 'fs'
import { like, and, eq, sql } from 'drizzle-orm'
import { db, media, config, appLogger } from '@my-photo/shared'
import type { LoggerWithException } from '@my-photo/shared'
import {
  ensureDir,
  getThumbnailPath,
  resolveMediaFilePath,
  getMediaTypeFromExtension,
  isVideoFile,
} from '../utils/thumbnailUtils'

const log = appLogger as LoggerWithException

const THUMBNAIL_DIR = config.THUMBNAIL_PATH

let sharpModule: any = null
let sharpModuleLoaded = false
let sharpModuleLoadError: string | null = null

async function getSharp(): Promise<any> {
  if (sharpModuleLoaded) return sharpModule
  try {
    sharpModule = await import('sharp')
  } catch (e) {
    sharpModuleLoadError = (e as Error).message
    log.warn('sharp 未安装或加载失败，将使用原图服务', { error: sharpModuleLoadError })
  } finally {
    sharpModuleLoaded = true
  }
  return sharpModule
}

export async function getMediaList(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30))
    const offset = (page - 1) * limit
    const search = (req.query.search as string) || ''
    const fileType = (req.query.fileType as string) || ''
    const sourcePath = (req.query.sourcePath as string) || ''

    const conditions = [eq(media.status, 'active')]

    if (search) {
      conditions.push(like(media.filename, `%${search}%`))
    }

    if (fileType) {
      conditions.push(eq(media.fileType, fileType))
    }

    if (sourcePath) {
      conditions.push(eq(media.sourcePath, sourcePath))
    }

    const whereClause = and(...conditions)

    const [totalResult, items] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(media).where(whereClause),
      db
        .select()
        .from(media)
        .where(whereClause)
        .orderBy(sql`${media.dateTaken} IS NULL, ${media.dateTaken} DESC, ${media.createdAt} DESC`)
        .limit(limit)
        .offset(offset),
    ])

    const total = totalResult[0]?.count ?? 0

    res.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    log.exception('Failed to get media list', error instanceof Error ? error : undefined)
    res.status(500).json({ error: 'Failed to get media list' })
  }
}

function getMediaById(id: string) {
  return db.select().from(media).where(eq(media.id, id)).limit(1)
}

function sendFileSafe(res: Response, filePath: string, filename?: string) {
  res.sendFile(
    filePath,
    {
      headers: {
        'Content-Disposition': filename ? `inline; filename="${encodeURIComponent(filename)}"` : 'inline',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    (err) => {
      if (err) {
        log.warn('sendFile failed', { filePath, error: (err as Error).message })
        if (!res.headersSent) {
          res.status(404).json({ error: 'File not found' })
        }
      }
    },
  )
}

export async function getMediaPreview(req: Request, res: Response) {
  try {
    const { id } = req.params
    const [item] = await getMediaById(id)
    if (!item) {
      return res.status(404).json({ error: 'Media not found' })
    }

    if (item.status !== 'active') {
      return res.status(404).json({ error: 'Media not available' })
    }

    const absolutePath = resolveMediaFilePath(item.filepath as string)
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Original file missing' })
    }

    sendFileSafe(res, absolutePath, item.filename as string)
  } catch (error) {
    log.exception('Failed to get media preview', error instanceof Error ? error : undefined)
    res.status(500).json({ error: 'Failed to get preview' })
  }
}

export async function getMediaThumbnail(req: Request, res: Response) {
  try {
    const { id } = req.params
    const size = Math.min(2048, Math.max(64, parseInt(req.query.size as string) || 300))

    const [item] = await getMediaById(id)
    if (!item) {
      return res.status(404).json({ error: 'Media not found' })
    }

    if (item.status !== 'active') {
      return res.status(404).json({ error: 'Media not available' })
    }

    ensureDir(THUMBNAIL_DIR)

    const thumbnailPath = getThumbnailPath(id, size)

    if (fs.existsSync(thumbnailPath)) {
      return sendFileSafe(res, thumbnailPath)
    }

    const absolutePath = resolveMediaFilePath(item.filepath as string)
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Original file missing' })
    }

    const mediaType = (item.fileType as string) || getMediaTypeFromExtension(absolutePath)

    if (mediaType === 'video' || isVideoFile(absolutePath)) {
      const sharp = await getSharp()
      if (sharp && sharp.default) {
        try {
          await sharp.default(absolutePath)
            .resize(size, size, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .toFormat('jpeg', { quality: 80 })
            .toFile(thumbnailPath)
          return sendFileSafe(res, thumbnailPath)
        } catch (shErr) {
          log.debug('Video thumbnail failed, trying raw fallback', { id, error: (shErr as Error).message })
        }
      }
      res.setHeader('Cache-Control', 'public, max-age=3600')
      return sendFileSafe(res, absolutePath, item.filename as string)
    }

    const sharp = await getSharp()
    if (sharp && sharp.default) {
      try {
        await sharp.default(absolutePath)
          .rotate()
          .resize(size, size, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toFormat('jpeg', { quality: 80 })
          .toFile(thumbnailPath)
        return sendFileSafe(res, thumbnailPath)
      } catch (shErr) {
        log.warn('Sharp thumbnail generation failed, serving original', { id, error: (shErr as Error).message })
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=3600')
    sendFileSafe(res, absolutePath, item.filename as string)
  } catch (error) {
    log.exception('Failed to get media thumbnail', error instanceof Error ? error : undefined)
    res.status(500).json({ error: 'Failed to generate thumbnail' })
  }
}

export async function getMediaRaw(req: Request, res: Response) {
  try {
    const { id } = req.params
    const [item] = await getMediaById(id)
    if (!item) {
      return res.status(404).json({ error: 'Media not found' })
    }

    const absolutePath = resolveMediaFilePath(item.filepath as string)
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Original file missing' })
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.download(absolutePath, item.filename as string, (err) => {
      if (err) {
        log.warn('Download failed', { id, error: (err as Error).message })
        res.status(404).json({ error: 'File not found' })
      }
    })
  } catch (error) {
    log.exception('Failed to download media', error instanceof Error ? error : undefined)
    res.status(500).json({ error: 'Failed to download' })
  }
}