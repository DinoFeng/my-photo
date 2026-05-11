import fs from 'fs'
import path from 'path'
import { db } from '../db'
import { sourceDirectory, media } from '../db/schema'
import { eq } from 'drizzle-orm'
import { calculateFileHash, getFileMetadata, getFileType } from '../utils/fileUtils'
import { v4 as uuidv4 } from 'uuid'

export async function processImport(importPath: string, sourceDirectoryId: string): Promise<void> {
  const result = await db.select().from(sourceDirectory).where(eq(sourceDirectory.id, sourceDirectoryId))
  const sourceDir = result[0]

  if (!sourceDir) {
    throw new Error('Source directory not found')
  }

  const files = fs.readdirSync(importPath).filter(file => {
    const ext = path.extname(file).toLowerCase()
    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heif', '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'].includes(ext)
  })

  for (const filename of files) {
    const sourceFilePath = path.join(importPath, filename)
    const hash = await calculateFileHash(sourceFilePath)
    
    const existingMediaResult = await db.select().from(media).where(eq(media.hash, hash))
    const existingMedia = existingMediaResult[0]

    if (existingMedia) {
      continue
    }

    const stat = fs.statSync(sourceFilePath)
    const metadata = await getFileMetadata(sourceFilePath)
    const fileType = getFileType(sourceFilePath)

    const newFilename = generateOrganizedFilename(filename, metadata.dateTaken)
    const targetDir = organizeByDate(sourceDir.path, metadata.dateTaken)
    const targetFilePath = path.join(targetDir, newFilename)

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    fs.copyFileSync(sourceFilePath, targetFilePath)

    const { metadata: rawMetadata, ...mediaData } = metadata
    const now = new Date().toISOString()

    const processedMediaData = {
      ...mediaData,
      dateTaken: mediaData.dateTaken ? mediaData.dateTaken.toISOString() : undefined
    }

    await db.insert(media).values({
      id: uuidv4(),
      sourceDirectoryId,
      filename: newFilename,
      filepath: targetFilePath,
      fileSize: stat.size,
      fileType,
      hash,
      ...processedMediaData,
      createdAt: now,
      updatedAt: now
    })

    fs.unlinkSync(sourceFilePath)
  }
}

function generateOrganizedFilename(originalFilename: string, dateTaken?: Date): string {
  if (!dateTaken) return originalFilename
  
  const ext = path.extname(originalFilename)
  const dateStr = dateTaken.toISOString().slice(0, 19).replace(/[-T:]/g, '')
  return `${dateStr}${ext}`
}

function organizeByDate(basePath: string, dateTaken?: Date): string {
  if (!dateTaken) return basePath
  
  const year = dateTaken.getFullYear()
  const month = String(dateTaken.getMonth() + 1).padStart(2, '0')
  return path.join(basePath, String(year), month)
}