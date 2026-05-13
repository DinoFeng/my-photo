import { Request, Response } from 'express'
import { queue } from '../utils/queue'

export async function batchExport(req: Request, res: Response) {
  try {
    const { mediaIds, exportPath, organizePattern } = req.body
    const taskId = await queue.enqueue('export', { mediaIds, exportPath, organizePattern })
    res.json({ message: 'Export started', taskId })
  } catch (error) {
    res.status(500).json({ error: 'Failed to start export' })
  }
}

export async function getExportStatus(req: Request, res: Response) {
  try {
    res.json({ status: 'ready' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get export status' })
  }
}