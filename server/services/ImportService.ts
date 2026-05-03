import { AppDataSource } from '../db/index.js'
import ImportTask from '../db/models/ImportTask.js'
import Photo from '../db/models/Photo.js'
import { getSettings } from './SettingService.js'
import { createPhoto, extractExif, generateThumbnail, findDuplicatePhotos } from './PhotoService.js'
import { calculateFileHash } from '../utils/hashUtils.js'
import { moveFile, listFiles, ensureDirectory, fileExists, PHOTO_EXTENSIONS } from '../utils/fileUtils.js'
import { buildTargetPath } from '../utils/pathUtils.js'
import { join } from 'path'

const importTaskRepository = AppDataSource.getRepository(ImportTask)
const photoRepository = AppDataSource.getRepository(Photo)

export async function scanWatchDirectory(): Promise<{ tasks: ImportTask[], duplicates: any[] }> {
  const settings = await getSettings()
  const watchPath = settings.watchPath
  
  if (!watchPath) {
    return { tasks: [], duplicates: [] }
  }
  
  const files = await listFiles(watchPath, PHOTO_EXTENSIONS)
  const tasks: ImportTask[] = []
  const duplicates: any[] = []
  
  for (const filePath of files) {
    const fileName = filePath.split('/').pop() || ''
    
    const fileHash = await calculateFileHash(filePath)
    const existingPhotos = await findDuplicatePhotos(fileHash)
    
    if (existingPhotos.length > 0) {
      duplicates.push({
        id: Date.now().toString(),
        fileName,
        filePath,
        existingPhotoId: existingPhotos[0].id,
        action: 'skip'
      })
    } else {
      const task = importTaskRepository.create({
        sourcePath: filePath,
        fileName,
        fileHash,
        status: 'pending'
      })
      tasks.push(await importTaskRepository.save(task))
    }
  }
  
  return { tasks, duplicates }
}

export async function processImportTasks(): Promise<void> {
  const settings = await getSettings()
  const pendingTasks = await importTaskRepository.find({ where: { status: 'pending' } })
  
  for (const task of pendingTasks) {
    await processImportTask(task.id, settings)
  }
}

export async function processImportTask(taskId: string, settings?: any): Promise<void> {
  const task = await importTaskRepository.findOne({ where: { id: taskId } })
  if (!task) return
  
  if (!settings) {
    settings = await getSettings()
  }
  
  const exif = await extractExif(task.sourcePath)
  
  const targetPath = join(settings.photoSourcePath, buildTargetPath(settings.organizePattern, exif, task.fileName))
  
  await importTaskRepository.update(taskId, { 
    status: 'processing',
    targetPath
  })
  
  try {
    await ensureDirectory(join(settings.photoSourcePath, settings.organizePattern))
    await moveFile(task.sourcePath, targetPath)
    
    const thumbnailPath = await generateThumbnail(targetPath, join(settings.photoSourcePath, 'thumbnails'))
    await createPhoto(targetPath, exif, thumbnailPath)
    
    await importTaskRepository.update(taskId, { 
      status: 'completed',
      completedAt: new Date()
    })
  } catch (error) {
    await importTaskRepository.update(taskId, { 
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export async function handleDuplicates(duplicates: { id: string, action: string }[]): Promise<void> {
  const settings = await getSettings()
  
  for (const dup of duplicates) {
    const task = await importTaskRepository.findOne({ where: { id: dup.id } })
    if (!task) continue
    
    switch (dup.action) {
      case 'rename':
        const baseName = task.fileName.replace(/\.[^/.]+$/, '')
        const ext = task.fileName.split('.').pop() || ''
        let counter = 1
        let newName = `${baseName}_${counter}.${ext}`
        
        while (await fileExists(join(settings.photoSourcePath, newName))) {
          counter++
          newName = `${baseName}_${counter}.${ext}`
        }
        
        const targetPath = join(settings.photoSourcePath, newName)
        await moveFile(task.sourcePath, targetPath)
        
        const exif = await extractExif(targetPath)
        const thumbnailPath = await generateThumbnail(targetPath, join(settings.photoSourcePath, 'thumbnails'))
        await createPhoto(targetPath, exif, thumbnailPath)
        
        await importTaskRepository.update(task.id, { status: 'completed', completedAt: new Date() })
        break
        
      case 'overwrite':
        const existingPhoto = await photoRepository.findOne({ where: { fileHash: task.fileHash } })
        if (existingPhoto) {
          await moveFile(task.sourcePath, existingPhoto.filePath)
          await importTaskRepository.update(task.id, { status: 'completed', completedAt: new Date() })
        }
        break
        
      case 'skip':
      default:
        await importTaskRepository.update(task.id, { status: 'completed', completedAt: new Date() })
        break
    }
  }
}

export async function getPendingDuplicates(): Promise<any[]> {
  const duplicates = await importTaskRepository.find({ where: { status: 'duplicate' } })
  return duplicates.map(d => ({
    id: d.id,
    fileName: d.fileName,
    filePath: d.sourcePath,
    action: 'skip'
  }))
}
