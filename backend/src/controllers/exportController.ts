import { Request, Response } from 'express'
import { exportFanout } from '../instances/fanoutQueues'

export async function batchExport(req: Request, res: Response) {
  try {
    const { mediaIds, exportPath, organizePattern } = req.body
    await exportFanout.publish({ mediaIds, exportPath, organizePattern })
    res.json({ message: 'Export started' })
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