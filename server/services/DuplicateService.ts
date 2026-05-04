import { AppDataSource } from '../db/index.js'
import Photo from '../db/models/Photo.js'
import ImportTask from '../db/models/ImportTask.js'
import { calculateFileHash } from '../utils/hashUtils.js'
import { promises as fs } from 'fs'
import { join, basename } from 'path'

const photoRepository = AppDataSource.getRepository(Photo)
const importTaskRepository = AppDataSource.getRepository(ImportTask)

export async function findDuplicatePhotos(fileHash: string): Promise<Photo[]> {
  return await photoRepository.find({ where: { fileHash } })
}

export async function findAllDuplicates(): Promise<{ fileHash: string; photos: Photo[] }[]> {
  const duplicates = await photoRepository
    .createQueryBuilder('photo')
    .select('photo.fileHash', 'fileHash')
    .addSelect('COUNT(*)', 'count')
    .groupBy('photo.fileHash')
    .having('COUNT(*) > 1')
    .getRawMany()

  const result: { fileHash: string; photos: Photo[] }[] = []

  for (const item of duplicates) {
    const photos = await photoRepository.find({ where: { fileHash: item.fileHash } })
    result.push({ fileHash: item.fileHash, photos })
  }

  return result
}

export async function handleDuplicate(taskId: string, action: 'skip' | 'rename' | 'overwrite'): Promise<void> {
  const task = await importTaskRepository.findOne({ where: { id: taskId } })
  if (!task) {
    throw new Error('任务不存在')
  }

  if (action === 'skip') {
    await importTaskRepository.update(taskId, { status: 'completed' })
    return
  }

  if (action === 'rename') {
    if (!task.fileHash) {
      throw new Error('任务文件哈希为空')
    }
    const existingPhoto = await photoRepository.findOne({ where: { fileHash: task.fileHash } })
    if (existingPhoto) {
      const dir = join(existingPhoto.filePath, '..')
      const ext = existingPhoto.fileName.substring(existingPhoto.fileName.lastIndexOf('.'))
      const baseName = existingPhoto.fileName.substring(0, existingPhoto.fileName.lastIndexOf('.'))
      
      let newPath: string
      let counter = 1
      do {
        newPath = join(dir, `${baseName}_${counter}${ext}`)
        counter++
      } while (await fileExists(newPath))

      await fs.copyFile(task.sourcePath, newPath)
      
      const newPhoto = photoRepository.create({
        filePath: newPath,
        fileName: basename(newPath),
        fileHash: task.fileHash,
        thumbnailPath: existingPhoto.thumbnailPath,
        exif: existingPhoto.exif,
        takenDate: existingPhoto.takenDate,
        fileSize: existingPhoto.fileSize,
        width: existingPhoto.width,
        height: existingPhoto.height
      })
      
      await photoRepository.save(newPhoto)
      await importTaskRepository.update(taskId, { status: 'completed', completedAt: new Date() })
    }
    return
  }

  if (action === 'overwrite') {
    if (!task.fileHash) {
      throw new Error('任务文件哈希为空')
    }
    const existingPhoto = await photoRepository.findOne({ where: { fileHash: task.fileHash } })
    if (existingPhoto) {
      await fs.copyFile(task.sourcePath, existingPhoto.filePath)
      existingPhoto.updatedAt = new Date()
      await photoRepository.save(existingPhoto)
    }
    await importTaskRepository.update(taskId, { status: 'completed', completedAt: new Date() })
    return
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

export async function deleteDuplicate(photoId: string): Promise<void> {
  const photo = await photoRepository.findOne({ where: { id: photoId } })
  if (!photo) {
    throw new Error('照片不存在')
  }

  if (!photo.fileHash) {
    throw new Error('照片文件哈希为空')
  }
  
  const photosWithSameHash = await photoRepository.find({ where: { fileHash: photo.fileHash } })
  
  if (photosWithSameHash.length <= 1) {
    throw new Error('这是唯一的照片，不能删除')
  }

  if (photo.thumbnailPath) {
    try {
      await fs.unlink(photo.thumbnailPath)
    } catch {
    }
  }

  try {
    await fs.unlink(photo.filePath)
  } catch {
  }

  await photoRepository.delete(photoId)
}
