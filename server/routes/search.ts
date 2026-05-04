import { Router } from 'express'
import { searchPhotos, getAvailableCameras, getAvailableLocations } from '../services/SearchService.js'

const router = Router()

router.get('/search', async (req, res) => {
  try {
    const { query, dateFrom, dateTo, camera, location, tags, limit, offset } = req.query

    const photos = await searchPhotos({
      query: query as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      camera: camera as string,
      location: location as string,
      tags: tags ? (tags as string).split(',') : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    })

    res.json(photos)
  } catch (error) {
    console.error('Search failed:', error)
    res.status(500).json({ error: 'Search failed' })
  }
})

router.get('/cameras', async (req, res) => {
  try {
    const cameras = await getAvailableCameras()
    res.json(cameras)
  } catch (error) {
    console.error('Failed to get cameras:', error)
    res.status(500).json({ error: 'Failed to get cameras' })
  }
})

router.get('/locations', async (req, res) => {
  try {
    const locations = await getAvailableLocations()
    res.json(locations)
  } catch (error) {
    console.error('Failed to get locations:', error)
    res.status(500).json({ error: 'Failed to get locations' })
  }
})

export default router
