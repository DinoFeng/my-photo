import { Request, Response, NextFunction } from 'express'

export function accessLogger(req: Request, res: Response, next: NextFunction) {
  const { method, originalUrl, ip } = req
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime
    console.log(
      `${new Date().toISOString()} - ${method} ${originalUrl} ${res.statusCode} ${duration}ms - ${ip}`
    )
  })

  next()
}

export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(`${new Date().toISOString()} - Error: ${err.message}`, err.stack)
  next(err)
}