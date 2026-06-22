import chokidar from 'chokidar'
import { appLogger } from '@my-photo/shared'

const log = appLogger

function handleAdd(filePath: string): void {
  log.info('File added', { filePath })
}

function handleAddDir(dirPath: string): void {
  log.info('Directory added', { dirPath })
}

function handleChange(filePath: string): void {
  log.info('File changed', { filePath })
}

function handleUnlink(filePath: string): void {
  log.info('File removed', { filePath })
}

function handleUnlinkDir(dirPath: string): void {
  log.info('Directory removed', { dirPath })
}

function handleError(dirPath: string, error: Error): void {
  log.exception('Watcher error', error, { dirPath })
}

function handleReady(dirPath: string): void {
  log.info('Watcher ready', { dirPath })
}

export function createFileWatcher(dirPath: string): Promise<chokidar.FSWatcher | null> {
  return new Promise((resolve) => {
    let resolved = false
    const done = (watcher: chokidar.FSWatcher | null) => {
      if (resolved) return
      resolved = true
      resolve(watcher)
    }

    try {
      const watcher = chokidar.watch(dirPath, {
        persistent: true,
        ignoreInitial: true,
        ignorePermissionErrors: true
      })

      watcher.on('add', handleAdd)
      watcher.on('addDir', handleAddDir)
      watcher.on('change', handleChange)
      watcher.on('unlink', handleUnlink)
      watcher.on('unlinkDir', handleUnlinkDir)
      watcher.on('error', (error) => handleError(dirPath, error))
      watcher.on('ready', () => {
        handleReady(dirPath)
        done(watcher)
      })

      setTimeout(() => {
        if (!resolved) {
          log.warn('Watcher ready timeout, proceeding anyway', { dirPath })
          done(watcher)
        }
      }, 5000)
    } catch (error: any) {
      log.exception('Failed to create watcher', error instanceof Error ? error : undefined, { dirPath })
      done(null)
    }
  })
}