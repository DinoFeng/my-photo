import fs from 'fs'
import path from 'path'
import { prisma } from '../server'
import { calculateFileHash, getFileMetadata, getFileType } from '../utils/fileUtils'

export async function processImport(importPath: string, sourceDirectoryId: string): Promise<void> {
  const sourceDir = await prisma.sourceDirectory.findUnique({
    where: { id: sourceDirectoryId }
  })

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
    
    const existingMedia = await prisma.media.findFirst({
      where: { hash }
    })

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

    await prisma.media.create({
      data: {
        sourceDirectoryId,
        filename: newFilename,
        filepath: targetFilePath,
        fileSize: BigInt(stat.size),
        fileType,
        hash,
        ...mediaData,
        metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined
      }
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