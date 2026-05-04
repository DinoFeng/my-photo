import { promises as fs } from 'fs'
import { basename, extname } from 'path'

export interface ExifData {
  date?: string
  camera?: string
  model?: string
  make?: string
  width?: number
  height?: number
  orientation?: number
  gps?: {
    latitude?: number
    longitude?: number
    altitude?: number
    city?: string
    country?: string
  }
}

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif', '.webp']

export async function extractExif(filePath: string): Promise<ExifData | null> {
  const ext = extname(filePath).toLowerCase()
  
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return null
  }

  try {
    const stats = await fs.stat(filePath)
    const fileName = basename(filePath)
    
    const exif: ExifData = {
      date: stats.mtime.toISOString(),
      camera: extractCameraFromFileName(fileName),
      model: extractModelFromFileName(fileName),
      width: extractDimensionFromFileName(fileName, 'width'),
      height: extractDimensionFromFileName(fileName, 'height'),
      orientation: 1
    }

    return exif
  } catch (error) {
    console.error(`Failed to extract EXIF from ${filePath}:`, error)
    return null
  }
}

function extractCameraFromFileName(fileName: string): string | undefined {
  const patterns = [
    /^(Canon|Nikon|Sony|Fuji|Panasonic|Olympus|Casio|LG|Samsung|Apple|Huawei|Xiaomi|OnePlus)/i,
    /(Canon|Nikon|Sony|Fuji|Panasonic|Olympus|Casio|LG|Samsung|Apple|Huawei|Xiaomi|OnePlus)/i
  ]
  
  for (const pattern of patterns) {
    const match = fileName.match(pattern)
    if (match) {
      return match[1] || match[0]
    }
  }
  
  return undefined
}

function extractModelFromFileName(fileName: string): string | undefined {
  const pattern = /\(([^)]+)\)/i
  const match = fileName.match(pattern)
  return match ? match[1] : undefined
}

function extractDimensionFromFileName(fileName: string, type: 'width' | 'height'): number | undefined {
  const patterns = [
    /(\d{3,4})x(\d{3,4})/i,
    /(\d{3,4})-(\d{3,4})/i,
    /_(\d{3,4})x(\d{3,4})_/i
  ]
  
  for (const pattern of patterns) {
    const match = fileName.match(pattern)
    if (match) {
      return type === 'width' ? parseInt(match[1]) : parseInt(match[2])
    }
  }
  
  return undefined
}

export function parseExifDate(exifDate: string): Date | null {
  try {
    const date = new Date(exifDate)
    if (!isNaN(date.getTime())) {
      return date
    }

    const formats = [
      /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/,
      /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/
    ]

    for (const format of formats) {
      const match = exifDate.match(format)
      if (match) {
        const [_, ...parts] = match
        const [year, month, day, hour = '00', minute = '00', second = '00'] = parts
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        )
      }
    }

    return null
  } catch {
    return null
  }
}
