import chokidar from 'chokidar'
import { scanDirectory, findSourceDirectory } from '../services/scanService'
import { db } from '../db/index'
import { eq, like } from 'drizzle-orm'
import { scanCheckpoint, media } from '../db/schema'

export function createFileWatcher(dirPath: string): chokidar.FSWatcher {
  const watcher = chokidar.watch(dirPath, {
    persistent: true,
    ignoreInitial: true,
    ignorePermissionErrors: true
  })

  watcher.on('add', async (filePath) => {
    console.log(`[Watcher] File added: ${filePath}`)
    try {
      const sourceDir = await findSourceDirectory(filePath)
      if (sourceDir) {
        await scanDirectory(sourceDir)
      }
    } catch (error) {
      console.error(`[Watcher] Handle add failed: ${error}`)
    }
  })

  watcher.on('addDir', async (dirPath) => {
    console.log(`[Watcher] Directory added: ${dirPath}`)
    try {
      await scanDirectory(dirPath)
    } catch (error) {
      console.error(`[Watcher] Handle addDir failed: ${error}`)
    }
  })

  watcher.on('change', async (filePath) => {
    console.log(`[Watcher] File changed: ${filePath}`)
    try {
      const sourceDir = await findSourceDirectory(filePath)
      if (sourceDir) {
        await scanDirectory(sourceDir)
      }
    } catch (error) {
      console.error(`[Watcher] Handle change failed: ${error}`)
    }
  })

  watcher.on('unlink', async (filePath) => {
    console.log(`[Watcher] File removed: ${filePath}`)
    try {
      await db
        .delete(media)
        .where(eq(media.filepath, filePath))
    } catch (error) {
      console.error(`[Watcher] Handle unlink failed: ${error}`)
    }
  })

  watcher.on('unlinkDir', async (dirPath) => {
    console.log(`[Watcher] Directory removed: ${dirPath}`)
    try {
      await db
        .delete(media)
        .where(like(media.filepath, `${dirPath}%`))
      
      await db
        .delete(scanCheckpoint)
        .where(like(scanCheckpoint.path, `${dirPath}%`))
    } catch (error) {
      console.error(`[Watcher] Handle unlinkDir failed: ${error}`)
    }
  })

  watcher.on('error', (error) => {
    console.error(`[Watcher] Watcher error: ${dirPath}, Error: ${error}`)
  })

  watcher.on('ready', () => {
    console.log(`[Watcher] Ready watching: ${dirPath}`)
  })

  return watcher
}