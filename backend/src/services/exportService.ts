import fs from 'fs'
import path from 'path'
import { db } from '../db'
import { media } from '../db/schema'
import { eq, inArray } from 'drizzle-orm'

export async function exportMedia(mediaIds: string[], exportPath: string, organizePattern: string = 'date'): Promise<void> {
  const medias = await db.select().from(media).where(inArray(media.id, mediaIds))

  for (const mediaItem of medias) {
    const sourceFilePath = mediaItem.filepath
    let targetFilePath: string

    switch (organizePattern) {
      case 'date':
        const dateTaken = mediaItem.dateTaken ? new Date(mediaItem.dateTaken) : new Date()
        const year = dateTaken.getFullYear()
        const month = String(dateTaken.getMonth() + 1).padStart(2, '0')
        const day = String(dateTaken.getDate()).padStart(2, '0')
        const dateDir = path.join(exportPath, String(year), `${year}-${month}`, `${year}-${month}-${day}`)
        if (!fs.existsSync(dateDir)) {
          fs.mkdirSync(dateDir, { recursive: true })
        }
        targetFilePath = path.join(dateDir, mediaItem.filename)
        break
      case 'type':
        const typeDir = path.join(exportPath, mediaItem.fileType)
        if (!fs.existsSync(typeDir)) {
          fs.mkdirSync(typeDir, { recursive: true })
        }
        targetFilePath = path.join(typeDir, mediaItem.filename)
        break
      default:
        targetFilePath = path.join(exportPath, mediaItem.filename)
    }

    if (!fs.existsSync(sourceFilePath)) {
      continue
    }

    fs.copyFileSync(sourceFilePath, targetFilePath)
  }
}