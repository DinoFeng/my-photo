import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const THUMBNAIL_PATH = process.env.THUMBNAIL_PATH || './thumbnails'

export async function generateThumbnail(sourcePath: string, mediaId: string): Promise<string> {
  if (!fs.existsSync(THUMBNAIL_PATH)) {
    fs.mkdirSync(THUMBNAIL_PATH, { recursive: true })
  }

  const thumbnailName = `${mediaId}.jpg`
  const thumbnailPath = path.join(THUMBNAIL_PATH, thumbnailName)

  try {
    await sharp(sourcePath)
      .resize(200, 200, {
        fit: sharp.fit.cover,
        withoutEnlargement: true
      })
      .toFormat('jpeg')
      .toFile(thumbnailPath)

    return thumbnailPath
  } catch {
    return ''
  }
}

export async function getThumbnail(mediaId: string): Promise<Buffer | null> {
  const thumbnailPath = path.join(THUMBNAIL_PATH, `${mediaId}.jpg`)
  
  if (fs.existsSync(thumbnailPath)) {
    return fs.readFileSync(thumbnailPath)
  }
  
  return null
}