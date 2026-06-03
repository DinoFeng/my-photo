import { db } from '../db'
import { sourceDirectory } from '../db/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

export async function initSourceDirectories(): Promise<string[]> {
  const sourcesRoot = process.env.SOURCES_PATH
  
  if (!sourcesRoot) {
    throw new Error('SOURCES_PATH environment variable is not set')
  }

  const results: string[] = []
  
  if (!fs.existsSync(sourcesRoot)) {
    fs.mkdirSync(sourcesRoot, { recursive: true })
    console.log(`Created sources root directory: ${sourcesRoot}`)
    return results
  }

  const entries = fs.readdirSync(sourcesRoot, { withFileTypes: true })
  
  const isDev = process.env.NODE_ENV === 'development'
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dirPath = path.join(sourcesRoot, entry.name)
      
      if (!isDev) {
        const stat = fs.statSync(dirPath)
        if (!stat.isSymbolicLink()) {
          const parentStat = fs.statSync(sourcesRoot)
          if (stat.dev === parentStat.dev) {
            console.warn(`Skipping non-mounted directory: ${dirPath}`)
            continue
          }
        }
      }

      const existing = await db.select().from(sourceDirectory)
        .where(eq(sourceDirectory.path, dirPath))
      
      if (existing.length === 0) {
        const now = new Date().toISOString()
        const result = await db.insert(sourceDirectory).values({
          id: uuidv4(),
          path: dirPath,
          name: entry.name,
          enabled: true,
          createdAt: now,
          updatedAt: now
        }).returning()
        results.push(result[0].id)
        console.log(`Auto-discovered source directory: ${dirPath}`)
      } else {
        results.push(existing[0].id)
      }
    }
  }

  if (results.length === 0) {
    const defaultPath = path.join(sourcesRoot, 'default')
    if (!fs.existsSync(defaultPath)) {
      fs.mkdirSync(defaultPath, { recursive: true })
    }
    const now = new Date().toISOString()
    const result = await db.insert(sourceDirectory).values({
      id: uuidv4(),
      path: defaultPath,
      name: '默认目录',
      enabled: true,
      createdAt: now,
      updatedAt: now
    }).returning()
    results.push(result[0].id)
    console.log(`Created default source directory: ${defaultPath}`)
  }

  return results
}