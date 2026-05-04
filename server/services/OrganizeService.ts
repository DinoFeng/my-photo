import { promises as fs } from 'fs'
import { join, basename, dirname, extname } from 'path'
import { AppDataSource } from '../db/index.js'
import Photo from '../db/models/Photo.js'
import { getSettings } from './SettingService.js'
import { extractExif } from './ExifService.js'

const photoRepository = AppDataSource.getRepository(Photo)

export interface OrganizeOptions {
  dryRun?: boolean
  createBackup?: boolean
}

export interface OrganizeResult {
  success: boolean
  moved: number
  skipped: number
  failed: number
  errors: string[]
  previews?: { oldPath: string; newPath: string }[]
}

export async function organizePhotos(options: OrganizeOptions = {}): Promise<OrganizeResult> {
  const { dryRun = false, createBackup = true } = options

  const settings = await getSettings()
  const photos = await photoRepository.find()

  const result: OrganizeResult = {
    success: true,
    moved: 0,
    skipped: 0,
    failed: 0,
    errors: []
  }

  const previews: { oldPath: string; newPath: string }[] = []

  for (const photo of photos) {
    try {
      const newPath = await calculateNewPath(photo, settings.organizePattern)

      if (photo.filePath === newPath) {
        result.skipped++
        continue
      }

      previews.push({ oldPath: photo.filePath, newPath })

      if (!dryRun) {
        const targetDir = dirname(newPath)
        await fs.mkdir(targetDir, { recursive: true })

        if (createBackup) {
          const backupDir = join(dirname(photo.filePath), '.backup')
          await fs.mkdir(backupDir, { recursive: true })
          await fs.copyFile(photo.filePath, join(backupDir, basename(photo.filePath)))
        }

        await fs.rename(photo.filePath, newPath)

        photo.filePath = newPath
        photo.fileName = basename(newPath)
        await photoRepository.save(photo)

        result.moved++
      } else {
        result.moved++
      }
    } catch (error) {
      result.failed++
      result.errors.push(`Failed to organize ${photo.filePath}: ${error}`)
    }
  }

  result.success = result.failed === 0
  if (dryRun) {
    result.previews = previews
  }

  return result
}

async function calculateNewPath(photo: Photo, pattern: string): Promise<string> {
  const exif = photo.exif || {}
  const date = photo.takenDate ? new Date(photo.takenDate) : new Date()

  let newPath = pattern
    .replace('{year}', date.getFullYear().toString())
    .replace('{month}', String(date.getMonth() + 1).padStart(2, '0'))
    .replace('{day}', String(date.getDate()).padStart(2, '0'))
    .replace('{camera}', exif.camera || 'Unknown')
    .replace('{model}', exif.model || 'Unknown')
    .replace('{city}', exif.gps?.city || 'Unknown')
    .replace('{country}', exif.gps?.country || 'Unknown')

  newPath = join(newPath, photo.fileName)

  return newPath
}

export async function previewOrganize(): Promise<{ oldPath: string; newPath: string }[]> {
  const result = await organizePhotos({ dryRun: true })
  return result.previews || []
}

export async function getOrganizeStats(): Promise<{
  totalPhotos: number
  organized: number
  toOrganize: number
}> {
  const settings = await getSettings()
  const photos = await photoRepository.find()

  let organized = 0

  for (const photo of photos) {
    const expectedPath = await calculateNewPath(photo, settings.organizePattern)
    if (photo.filePath === expectedPath) {
      organized++
    }
  }

  return {
    totalPhotos: photos.length,
    organized,
    toOrganize: photos.length - organized
  }
}
