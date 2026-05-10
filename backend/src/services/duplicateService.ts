import { prisma } from '../server'
import { calculateFileHash } from '../utils/fileUtils'

export async function findDuplicates(hash: string): Promise<Array<{ id: string; filepath: string }>> {
  const duplicates = await prisma.media.findMany({
    where: { hash },
    select: { id: true, filepath: true }
  })
  return duplicates
}

export async function checkForDuplicate(filePath: string): Promise<{ exists: boolean; media?: { id: string; filepath: string } }> {
  const hash = await calculateFileHash(filePath)
  const existing = await prisma.media.findFirst({
    where: { hash },
    select: { id: true, filepath: true }
  })
  
  return {
    exists: !!existing,
    media: existing
  }
}

export async function getAllDuplicates(): Promise<Array<{ hash: string; count: number; medias: Array<{ id: string; filepath: string }> }>> {
  const duplicates = await prisma.media.groupBy({
    by: ['hash'],
    _count: { id: true },
    having: {
      id: { _count: { gt: 1 } }
    }
  })

  const result = await Promise.all(
    duplicates.map(async (group) => {
      const medias = await prisma.media.findMany({
        where: { hash: group.hash },
        select: { id: true, filepath: true }
      })
      return {
        hash: group.hash,
        count: group._count.id,
        medias
      }
    })
  )

  return result
}