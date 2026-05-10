import { Request, Response } from 'express'
import { prisma } from '../server'

export async function getScanCheckpoint(req: Request, res: Response) {
  try {
    const { sourceDirectoryId } = req.params
    const checkpoint = await prisma.scanCheckpoint.findUnique({
      where: { sourceDirectoryId }
    })
    if (!checkpoint) {
      return res.status(404).json({ error: 'Scan checkpoint not found' })
    }
    res.json(checkpoint)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scan checkpoint' })
  }
}

export async function getAllScanCheckpoints(req: Request, res: Response) {
  try {
    const checkpoints = await prisma.scanCheckpoint.findMany()
    res.json(checkpoints)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scan checkpoints' })
  }
}

export async function updateScanCheckpoint(req: Request, res: Response) {
  try {
    const { sourceDirectoryId } = req.params
    const { status, progress, totalFiles, scannedFiles, errorCount } = req.body
    const checkpoint = await prisma.scanCheckpoint.update({
      where: { sourceDirectoryId },
      data: { status, progress, totalFiles, scannedFiles, errorCount }
    })
    res.json(checkpoint)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update scan checkpoint' })
  }
}