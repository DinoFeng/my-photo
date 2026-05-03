import { stat, readdir, mkdir, rename, copyFile, unlink } from 'fs/promises'
import { join, extname, basename, dirname } from 'path'

export async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path)
    return stats.isDirectory()
  } catch {
    return false
  }
}

export async function getFileSize(path: string): Promise<number> {
  try {
    const stats = await stat(path)
    return stats.size
  } catch {
    return 0
  }
}

export async function getFileExtension(path: string): string {
  return extname(path).toLowerCase()
}

export async function ensureDirectory(path: string): Promise<void> {
  if (!await fileExists(path)) {
    await mkdir(path, { recursive: true })
  }
}

export async function moveFile(source: string, target: string): Promise<void> {
  await ensureDirectory(dirname(target))
  await rename(source, target)
}

export async function copyFileTo(source: string, target: string): Promise<void> {
  await ensureDirectory(dirname(target))
  await copyFile(source, target)
}

export async function deleteFile(path: string): Promise<void> {
  await unlink(path)
}

export async function listFiles(dir: string, extensions?: string[]): Promise<string[]> {
  const files: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      const subFiles = await listFiles(fullPath, extensions)
      files.push(...subFiles)
    } else if (!extensions || extensions.includes(getFileExtension(entry.name))) {
      files.push(fullPath)
    }
  }
  
  return files
}

export function generateUniqueFileName(directory: string, originalName: string): string {
  const ext = getFileExtension(originalName)
  const nameWithoutExt = basename(originalName, ext)
  let counter = 1
  let newName = originalName
  
  while (fileExists(join(directory, newName))) {
    newName = `${nameWithoutExt}_${counter}${ext}`
    counter++
  }
  
  return newName
}

export const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.heic', '.raw']
