import { createHash } from 'crypto'
import { readFile } from 'fs/promises'

export async function calculateFileHash(filePath: string, algorithm: string = 'sha256'): Promise<string> {
  const data = await readFile(filePath)
  const hash = createHash(algorithm)
  hash.update(data)
  return hash.digest('hex')
}

export function calculateStringHash(str: string, algorithm: string = 'md5'): string {
  const hash = createHash(algorithm)
  hash.update(str)
  return hash.digest('hex')
}

export async function filesHaveSameHash(path1: string, path2: string): Promise<boolean> {
  const hash1 = await calculateFileHash(path1)
  const hash2 = await calculateFileHash(path2)
  return hash1 === hash2
}
