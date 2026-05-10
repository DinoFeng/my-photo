import fs from 'fs'
import path from 'path'
import { prisma } from '../server'

export async function exportMedia(mediaIds: string[], exportPath: string, organizePattern: string = 'date'): Promise<void> {
  const medias = await prisma.media.findMany({
    where: { id: { in: mediaIds } }
  })

  for (const media of medias) {
    const sourceFilePath = media.filepath
    let targetFilePath: string

    switch (organizePattern) {
      case 'date':
        const dateTaken = media.dateTaken ? new Date(media.dateTaken) : new Date()
        const year = dateTaken.getFullYear()
        const month = String(dateTaken.getMonth() + 1).padStart(2, '0')
        const day = String(dateTaken.getDate()).padStart(2, '0')
        const dateDir = path.join(exportPath, String(year), `${year}-${month}`, `${year}-${month}-${day}`)
        if (!fs.existsSync(dateDir)) {
          fs.mkdirSync(dateDir, { recursive: true })
        }
        targetFilePath = path.join(dateDir, media.filename)
        break
      case 'type':
        const typeDir = path.join(exportPath, media.fileType)
        if (!fs.existsSync(typeDir)) {
          fs.mkdirSync(typeDir, { recursive: true })
        }
        targetFilePath = path.join(typeDir, media.filename)
        break
      default:
        targetFilePath = path.join(exportPath, media.filename)
    }

    if (!fs.existsSync(sourceFilePath)) {
      continue
    }

    fs.copyFileSync(sourceFilePath, targetFilePath)
  }
}