import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

function findProjectRoot(): string {
  let current = path.dirname(fileURLToPath(import.meta.url))
  while (true) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current
    }
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
}

const PROJECT_ROOT = findProjectRoot()

function resolvePath(envValue: string | undefined, defaultRelative: string): string {
  const raw = envValue || defaultRelative
  return path.isAbsolute(raw) ? raw : path.resolve(PROJECT_ROOT, raw)
}

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL || 'file:./backend/data/db.sqlite'
  if (raw.startsWith('file:')) {
    const relativePath = raw.slice(5)
    const absolutePath = path.isAbsolute(relativePath)
      ? relativePath
      : path.resolve(PROJECT_ROOT, relativePath)
    return `file:${absolutePath}`
  }
  return raw
}

export const config = {
  PROJECT_ROOT,

  MEDIA_PATH: resolvePath(process.env.MEDIA_PATH, './backend/media'),
  THUMBNAIL_PATH: resolvePath(process.env.THUMBNAIL_PATH, './backend/thumbnails'),
  DATA_DIR: resolvePath(process.env.DATA_DIR, './backend/data'),
  DATABASE_URL: resolveDatabaseUrl(),
}