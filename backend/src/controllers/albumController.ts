import { Request, Response } from 'express'
import { eq, and, or, sql, count, desc, asc } from 'drizzle-orm'
import { db, album, albumMedia, user, media, albumShare } from '@my-photo/shared'
import { generateRandomId } from '../utils/securityUtils'

function canViewAlbum(dbAlbum: typeof album.$inferSelect, currentUserId: string | undefined): boolean {
  if (!currentUserId) return false
  if (dbAlbum.ownerId === currentUserId) return true
  if (dbAlbum.visibility === 'all_users') return true
  return false
}

export async function getAlbumList(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: '请先登录' })

  try {
    const { owner } = req.query
    const userId = req.user.id

    let whereCondition
    if (owner === 'me') {
      whereCondition = eq(album.ownerId, userId)
    } else if (owner === 'others') {
      whereCondition = and(eq(album.visibility, 'all_users'), sql`${album.ownerId} != ${userId}`)
    } else {
      whereCondition = or(eq(album.ownerId, userId), eq(album.visibility, 'all_users'))
    }

    const result = await db
      .select({
        album: album,
        ownerName: user.displayName,
        mediaCount: count(albumMedia.mediaId),
      })
      .from(album)
      .innerJoin(user, eq(album.ownerId, user.id))
      .leftJoin(albumMedia, eq(album.id, albumMedia.albumId))
      .where(whereCondition)
      .groupBy(album.id)
      .orderBy(desc(album.updatedAt))

    res.json({
      albums: result.map((r) => ({
        id: r.album.id,
        ownerId: r.album.ownerId,
        ownerName: r.ownerName,
        name: r.album.name,
        description: r.album.description,
        coverMediaId: r.album.coverMediaId,
        visibility: r.album.visibility,
        mediaCount: Number(r.mediaCount),
        createdAt: r.album.createdAt,
        updatedAt: r.album.updatedAt,
      })),
    })
  } catch (err) {
    console.error('获取相册列表失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function getAlbumDetail(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: '请先登录' })

  try {
    const { id } = req.params

    const result = await db
      .select({
        album: album,
        ownerName: user.displayName,
        mediaCount: count(albumMedia.mediaId),
      })
      .from(album)
      .innerJoin(user, eq(album.ownerId, user.id))
      .leftJoin(albumMedia, eq(album.id, albumMedia.albumId))
      .where(eq(album.id, id))
      .groupBy(album.id)
      .limit(1)

    if (result.length === 0) {
      return res.status(404).json({ error: '相册不存在' })
    }

    const dbAlbum = result[0].album
    if (!canViewAlbum(dbAlbum, req.user.id)) {
      return res.status(403).json({ error: '无权访问此相册' })
    }

    res.json({
      album: {
        id: dbAlbum.id,
        ownerId: dbAlbum.ownerId,
        ownerName: result[0].ownerName,
        name: dbAlbum.name,
        description: dbAlbum.description,
        coverMediaId: dbAlbum.coverMediaId,
        visibility: dbAlbum.visibility,
        mediaCount: Number(result[0].mediaCount),
        createdAt: dbAlbum.createdAt,
        updatedAt: dbAlbum.updatedAt,
      },
    })
  } catch (err) {
    console.error('获取相册详情失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function createAlbum(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: '请先登录' })

  try {
    const { name, description, visibility } = req.body

    if (!name) {
      return res.status(400).json({ error: '请填写相册名称' })
    }

    const now = new Date().toISOString()
    const albumId = generateRandomId()

    await db.insert(album).values({
      id: albumId,
      ownerId: req.user.id,
      name,
      description: description || null,
      coverMediaId: null,
      visibility: visibility === 'all_users' ? 'all_users' : 'private',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })

    res.status(201).json({
      album: {
        id: albumId,
        ownerId: req.user.id,
        ownerName: req.user.displayName,
        name,
        description: description || null,
        coverMediaId: null,
        visibility: visibility === 'all_users' ? 'all_users' : 'private',
        mediaCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    })
  } catch (err) {
    console.error('创建相册失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function updateAlbum(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: '请先登录' })

  try {
    const { id } = req.params
    const { name, description, visibility, coverMediaId } = req.body

    const existing = await db.select().from(album).where(eq(album.id, id)).limit(1)
    if (existing.length === 0) {
      return res.status(404).json({ error: '相册不存在' })
    }

    if (existing[0].ownerId !== req.user.id) {
      return res.status(403).json({ error: '无权修改此相册' })
    }

    const updateData: Partial<typeof album.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (visibility !== undefined) updateData.visibility = visibility === 'all_users' ? 'all_users' : 'private'
    if (coverMediaId !== undefined) updateData.coverMediaId = coverMediaId

    await db.update(album).set(updateData).where(eq(album.id, id))

    const mediaCountResult = await db
      .select({ count: count() })
      .from(albumMedia)
      .where(eq(albumMedia.albumId, id))

    const ownerName = req.user.displayName
    const updated = (await db.select().from(album).where(eq(album.id, id)).limit(1))[0]

    res.json({
      album: {
        id: updated.id,
        ownerId: updated.ownerId,
        ownerName,
        name: updated.name,
        description: updated.description,
        coverMediaId: updated.coverMediaId,
        visibility: updated.visibility,
        mediaCount: Number(mediaCountResult[0]?.count ?? 0),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    })
  } catch (err) {
    console.error('更新相册失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function deleteAlbum(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: '请先登录' })

  try {
    const { id } = req.params

    const existing = await db.select().from(album).where(eq(album.id, id)).limit(1)
    if (existing.length === 0) {
      return res.status(404).json({ error: '相册不存在' })
    }

    if (existing[0].ownerId !== req.user.id) {
      return res.status(403).json({ error: '无权删除此相册' })
    }

    await db.delete(albumMedia).where(eq(albumMedia.albumId, id))
    await db.delete(albumShare).where(eq(albumShare.albumId, id))
    await db.delete(album).where(eq(album.id, id))

    res.json({ ok: true })
  } catch (err) {
    console.error('删除相册失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function getAlbumMedia(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: '请先登录' })

  try {
    const { id } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100)
    const offset = (page - 1) * limit

    const albumInfo = await db.select().from(album).where(eq(album.id, id)).limit(1)
    if (albumInfo.length === 0) {
      return res.status(404).json({ error: '相册不存在' })
    }

    if (!canViewAlbum(albumInfo[0], req.user.id)) {
      return res.status(403).json({ error: '无权访问此相册' })
    }

    const data = await db
      .select({
        mediaId: media.id,
        filename: media.filename,
        filepath: media.filepath,
        fileType: media.fileType,
        thumbnailPath: media.thumbnailPath,
        dateTaken: media.dateTaken,
        effectiveTime: media.effectiveTime,
        addedAt: albumMedia.addedAt,
      })
      .from(albumMedia)
      .innerJoin(media, eq(albumMedia.mediaId, media.id))
      .where(eq(albumMedia.albumId, id))
      .orderBy(desc(albumMedia.addedAt))
      .limit(limit)
      .offset(offset)

    const totalResult = await db
      .select({ count: count() })
      .from(albumMedia)
      .where(eq(albumMedia.albumId, id))
    const total = Number(totalResult[0]?.count ?? 0)

    res.json({
      data: data.map((item) => ({
        id: item.mediaId,
        filename: item.filename,
        fileType: item.fileType,
        thumbnailPath: item.thumbnailPath,
        filepath: item.filepath,
        dateTaken: item.dateTaken,
        effectiveTime: item.effectiveTime,
        addedAt: item.addedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error('获取相册照片失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function addMediaToAlbum(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: '请先登录' })

  try {
    const { id } = req.params
    const { mediaIds } = req.body

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res.status(400).json({ error: '请选择照片' })
    }

    const albumInfo = await db.select().from(album).where(eq(album.id, id)).limit(1)
    if (albumInfo.length === 0) {
      return res.status(404).json({ error: '相册不存在' })
    }
    if (albumInfo[0].ownerId !== req.user.id) {
      return res.status(403).json({ error: '无权修改此相册' })
    }

    const now = new Date().toISOString()
    let added = 0
    let skipped = 0

    const promises = mediaIds.map(async (mediaId: string) => {
      try {
        const existing = await db
          .select()
          .from(albumMedia)
          .where(and(eq(albumMedia.albumId, id), eq(albumMedia.mediaId, mediaId)))
          .limit(1)

        if (existing.length > 0) {
          skipped++
          return
        }

        await db.insert(albumMedia).values({
          albumId: id,
          mediaId,
          addedAt: now,
        })
        added++
      } catch {
        skipped++
      }
    })

    await Promise.all(promises)

    await db
      .update(album)
      .set({ updatedAt: now })
      .where(eq(album.id, id))

    res.json({ added, skipped })
  } catch (err) {
    console.error('添加照片到相册失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function removeMediaFromAlbum(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: '请先登录' })

  try {
    const { id, mediaId } = req.params

    const albumInfo = await db.select().from(album).where(eq(album.id, id)).limit(1)
    if (albumInfo.length === 0) {
      return res.status(404).json({ error: '相册不存在' })
    }
    if (albumInfo[0].ownerId !== req.user.id) {
      return res.status(403).json({ error: '无权修改此相册' })
    }

    await db
      .delete(albumMedia)
      .where(and(eq(albumMedia.albumId, id), eq(albumMedia.mediaId, mediaId)))

    await db
      .update(album)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(album.id, id))

    res.json({ ok: true })
  } catch (err) {
    console.error('从相册移除照片失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function batchRemoveMediaFromAlbum(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: '请先登录' })

  try {
    const { id } = req.params
    const { mediaIds } = req.body

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res.status(400).json({ error: '请选择照片' })
    }

    const albumInfo = await db.select().from(album).where(eq(album.id, id)).limit(1)
    if (albumInfo.length === 0) {
      return res.status(404).json({ error: '相册不存在' })
    }
    if (albumInfo[0].ownerId !== req.user.id) {
      return res.status(403).json({ error: '无权修改此相册' })
    }

    let removed = 0
    const promises = mediaIds.map(async (mediaId: string) => {
      try {
        await db
          .delete(albumMedia)
          .where(and(eq(albumMedia.albumId, id), eq(albumMedia.mediaId, mediaId)))
        removed++
      } catch {
        // 忽略
      }
    })

    await Promise.all(promises)

    await db
      .update(album)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(album.id, id))

    res.json({ removed })
  } catch (err) {
    console.error('批量从相册移除照片失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function getAlbumShares(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: '请先登录' })

  try {
    const { id } = req.params

    const albumInfo = await db.select().from(album).where(eq(album.id, id)).limit(1)
    if (albumInfo.length === 0) {
      return res.status(404).json({ error: '相册不存在' })
    }
    if (albumInfo[0].ownerId !== req.user.id) {
      return res.status(403).json({ error: '无权管理此相册的分享' })
    }

    const shares = await db
      .select()
      .from(albumShare)
      .where(eq(albumShare.albumId, id))
      .orderBy(desc(albumShare.createdAt))

    res.json({
      shares: shares.map((s) => ({
        id: s.id,
        albumId: s.albumId,
        shareToken: s.shareToken,
        createdBy: s.createdBy,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
    })
  } catch (err) {
    console.error('获取分享列表失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function createAlbumShare(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: '请先登录' })

  try {
    const { id } = req.params

    const albumInfo = await db.select().from(album).where(eq(album.id, id)).limit(1)
    if (albumInfo.length === 0) {
      return res.status(404).json({ error: '相册不存在' })
    }
    if (albumInfo[0].ownerId !== req.user.id) {
      return res.status(403).json({ error: '无权分享此相册' })
    }

    const now = new Date().toISOString()
    const shareId = generateRandomId()
    const shareToken = require('../utils/securityUtils').generateShareToken()

    await db.insert(albumShare).values({
      id: shareId,
      albumId: id,
      shareToken,
      createdBy: req.user.id,
      createdAt: now,
      expiresAt: null,
    })

    await db.update(album).set({ updatedAt: now }).where(eq(album.id, id))

    res.status(201).json({
      share: {
        id: shareId,
        albumId: id,
        shareToken,
        createdBy: req.user.id,
        createdAt: now,
        expiresAt: null,
      },
    })
  } catch (err) {
    console.error('创建分享失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function deleteAlbumShare(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: '请先登录' })

  try {
    const { id, shareId } = req.params

    const albumInfo = await db.select().from(album).where(eq(album.id, id)).limit(1)
    if (albumInfo.length === 0) {
      return res.status(404).json({ error: '相册不存在' })
    }
    if (albumInfo[0].ownerId !== req.user.id) {
      return res.status(403).json({ error: '无权管理此相册的分享' })
    }

    await db.delete(albumShare).where(eq(albumShare.id, shareId))

    res.json({ ok: true })
  } catch (err) {
    console.error('删除分享失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}