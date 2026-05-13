import { Request, Response, NextFunction } from 'express'

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' })
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
}