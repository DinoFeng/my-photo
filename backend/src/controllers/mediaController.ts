import { Request, Response } from 'express'
import { prisma } from '../server'

export async function getAllMedia(req: Request, res: Response) {
  try {
    const { page = 1, limit = 20, sourceDirectoryId, search } = req.query
    
    const where: Record<string, unknown> = {}
    if (sourceDirectoryId) {
      where.sourceDirectoryId = sourceDirectoryId
    }
    if (search) {
      where.filename = { contains: search as string }
    }

    const [medias, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: { sourceDirectory: true }
      }),
      prisma.media.count({ where })
    ])

    res.json({
      data: medias,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media' })
  }
}

export async function getMediaById(req: Request, res: Response) {
  try {
    const { id } = req.params
    const media = await prisma.media.findUnique({
      where: { id },
      include: { sourceDirectory: true }
    })
    if (!media) {
      return res.status(404).json({ error: 'Media not found' })
    }
    res.json(media)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media' })
  }
}

export async function deleteMedia(req: Request, res: Response) {
  try {
    const { id } = req.params
    await prisma.media.delete({ where: { id } })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete media' })
  }
}