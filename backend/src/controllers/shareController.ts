import { Request, Response } from 'express'
import { eq, and, count, desc, sql } from 'drizzle-orm'
import { db, album, user, albumShare, albumMedia, media } from '@my-photo/shared'

export async function getSharedAlbum(req: Request, res: Response) {
  try {
    const { token } = req.params

    const share = await db
      .select()
      .from(albumShare)
      .where(eq(albumShare.shareToken, token))
      .limit(1)

    if (share.length === 0) {
      return res.status(404).json({ error: '分享链接已过期或不存在' })
    }

    const shareInfo = share[0]

    const albumResult = await db
      .select({
        album: album,
        ownerName: user.displayName,
        mediaCount: count(albumMedia.mediaId),
      })
      .from(album)
      .innerJoin(user, eq(album.ownerId, user.id))
      .leftJoin(albumMedia, eq(album.id, albumMedia.albumId))
      .where(eq(album.id, shareInfo.albumId))
      .groupBy(album.id)
      .limit(1)

    if (albumResult.length === 0) {
      return res.status(404).json({ error: '分享链接已过期或不存在' })
    }

    const a = albumResult[0].album

    res.json({
      album: {
        id: a.id,
        name: a.name,
        description: a.description,
        coverMediaId: a.coverMediaId,
        mediaCount: Number(albumResult[0].mediaCount),
      },
      ownerName: albumResult[0].ownerName,
    })
  } catch (err) {
    console.error('获取分享相册失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function getSharedAlbumMedia(req: Request, res: Response) {
  try {
    const { token } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100)
    const offset = (page - 1) * limit

    const share = await db
      .select()
      .from(albumShare)
      .where(eq(albumShare.shareToken, token))
      .limit(1)

    if (share.length === 0) {
      return res.status(404).json({ error: '分享链接已过期或不存在' })
    }

    const albumId = share[0].albumId

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
      .where(eq(albumMedia.albumId, albumId))
      .orderBy(desc(albumMedia.addedAt))
      .limit(limit)
      .offset(offset)

    const totalResult = await db
      .select({ count: count() })
      .from(albumMedia)
      .where(eq(albumMedia.albumId, albumId))
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
    console.error('获取分享照片失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export function shareIndexHtml(_req: Request, res: Response) {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>分享相册 - 加载中...</title>
      <script>
        // 重定向到前端的分享页面
        const basePath = window.location.origin;
        window.location.href = basePath + '/album-share-viewer.html?token=' + 
          encodeURIComponent(window.location.pathname.split('/').pop() || '');
      </script>
    </head>
    <body>
      <p>加载中... 请稍候</p>
    </body>
    </html>
  `)
}