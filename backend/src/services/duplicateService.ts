import { db } from '../db'
import { media } from '../db/schema'
import { eq } from 'drizzle-orm'
import { calculateFileHash } from '../utils/fileUtils'

export async function findDuplicates(hash: string): Promise<Array<{ id: string; filepath: string }>> {
  const duplicates = await db.select({ id: media.id, filepath: media.filepath })
    .from(media)
    .where(eq(media.hash, hash))
  return duplicates
}

export async function checkForDuplicate(filePath: string): Promise<{ exists: boolean; media: { id: string; filepath: string } | null }> {
  const hash = await calculateFileHash(filePath)
  const result = await db.select({ id: media.id, filepath: media.filepath })
    .from(media)
    .where(eq(media.hash, hash))
  const existing = result[0]
  
  return {
    exists: !!existing,
    media: existing
  }
}

export async function getAllDuplicates(): Promise<Array<{ hash: string | null; count: number; medias: Array<{ id: string; filepath: string }> }>> {
  const allMedias = await db.select({ id: media.id, filepath: media.filepath, hash: media.hash }).from(media)
  
  const hashMap = new Map<string | null, Array<{ id: string; filepath: string }>>()
  for (const m of allMedias) {
    if (!hashMap.has(m.hash)) {
      hashMap.set(m.hash, [])
    }
    hashMap.get(m.hash)!.push({ id: m.id, filepath: m.filepath })
  }

  const result: Array<{ hash: string | null; count: number; medias: Array<{ id: string; filepath: string }> }> = []
  for (const [hash, medias] of hashMap) {
    if (medias.length > 1) {
      result.push({
        hash,
        count: medias.length,
        medias
      })
    }
  }

  return result
}