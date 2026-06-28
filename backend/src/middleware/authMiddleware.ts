import { Request, Response, NextFunction } from 'express'
import { eq, and, sql } from 'drizzle-orm'
import { db, session, user } from '@my-photo/shared'

export interface AuthenticatedUser {
  id: string
  displayName: string
  avatarEmoji: string
  isAdmin: boolean
  status: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

const SESSION_COOKIE = 'photo_session'
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 天

export async function parseUserSession(req: Request, _res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[SESSION_COOKIE] || req.headers['x-session-id'] as string | undefined

  if (!sessionId) {
    return next()
  }

  try {
    const now = new Date().toISOString()
    const result = await db
      .select({
        sessionId: session.id,
        userId: session.userId,
        userDisplay: user.displayName,
        userAvatar: user.avatarEmoji,
        userIsAdmin: user.isAdmin,
        userStatus: user.status,
      })
      .from(session)
      .innerJoin(user, eq(session.userId, user.id))
      .where(
        and(
          eq(session.id, sessionId),
          sql`${session.expiresAt} > ${now}`
        )
      )
      .limit(1)

    if (result.length > 0 && result[0].userStatus === 'active') {
      req.user = {
        id: result[0].userId,
        displayName: result[0].userDisplay,
        avatarEmoji: result[0].userAvatar,
        isAdmin: result[0].userIsAdmin ? true : false,
        status: result[0].userStatus,
      }
    }
  } catch (err) {
    // 忽略 session 解析错误，继续匿名访问
  }

  next()
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: '请先登录' })
  }
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: '请先登录' })
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' })
  }
  next()
}

export function setSessionCookie(res: Response, sessionId: string) {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS,
  })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE)
}

export const SESSION_CONFIG = {
  COOKIE: SESSION_COOKIE,
  DURATION_MS: SESSION_DURATION_MS,
}