import { Request, Response } from 'express'
import { prisma } from '../server'
import { startScan } from '../services/scanService'

export async function getAllSourceDirectories(req: Request, res: Response) {
  try {
    const directories = await prisma.sourceDirectory.findMany({
      include: { scanCheckpoint: true }
    })
    res.json(directories)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch source directories' })
  }
}

export async function getSourceDirectory(req: Request, res: Response) {
  try {
    const { id } = req.params
    const directory = await prisma.sourceDirectory.findUnique({
      where: { id },
      include: { scanCheckpoint: true }
    })
    if (!directory) {
      return res.status(404).json({ error: 'Source directory not found' })
    }
    res.json(directory)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch source directory' })
  }
}

export async function createSourceDirectory(req: Request, res: Response) {
  try {
    const { path, name } = req.body
    const directory = await prisma.sourceDirectory.create({
      data: {
        path,
        name: name || path.split('\\').pop() || path.split('/').pop() || ''
      }
    })
    res.status(201).json(directory)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create source directory' })
  }
}

export async function updateSourceDirectory(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { name, enabled } = req.body
    const directory = await prisma.sourceDirectory.update({
      where: { id },
      data: { name, enabled }
    })
    res.json(directory)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update source directory' })
  }
}

export async function deleteSourceDirectory(req: Request, res: Response) {
  try {
    const { id } = req.params
    await prisma.sourceDirectory.delete({ where: { id } })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete source directory' })
  }
}

export async function triggerScan(req: Request, res: Response) {
  try {
    const { id } = req.params
    startScan(id)
    res.json({ message: 'Scan started' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to start scan' })
  }
}