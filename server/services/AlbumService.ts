import { AppDataSource } from '../db/index.js'
import Album from '../db/models/Album.js'
import AlbumPhoto from '../db/models/AlbumPhoto.js'

const albumRepository = AppDataSource.getRepository(Album)
const albumPhotoRepository = AppDataSource.getRepository(AlbumPhoto)

export async function createAlbum(name: string, type: 'system' | 'custom' = 'custom', rule?: string): Promise<Album> {
  const album = albumRepository.create({
    name,
    type,
    rule,
    coverPath: null,
    photoCount: 0
  })
  
  return await albumRepository.save(album)
}

export async function getAlbumById(id: string): Promise<Album | null> {
  return await albumRepository.findOne({ where: { id } })
}

export async function getAllAlbums(): Promise<Album[]> {
  return await albumRepository.find({ order: { createdAt: 'DESC' } })
}

export async function getCustomAlbums(): Promise<Album[]> {
  return await albumRepository.find({ where: { type: 'custom' }, order: { createdAt: 'DESC' } })
}

export async function getSystemAlbums(): Promise<Album[]> {
  return await albumRepository.find({ where: { type: 'system' }, order: { name: 'ASC' } })
}

export async function updateAlbum(id: string, updates: Partial<Album>): Promise<Album | null> {
  const album = await getAlbumById(id)
  if (!album) return null
  
  Object.assign(album, updates)
  album.updatedAt = new Date()
  
  return await albumRepository.save(album)
}

export async function deleteAlbum(id: string): Promise<void> {
  await albumPhotoRepository.delete({ albumId: id })
  await albumRepository.delete(id)
}

export async function updateAlbumPhotoCount(albumId: string): Promise<void> {
  const count = await albumPhotoRepository.count({ where: { albumId } })
  await albumRepository.update(albumId, { photoCount: count })
}

export async function createSystemAlbums(): Promise<void> {
  const systemAlbums = [
    { name: '按日期', type: 'system' as const, rule: '{year}/{month}/{day}' },
    { name: '按相机', type: 'system' as const, rule: '{camera}/{year}' },
    { name: '按地点', type: 'system' as const, rule: 'Locations/{city}' }
  ]
  
  for (const album of systemAlbums) {
    const existing = await albumRepository.findOne({ where: { name: album.name, type: 'system' } })
    if (!existing) {
      await createAlbum(album.name, album.type, album.rule)
    }
  }
}
