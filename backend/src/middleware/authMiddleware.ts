import { Request, Response, NextFunction } from 'express'

function getCredentialsFromRequest(req: Request): { username: string; password: string } | null {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Basic ')) {
    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8')
    const [username, password] = credentials.split(':')
    return { username, password }
  }

  const tokenParam = req.query.token as string | undefined
  if (tokenParam) {
    try {
      const decoded = Buffer.from(tokenParam, 'base64').toString('utf-8')
      const [username, password] = decoded.split(':')
      return { username, password }
    } catch {
      return null
    }
  }

  return null
}

function validateCredentials(credentials: { username: string; password: string } | null): boolean {
  if (!credentials) return false
  const envUsername = process.env.API_USERNAME || 'admin'
  const envPassword = process.env.API_PASSWORD || 'password'
  return credentials.username === envUsername && credentials.password === envPassword
}

export async function basicAuth(req: Request, res: Response, next: NextFunction) {
  const credentials = getCredentialsFromRequest(req)
  if (validateCredentials(credentials)) {
    return next()
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Photo Management API"')
  return res.status(401).json({ error: 'Unauthorized' })
}

export async function basicAuthOptional(_req: Request, _res: Response, next: NextFunction) {
  return next()
}