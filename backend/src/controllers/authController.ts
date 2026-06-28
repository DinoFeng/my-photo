import { Request, Response } from 'express'
import { eq, and, count } from 'drizzle-orm'
import { db, user, session } from '@my-photo/shared'
import {
  hashPassword,
  verifyPassword,
  generateRandomId,
} from '../utils/securityUtils'
import { setSessionCookie, clearSessionCookie, SESSION_CONFIG } from '../middleware/authMiddleware'

export async function getAuthStatus(req: Request, res: Response) {
  try {
    const adminCount = await db
      .select({ count: count() })
      .from(user)
      .where(eq(user.isAdmin, true))

    res.json({
      hasAdmin: (adminCount[0]?.count ?? 0) > 0,
    })
  } catch (err) {
    res.status(500).json({ error: '系统错误' })
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    return res.json({ user: null })
  }
  res.json({ user: req.user })
}

export async function loginWithPassword(req: Request, res: Response) {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' })
    }

    const result = await db
      .select()
      .from(user)
      .where(and(eq(user.username, username), eq(user.isAdmin, true)))
      .limit(1)

    if (result.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    const dbUser = result[0]
    if (!dbUser.passwordHash) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }
    if (dbUser.status !== 'active') {
      return res.status(401).json({ error: '账户已被禁用' })
    }

    if (!verifyPassword(password, dbUser.passwordHash)) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    const now = new Date().toISOString()
    const sessionId = generateRandomId(32)
    const expiresAt = new Date(Date.now() + SESSION_CONFIG.DURATION_MS).toISOString()

    await db.insert(session).values({
      id: sessionId,
      userId: dbUser.id,
      createdAt: now,
      expiresAt,
    })

    setSessionCookie(res, sessionId)

    res.json({
      user: {
        id: dbUser.id,
        displayName: dbUser.displayName,
        avatarEmoji: dbUser.avatarEmoji,
        isAdmin: dbUser.isAdmin ? true : false,
        mustChangePassword: dbUser.mustChangePassword ? true : false,
      },
    })
  } catch (err) {
    console.error('登录失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function loginWithInviteCode(req: Request, res: Response) {
  try {
    const { inviteCode } = req.body

    if (!inviteCode) {
      return res.status(400).json({ error: '请输入邀请码' })
    }

    const result = await db
      .select()
      .from(user)
      .where(eq(user.inviteCode, inviteCode))
      .limit(1)

    if (result.length === 0) {
      return res.status(401).json({ error: '邀请码无效' })
    }

    const dbUser = result[0]
    if (dbUser.status !== 'active') {
      return res.status(401).json({ error: '账户已被禁用' })
    }

    const now = new Date().toISOString()
    const sessionId = generateRandomId(32)
    const expiresAt = new Date(Date.now() + SESSION_CONFIG.DURATION_MS).toISOString()

    await db.insert(session).values({
      id: sessionId,
      userId: dbUser.id,
      createdAt: now,
      expiresAt,
    })

    setSessionCookie(res, sessionId)

    res.json({
      user: {
        id: dbUser.id,
        displayName: dbUser.displayName,
        avatarEmoji: dbUser.avatarEmoji,
        isAdmin: dbUser.isAdmin ? true : false,
      },
    })
  } catch (err) {
    console.error('邀请码登录失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

// Admin 修改自己的密码（含首次强制改密）
export async function changePassword(req: Request, res: Response) {
  try {
    const { oldPassword, newPassword } = req.body

    if (!req.user) {
      return res.status(401).json({ error: '未登录' })
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '新密码至少 6 位' })
    }

    // 查当前用户的完整信息
    const result = await db
      .select()
      .from(user)
      .where(eq(user.id, req.user.id))
      .limit(1)

    if (result.length === 0) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const dbUser = result[0]

    // 如果 must_change_password=true，则不需要验证旧密码（首次使用初始化密码登录）
    // 如果 must_change_password=false，则必须验证旧密码
    if (!dbUser.mustChangePassword) {
      if (!oldPassword) {
        return res.status(400).json({ error: '请输入旧密码' })
      }
      if (!dbUser.passwordHash) {
        return res.status(401).json({ error: '旧密码错误' })
      }
      if (!verifyPassword(oldPassword, dbUser.passwordHash)) {
        return res.status(401).json({ error: '旧密码错误' })
      }
    }

    const now = new Date().toISOString()
    const newPasswordHash = hashPassword(newPassword)

    await db
      .update(user)
      .set({
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        updatedAt: now,
      })
      .where(eq(user.id, req.user.id))

    // 改密后清除其他 session（保留当前）
    await db.delete(session).where(eq(session.userId, req.user.id))

    res.json({
      user: {
        id: dbUser.id,
        displayName: dbUser.displayName,
        avatarEmoji: dbUser.avatarEmoji,
        isAdmin: dbUser.isAdmin ? true : false,
        mustChangePassword: false,
      },
    })
  } catch (err) {
    console.error('改密失败', err)
    res.status(500).json({ error: '系统错误' })
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const sessionId = req.cookies?.[SESSION_CONFIG.COOKIE]
    if (sessionId) {
      await db.delete(session).where(eq(session.id, sessionId))
    }
    clearSessionCookie(res)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: '系统错误' })
  }
}