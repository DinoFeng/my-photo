import { Request, Response, NextFunction } from 'express'
import { accessLogger } from '../utils/logging'

export function accessLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const { method, originalUrl, ip } = req
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime
    accessLogger.info('Request completed', {
      method,
      url: originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip,
    })
  })

  next()
}

export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  accessLogger.exception('Unhandled error', err, { method: req.method, url: req.originalUrl })
  next(err)
}