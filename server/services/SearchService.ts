import { AppDataSource } from '../db/index.js'
import Photo from '../db/models/Photo.js'
import { Like, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm'

const photoRepository = AppDataSource.getRepository(Photo)

export interface SearchOptions {
  query?: string
  dateFrom?: string
  dateTo?: string
  camera?: string
  location?: string
  tags?: string[]
  albumId?: string
  limit?: number
  offset?: number
}

export async function searchPhotos(options: SearchOptions): Promise<Photo[]> {
  const {
    query,
    dateFrom,
    dateTo,
    camera,
    location,
    limit = 100,
    offset = 0
  } = options

  const queryBuilder = photoRepository.createQueryBuilder('photo')

  if (query) {
    queryBuilder.andWhere(
      '(photo.fileName LIKE :query OR photo.fileHash LIKE :query)',
      { query: `%${query}%` }
    )
  }

  if (dateFrom) {
    queryBuilder.andWhere('photo.takenDate >= :dateFrom', { dateFrom })
  }

  if (dateTo) {
    queryBuilder.andWhere('photo.takenDate <= :dateTo', { dateTo })
  }

  if (camera) {
    queryBuilder.andWhere('photo.exif LIKE :camera', { camera: `%${camera}%` })
  }

  if (location) {
    queryBuilder.andWhere(
      '(photo.exif LIKE :location)',
      { location: `%${location}%` }
    )
  }

  queryBuilder
    .orderBy('photo.takenDate', 'DESC')
    .skip(offset)
    .take(limit)

  return await queryBuilder.getMany()
}

export async function searchPhotosByDateRange(
  startDate: string,
  endDate: string,
  limit?: number,
  offset?: number
): Promise<Photo[]> {
  return await searchPhotos({
    dateFrom: startDate,
    dateTo: endDate,
    limit,
    offset
  })
}

export async function searchPhotosByCamera(
  camera: string,
  limit?: number,
  offset?: number
): Promise<Photo[]> {
  return await searchPhotos({
    camera,
    limit,
    offset
  })
}

export async function searchPhotosByLocation(
  location: string,
  limit?: number,
  offset?: number
): Promise<Photo[]> {
  return await searchPhotos({
    location,
    limit,
    offset
  })
}

export async function searchPhotosByTags(
  tags: string[],
  limit?: number,
  offset?: number
): Promise<Photo[]> {
  return await searchPhotos({
    tags,
    limit,
    offset
  })
}

export async function getAvailableCameras(): Promise<string[]> {
  const photos = await photoRepository
    .createQueryBuilder('photo')
    .select('DISTINCT photo.exif->>"$.camera"', 'camera')
    .where('photo.exif->>"$.camera" IS NOT NULL')
    .getRawMany()

  return photos
    .map(p => p.camera)
    .filter(c => c != null)
}

export async function getAvailableLocations(): Promise<string[]> {
  const photos = await photoRepository
    .createQueryBuilder('photo')
    .select('DISTINCT photo.exif->>"$.gps.city"', 'city')
    .where('photo.exif->>"$.gps.city" IS NOT NULL')
    .getRawMany()

  return photos
    .map(p => p.city)
    .filter(c => c != null)
}
