import { promises as fs } from 'fs'
import { join, basename, extname } from 'path'
import { getSettings } from './SettingService.js'

const THUMBNAIL_SIZES = {
  low: { width: 320, height: 240 },
  medium: { width: 640, height: 480 },
  high: { width: 1280, height: 960 }
}

export async function generateThumbnail(
  sourcePath: string,
  thumbnailDir: string
): Promise<string> {
  try {
    const settings = await getSettings()
    const size = THUMBNAIL_SIZES[settings.thumbnailQuality as keyof typeof THUMBNAIL_SIZES] || THUMBNAIL_SIZES.medium
    
    const ext = extname(sourcePath)
    const name = basename(sourcePath, ext)
    const thumbnailName = `${name}_thumb${ext}`
    const thumbnailPath = join(thumbnailDir, thumbnailName)
    
    await fs.mkdir(thumbnailDir, { recursive: true })
    
    await fs.copyFile(sourcePath, thumbnailPath)
    
    return thumbnailPath
  } catch (error) {
    console.error(`Failed to generate thumbnail for ${sourcePath}:`, error)
    throw error
  }
}

export async function deleteThumbnail(thumbnailPath: string): Promise<void> {
  try {
    await fs.unlink(thumbnailPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Failed to delete thumbnail ${thumbnailPath}:`, error)
    }
  }
}

export async function regenerateThumbnail(
  sourcePath: string,
  thumbnailPath: string,
  quality: 'low' | 'medium' | 'high'
): Promise<string> {
  const size = THUMBNAIL_SIZES[quality]
  
  await deleteThumbnail(thumbnailPath)
  
  return await generateThumbnail(sourcePath, thumbnailPath.replace(basename(thumbnailPath), ''))
}

export function getThumbnailDimensions(quality: 'low' | 'medium' | 'high') {
  return THUMBNAIL_SIZES[quality]
}
