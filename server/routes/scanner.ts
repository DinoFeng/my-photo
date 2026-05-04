import { Router } from 'express'
import { promises as fs } from 'fs'
import { join, basename, extname } from 'path'
import { getSettings } from '../services/SettingService.js'

const router = Router()

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif', '.webp', '.bmp', '.tiff']

interface ScanResult {
  path: string
  name: string
  size: number
  modified: string
  extension: string
}

router.get('/scan-directory', async (req, res) => {
  try {
    const { path: dirPath, recursive = false } = req.query
    
    if (!dirPath || typeof dirPath !== 'string') {
      return res.status(400).json({ error: 'Directory path is required' })
    }

    const results = await scanDirectory(dirPath, recursive === 'true')
    res.json({ files: results, total: results.length })
  } catch (error) {
    console.error('Scan directory failed:', error)
    res.status(500).json({ error: 'Failed to scan directory' })
  }
})

router.get('/scan-watch', async (req, res) => {
  try {
    const settings = await getSettings()
    
    if (!settings.watchPath) {
      return res.status(400).json({ error: 'Watch path not configured' })
    }

    const results = await scanDirectory(settings.watchPath, true)
    res.json({ files: results, total: results.length })
  } catch (error) {
    console.error('Scan watch directory failed:', error)
    res.status(500).json({ error: 'Failed to scan watch directory' })
  }
})

router.get('/scan-source', async (req, res) => {
  try {
    const settings = await getSettings()
    
    if (!settings.photoSourcePath) {
      return res.status(400).json({ error: 'Photo source path not configured' })
    }

    const results = await scanDirectory(settings.photoSourcePath, true)
    res.json({ files: results, total: results.length })
  } catch (error) {
    console.error('Scan source directory failed:', error)
    res.status(500).json({ error: 'Failed to scan source directory' })
  }
})

async function scanDirectory(dirPath: string, recursive: boolean): Promise<ScanResult[]> {
  const results: ScanResult[] = []
  
  try {
    await fs.access(dirPath)
  } catch {
    return results
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name)
    
    if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase()
      
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        try {
          const stats = await fs.stat(fullPath)
          results.push({
            path: fullPath,
            name: entry.name,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            extension: ext
          })
        } catch (error) {
          console.error(`Failed to stat file ${fullPath}:`, error)
        }
      }
    } else if (entry.isDirectory() && recursive) {
      const subResults = await scanDirectory(fullPath, true)
      results.push(...subResults)
    }
  }
  
  return results
}

export default router
