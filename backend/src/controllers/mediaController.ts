import { Request, Response } from 'express'
import { findAllMedia, findMediaById, deleteMedia, getAllMediaForSSE } from '../services/mediaService'
import { mediaUpdateService } from '../instances/sse'

export async function getAllMedia(req: Request, res: Response) {
  try {
    const { page, limit, sourceDirectoryId, search } = req.query
    
    const result = await findAllMedia({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sourceDirectoryId: sourceDirectoryId as string,
      search: search as string
    })
    
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media' })
  }
}

export async function getMediaById(req: Request, res: Response) {
  try {
    const { id } = req.params
    const mediaItem = await findMediaById(id)
    
    if (!mediaItem) {
      return res.status(404).json({ error: 'Media not found' })
    }
    res.json(mediaItem)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media' })
  }
}

export async function deleteMediaHandler(req: Request, res: Response) {
  try {
    const { id } = req.params
    const deleted = await deleteMedia(id)
    
    if (!deleted) {
      return res.status(404).json({ error: 'Media not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete media' })
  }
}

export async function getMediaUpdates(req: Request, res: Response) {
  const { clientId } = mediaUpdateService.setupConnection(res)

  const sendInitialData = async () => {
    try {
      const allMedia = await getAllMediaForSSE()
      if (allMedia.length > 0) {
        mediaUpdateService.sendEvent(clientId, { event: 'media-list', data: allMedia })
      }
    } catch (error) {
      console.error('Error sending initial media list:', error)
    }
  }

  sendInitialData()

  req.on('close', () => {
    mediaUpdateService.removeClient(clientId)
  })
}