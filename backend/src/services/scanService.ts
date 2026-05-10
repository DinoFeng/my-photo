import { prisma } from '../server'
import { scanDirectory, calculateFileHash, getFileMetadata, getFileType } from '../utils/fileUtils'
import fs from 'fs'

export async function startScan(sourceDirectoryId: string): Promise<void> {
  const sourceDir = await prisma.sourceDirectory.findUnique({
    where: { id: sourceDirectoryId }
  })

  if (!sourceDir) {
    throw new Error('Source directory not found')
  }

  await prisma.scanCheckpoint.upsert({
    where: { sourceDirectoryId },
    update: {
      status: 'scanning',
      progress: 0,
      totalFiles: 0,
      scannedFiles: 0,
      errorCount: 0,
      startedAt: new Date(),
      completedAt: null
    },
    create: {
      sourceDirectoryId,
      status: 'scanning',
      progress: 0,
      totalFiles: 0,
      scannedFiles: 0,
      errorCount: 0,
      startedAt: new Date()
    }
  })

  try {
    const files = await scanDirectory(sourceDir.path)
    
    await prisma.scanCheckpoint.update({
      where: { sourceDirectoryId },
      data: { totalFiles: files.length }
    })

    let scannedCount = 0
    for (const filePath of files) {
      try {
        const stat = fs.statSync(filePath)
        const hash = await calculateFileHash(filePath)
        const metadata = await getFileMetadata(filePath)
        const fileType = getFileType(filePath)

        const { metadata: rawMetadata, ...mediaData } = metadata

        await prisma.media.upsert({
          where: {
            sourceDirectoryId_filepath: {
              sourceDirectoryId,
              filepath: filePath
            }
          },
          update: {
            filename: filePath.split('\\').pop() || filePath.split('/').pop() || '',
            fileSize: BigInt(stat.size),
            fileType,
            hash,
            ...mediaData,
            metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined,
            updatedAt: new Date()
          },
          create: {
            sourceDirectoryId,
            filename: filePath.split('\\').pop() || filePath.split('/').pop() || '',
            filepath: filePath,
            fileSize: BigInt(stat.size),
            fileType,
            hash,
            ...mediaData,
            metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined
          }
        })
      } catch {
        await prisma.scanCheckpoint.update({
          where: { sourceDirectoryId },
          data: { errorCount: { increment: 1 } }
        })
      }

      scannedCount++
      const progress = Math.round((scannedCount / files.length) * 100)
      await prisma.scanCheckpoint.update({
        where: { sourceDirectoryId },
        data: { scannedFiles: scannedCount, progress }
      })
    }

    await prisma.sourceDirectory.update({
      where: { id: sourceDirectoryId },
      data: { lastScanned: new Date() }
    })

    await prisma.scanCheckpoint.update({
      where: { sourceDirectoryId },
      data: {
        status: 'completed',
        progress: 100,
        completedAt: new Date()
      }
    })
  } catch (error) {
    await prisma.scanCheckpoint.update({
      where: { sourceDirectoryId },
      data: {
        status: 'failed',
        completedAt: new Date()
      }
    })
    throw error
  }
}

export async function getScanStatus(sourceDirectoryId: string) {
  return prisma.scanCheckpoint.findUnique({
    where: { sourceDirectoryId }
  })
}