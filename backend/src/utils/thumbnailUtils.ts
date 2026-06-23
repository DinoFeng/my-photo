import fs from 'fs'
import path from 'path'
import { config, resolveMediaPath, appLogger } from '@my-photo/shared'
import type { LoggerWithException } from '@my-photo/shared'

const log = appLogger as LoggerWithException

const THUMBNAIL_DIR = config.THUMBNAIL_PATH
const MEDIA_DIR = config.MEDIA_PATH

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv', '.m4v',
])

const PHOTO_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.heic', '.heif',
])

export function isVideoFile(filepath: string): boolean {
  return VIDEO_EXTENSIONS.has(path.extname(filepath).toLowerCase())
}

export function isPhotoFile(filepath: string): boolean {
  return PHOTO_EXTENSIONS.has(path.extname(filepath).toLowerCase())
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

export function getThumbnailFilename(mediaId: string, size: number): string {
  return `${mediaId}-${size}.jpg`
}

export function getThumbnailPath(mediaId: string, size: number): string {
  return path.join(THUMBNAIL_DIR, getThumbnailFilename(mediaId, size))
}

export function resolveMediaFilePath(relativeFilepath: string): string {
  return path.resolve(MEDIA_DIR, relativeFilepath)
}

export function getMediaTypeFromExtension(filepath: string): 'photo' | 'video' | 'other' {
  const ext = path.extname(filepath).toLowerCase()
  if (PHOTO_EXTENSIONS.has(ext)) return 'photo'
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  return 'other'
}

export { log as thumbnailLog, THUMBNAIL_DIR, MEDIA_DIR }