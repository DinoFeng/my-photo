import { Request, Response, NextFunction } from 'express'

const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || 'admin'
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS || 'password'

export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="NAS Photo Manager"')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8')
  const [user, pass] = credentials.split(':')

  if (user === BASIC_AUTH_USER && pass === BASIC_AUTH_PASS) {
    return next()
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="NAS Photo Manager"')
  return res.status(401).json({ error: 'Unauthorized' })
}