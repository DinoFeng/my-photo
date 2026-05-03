import { AppDataSource } from '../db/index.js'
import Photo from '../db/models/Photo.js'
import AlbumPhoto from '../db/models/AlbumPhoto.js'
import { calculateFileHash } from '../utils/hashUtils.js'
import { fileExists, getFileSize } from '../utils/fileUtils.js'
import * as exifr from 'exifr'
import sharp from 'sharp'
import { join } from 'path'

const photoRepository = AppDataSource.getRepository(Photo)
const albumPhotoRepository = AppDataSource.getRepository(AlbumPhoto)

export async function createPhoto(filePath: string, exif: any, thumbnailPath: string | null): Promise<Photo> {
  const fileHash = await calculateFileHash(filePath)
  const fileSize = await getFileSize(filePath)

  const photo = photoRepository.create({
    filePath,
    fileName: filePath.split('/').pop() || '',
    fileHash,
    thumbnailPath,
    exif,
    takenDate: exif?.date,
    fileSize,
    width: exif?.width || 0,
    height: exif?.height || 0
  })

  return await photoRepository.save(photo)
}

export async function getPhotoById(id: string): Promise<Photo | null> {
  return await photoRepository.findOne({ where: { id } })
}

export async function getAllPhotos(limit?: number, offset?: number): Promise<Photo[]> {
  const query = photoRepository.createQueryBuilder('photo')
    .orderBy('photo.importedAt', 'DESC')

  if (limit) query.limit(limit)
  if (offset) query.offset(offset)

  return await query.getMany()
}

export async function getPhotosByAlbum(albumId: string): Promise<Photo[]> {
  const albumPhotos = await albumPhotoRepository.find({
    where: { albumId }
  })
  const photoIds = albumPhotos.map(ap => ap.photoId)

  if (photoIds.length === 0) return []

  const photos = await photoRepository
    .createQueryBuilder('photo')
    .where('photo.id IN (:...photoIds)', { photoIds })
    .getMany()

  return photos
}

export async function deletePhoto(id: string): Promise<void> {
  await albumPhotoRepository.delete({ photoId: id })
  await photoRepository.delete(id)
}

export async function addPhotoToAlbum(photoId: string, albumId: string): Promise<void> {
  const existing = await albumPhotoRepository.findOne({
    where: { photoId, albumId }
  })

  if (!existing) {
    const albumPhoto = albumPhotoRepository.create({ photoId, albumId })
    await albumPhotoRepository.save(albumPhoto)
  }
}

export async function removePhotoFromAlbum(photoId: string, albumId: string): Promise<void> {
  await albumPhotoRepository.delete({ photoId, albumId })
}

export async function extractExif(filePath: string): Promise<any> {
  try {
    const exif = await exifr.parse(filePath)
    return {
      date: exif?.DateTimeOriginal || exif?.CreateDate || exif?.ModifyDate,
      camera: exif?.Make,
      model: exif?.Model,
      aperture: exif?.FNumber ? `f/${exif.FNumber}` : undefined,
      shutterSpeed: exif?.ExposureTime ? formatShutterSpeed(exif.ExposureTime) : undefined,
      iso: exif?.ISO,
      focalLength: exif?.FocalLength ? `${exif.FocalLength}mm` : undefined,
      width: exif?.ImageWidth,
      height: exif?.ImageHeight,
      gps: exif?.GPSLatitude !== undefined ? {
        latitude: exif.GPSLatitude,
        longitude: exif.GPSLongitude
      } : undefined
    }
  } catch {
    return {}
  }
}

export async function generateThumbnail(sourcePath: string, outputDir: string): Promise<string> {
  const fileName = sourcePath.split('/').pop() || 'thumbnail.jpg'
  const thumbnailName = `thumb_${fileName}`
  const outputPath = join(outputDir, thumbnailName)

  await sharp(sourcePath)
    .resize(320, 320, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toFile(outputPath)

  return outputPath
}

export async function findDuplicatePhotos(fileHash: string): Promise<Photo[]> {
  return await photoRepository.find({ where: { fileHash } })
}

function formatShutterSpeed(value: number): string {
  if (value >= 1) {
    return `${value}s`
  }
  return `${1 / value}`
}
