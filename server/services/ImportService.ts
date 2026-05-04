import { AppDataSource } from '../db/index.js'
import ImportTask from '../db/models/ImportTask.js'
import Photo from '../db/models/Photo.js'
import AlbumPhoto from '../db/models/AlbumPhoto.js'
import { extractExif, generateThumbnail } from './PhotoService.js'
import { calculateFileHash } from '../utils/hashUtils.js'
import { fileExists, getFileSize } from '../utils/fileUtils.js'
import { getSettings, updateSettings } from './SettingService.js'
import { createSystemAlbums, getSystemAlbums } from './AlbumService.js'
import { join, basename } from 'path'
import { promises as fs } from 'fs'
import chokidar from 'chokidar'

const importTaskRepository = AppDataSource.getRepository(ImportTask)
const photoRepository = AppDataSource.getRepository(Photo)
const albumPhotoRepository = AppDataSource.getRepository(AlbumPhoto)

export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'duplicate'

export async function createImportTask(sourcePath: string, targetPath?: string): Promise<ImportTask> {
  const task = importTaskRepository.create({
    sourcePath,
    targetPath: targetPath || null,
    fileName: basename(sourcePath),
    fileHash: null,
    status: 'pending',
    errorMessage: null
  })
  return await importTaskRepository.save(task)
}

export async function getImportTasks(status?: string): Promise<ImportTask[]> {
  const query = importTaskRepository.createQueryBuilder('task')
  
  if (status) {
    query.where('task.status = :status', { status })
  }
  
  return await query.orderBy('task.createdAt', 'DESC').getMany()
}

export async function updateImportTask(id: string, updates: Partial<ImportTask>): Promise<void> {
  await importTaskRepository.update(id, updates)
}

export async function deleteImportTask(id: string): Promise<void> {
  await importTaskRepository.delete(id)
}

export async function processImportTasks(): Promise<{ imported: number; duplicates: number; failed: number }> {
  const pendingTasks = await getImportTasks('pending')
  let imported = 0
  let duplicates = 0
  let failed = 0

  for (const task of pendingTasks) {
    await updateImportTask(task.id, { status: 'processing' })
    
    try {
      const result = await processSingleFile(task.sourcePath)
      
      if (result === 'duplicate') {
        await updateImportTask(task.id, { status: 'duplicate' })
        duplicates++
      } else if (result === 'success') {
        await updateImportTask(task.id, { status: 'completed', completedAt: new Date() })
        imported++
      }
    } catch (error) {
      await updateImportTask(task.id, { 
        status: 'failed', 
        errorMessage: error instanceof Error ? error.message : 'Unknown error' 
      })
      failed++
    }
  }

  return { imported, duplicates, failed }
}

export async function processSingleFile(sourcePath: string): Promise<'success' | 'duplicate'> {
  if (!await fileExists(sourcePath)) {
    throw new Error('文件不存在')
  }

  const fileHash = await calculateFileHash(sourcePath)
  const existingPhoto = await photoRepository.findOne({ where: { fileHash } })

  if (existingPhoto) {
    return 'duplicate'
  }

  const exif = await extractExif(sourcePath)
  const settings = await getSettings()
  
  const targetPath = buildTargetPath(sourcePath, exif, settings.organizePattern)
  
  await fs.mkdir(join(targetPath, '..'), { recursive: true })
  await fs.copyFile(sourcePath, targetPath)

  const thumbnailPath = await generateThumbnail(targetPath, join(settings.photoSourcePath || '', 'thumbnails'))
  
  const photo = photoRepository.create({
    filePath: targetPath,
    fileName: basename(targetPath),
    fileHash,
    thumbnailPath,
    exif,
    takenDate: exif?.date,
    fileSize: await getFileSize(sourcePath),
    width: exif?.width || 0,
    height: exif?.height || 0
  })
  
  await photoRepository.save(photo)

  await addPhotoToSystemAlbums(photo, exif)

  return 'success'
}

function buildTargetPath(sourcePath: string, exif: any, pattern: string): string {
  const fileName = basename(sourcePath)
  const date = exif?.date ? new Date(exif.date) : new Date()
  
  let targetPath = pattern
    .replace('{year}', date.getFullYear().toString())
    .replace('{month}', String(date.getMonth() + 1).padStart(2, '0'))
    .replace('{day}', String(date.getDate()).padStart(2, '0'))
    .replace('{camera}', exif?.camera || 'Unknown')
    .replace('{model}', exif?.model || 'Unknown')
    .replace('{city}', exif?.gps?.city || 'Unknown')
    .replace('{country}', exif?.gps?.country || 'Unknown')

  return join(targetPath, fileName)
}

async function addPhotoToSystemAlbums(photo: Photo, exif: any): Promise<void> {
  await createSystemAlbums()
  const albums = await getSystemAlbums()
  
  for (const album of albums) {
    const shouldAdd = determineAlbumInclusion(album, exif)
    if (shouldAdd) {
      const existing = await albumPhotoRepository.findOne({
        where: { albumId: album.id, photoId: photo.id }
      })
      
      if (!existing) {
        const albumPhoto = albumPhotoRepository.create({
          albumId: album.id,
          photoId: photo.id
        })
        await albumPhotoRepository.save(albumPhoto)
        
        await albumPhotoRepository.increment(
          { id: album.id },
          'photoCount',
          1
        )
      }
    }
  }
}

function determineAlbumInclusion(album: { name: string; rule?: string | null }, exif: any): boolean {
  if (!album.rule) return false
  
  if (album.rule.includes('{year}')) return true
  if (album.rule.includes('{camera}') && exif?.camera) return true
  if (album.rule.includes('{city}') && exif?.gps?.city) return true
  
  return false
}

let watcher: chokidar.FSWatcher | null = null

export function startDirectoryWatcher(): void {
  if (watcher) {
    watcher.close()
  }

  getSettings().then(settings => {
    if (!settings.watchPath) return

    watcher = chokidar.watch(settings.watchPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true
    })

    watcher.on('add', async (path) => {
      const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif', '.raw']
      const ext = path.toLowerCase().substring(path.lastIndexOf('.'))
      
      if (extensions.includes(ext)) {
        await createImportTask(path)
        await processImportTasks()
      }
    })
  })
}

export function stopDirectoryWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}
