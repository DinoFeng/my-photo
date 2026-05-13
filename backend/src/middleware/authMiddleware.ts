import { Request, Response, NextFunction } from 'express'

export async function basicAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Photo Management API"')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8')
  const [username, password] = credentials.split(':')

  const envUsername = process.env.API_USERNAME || 'admin'
  const envPassword = process.env.API_PASSWORD || 'password'

  if (username === envUsername && password === envPassword) {
    return next()
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Photo Management API"')
  return res.status(401).json({ error: 'Unauthorized' })
}