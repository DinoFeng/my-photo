import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import ExifReader from 'exifreader'

export async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)

    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', (err) => reject(err))
  })
}

function parseExifDate(dateStr: string): Date | null {
  const normalized = dateStr
    .replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')  // "2024:01:15" → "2024-01-15"
    .replace(' ', 'T')                                   // "10:30:00" 前加 T
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}

export async function getFileMetadata(filePath: string): Promise<{
  width?: number
  height?: number
  duration?: number
  make?: string
  model?: string
  dateTaken?: Date
  latitude?: number
  longitude?: number
  metadata?: Record<string, unknown>
}> {
  try {
    const tags = await ExifReader.load(filePath)
    
    const result: {
      width?: number
      height?: number
      duration?: number
      make?: string
      model?: string
      dateTaken?: Date
      latitude?: number
      longitude?: number
      metadata?: Record<string, unknown>
    } = {}

    if (tags['Image Width']) result.width = Number(tags['Image Width'].value)
    if (tags['Image Height']) result.height = Number(tags['Image Height'].value)
    if (tags['Make']) result.make = tags['Make'].description
    if (tags['Model']) result.model = tags['Model'].description
    
    if (tags['DateTimeOriginal']) {
      result.dateTaken = parseExifDate(String(tags['DateTimeOriginal'].description)) ?? undefined
    }
    if (!result.dateTaken && tags['DateTimeDigitized']) {
      result.dateTaken = parseExifDate(String(tags['DateTimeDigitized'].description)) ?? undefined
    }
    if (!result.dateTaken && tags['DateTime']) {
      result.dateTaken = parseExifDate(String(tags['DateTime'].description)) ?? undefined
    }

    if (tags['GPSLatitude'] && tags['GPSLongitude']) {
      const latValue = tags['GPSLatitude'].value
      const lngValue = tags['GPSLongitude'].value
      const latRef = typeof tags['GPSLatitudeRef']?.value === 'string' ? tags['GPSLatitudeRef'].value : undefined
      const lngRef = typeof tags['GPSLongitudeRef']?.value === 'string' ? tags['GPSLongitudeRef'].value : undefined
      if (Array.isArray(latValue) && Array.isArray(lngValue) && latValue.every(v => typeof v === 'number') && lngValue.every(v => typeof v === 'number')) {
        result.latitude = gpsToDecimal(latValue as unknown as number[], latRef)
        result.longitude = gpsToDecimal(lngValue as unknown as number[], lngRef)
      }
    }

    result.metadata = Object.fromEntries(
      Object.entries(tags).map(([key, value]) => [key, value.description || value.value])
    )

    return result
  } catch {
    return {}
  }
}

function gpsToDecimal(coords: number[], ref?: string): number {
  const [degrees, minutes, seconds] = coords
  let decimal = degrees + minutes / 60 + seconds / 3600
  if (ref === 'S' || ref === 'W') decimal = -decimal
  return decimal
}

export function getFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heif'].includes(ext)) return 'image'
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'].includes(ext)) return 'video'
  return 'other'
}

export function isMediaFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heif',
    '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'
  ].includes(ext)
}