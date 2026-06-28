import { Request, Response } from 'express'
import { eq, count, sql } from 'drizzle-orm'
import { db, user, album, albumMedia, albumShare, session } from '@my-photo/shared'
import { generateRandomId, generateInviteCode } from '../utils/securityUtils'

export async function getAllUsers(req: Request, res: Response) {
  try {
    const result = await db
      .select()
      .from(user)
      .orderBy(sql`${user.isAdmin} DESC, ${user.createdAt} ASC`)

    res.json({
      users: result.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarEmoji: u.avatarEmoji,
        isAdmin: u.isAdmin ? true : false,
        status: u.status,
        inviteCode: u.inviteCode,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
    })
  } catch (err) {
    console.error('获取用户列表失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    const { displayName, avatarEmoji } = req.body

    if (!displayName) {
      return res.status(400).json({ error: '请填写昵称' })
    }

    const now = new Date().toISOString()
    const userId = generateRandomId()
    const inviteCode = generateInviteCode()

    await db.insert(user).values({
      id: userId,
      username: null,
      passwordHash: null,
      displayName,
      avatarEmoji: avatarEmoji || '👤',
      inviteCode,
      isAdmin: false,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })

    res.status(201).json({
      user: {
        id: userId,
        displayName,
        avatarEmoji: avatarEmoji || '👤',
        isAdmin: false,
        status: 'active',
        inviteCode,
        createdAt: now,
      },
    })
  } catch (err) {
    console.error('创建用户失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { displayName, avatarEmoji, status, regenerateInviteCode } = req.body

    const existing = await db.select().from(user).where(eq(user.id, id)).limit(1)
    if (existing.length === 0) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const updateData: Partial<typeof user.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    }

    if (displayName !== undefined) updateData.displayName = displayName
    if (avatarEmoji !== undefined) updateData.avatarEmoji = avatarEmoji
    if (status !== undefined) updateData.status = status
    if (regenerateInviteCode) updateData.inviteCode = generateInviteCode()

    await db.update(user).set(updateData).where(eq(user.id, id))

    const updated = await db.select().from(user).where(eq(user.id, id)).limit(1)
    const u = updated[0]

    res.json({
      user: {
        id: u.id,
        displayName: u.displayName,
        avatarEmoji: u.avatarEmoji,
        isAdmin: u.isAdmin ? true : false,
        status: u.status,
        inviteCode: u.inviteCode,
      },
    })
  } catch (err) {
    console.error('更新用户失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params

    if (req.user && req.user.id === id) {
      return res.status(400).json({ error: '不能删除当前登录用户' })
    }

    const existing = await db.select().from(user).where(eq(user.id, id)).limit(1)
    if (existing.length === 0) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 删除用户的所有相册
    const userAlbums = await db.select({ id: album.id }).from(album).where(eq(album.ownerId, id))
    const albumIds = userAlbums.map((a) => a.id)

    if (albumIds.length > 0) {
      // 删除相册-照片关联
      await db.delete(albumMedia).where(sql`${albumMedia.albumId} IN (${sql.join(albumIds.map((a) => sql`${a}`), sql`, `)})`)
      // 删除相册分享记录
      await db.delete(albumShare).where(sql`${albumShare.albumId} IN (${sql.join(albumIds.map((a) => sql`${a}`), sql`, `)})`)
      // 删除相册
      await db.delete(album).where(sql`${album.id} IN (${sql.join(albumIds.map((a) => sql`${a}`), sql`, `)})`)
    }

    // 删除用户的 session
    await db.delete(session).where(eq(session.userId, id))

    // 删除用户
    await db.delete(user).where(eq(user.id, id))

    res.json({ ok: true })
  } catch (err) {
    console.error('删除用户失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}