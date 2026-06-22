import { Request, Response } from 'express'
import { like, and, eq, sql } from 'drizzle-orm'
import { db, media } from '@my-photo/shared'
import { appLogger } from '@my-photo/shared'

const log = appLogger

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