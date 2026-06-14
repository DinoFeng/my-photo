import { Request, Response } from 'express'
// import { exportFanout } from '../instances/fanoutQueues'

export async function batchExport(req: Request, res: Response) {
  try {
    const { mediaIds, exportPath, organizePattern } = req.body
    // TODO: 暂时禁用队列，待后续启用
    // await exportFanout.publish({ mediaIds, exportPath, organizePattern })
    res.json({ message: 'Export started (queue disabled)' })
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