import { Request, Response } from 'express'
import { exportMedia } from '../services/exportService'

export async function batchExport(req: Request, res: Response) {
  try {
    const { mediaIds, exportPath, organizePattern } = req.body
    await exportMedia(mediaIds, exportPath, organizePattern)
    res.json({ message: 'Export completed' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to export media' })
  }
}

export async function getExportStatus(req: Request, res: Response) {
  try {
    res.json({ status: 'ready' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get export status' })
  }
}