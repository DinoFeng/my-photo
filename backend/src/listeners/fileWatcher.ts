import chokidar from 'chokidar'

function handleAdd(filePath: string): void {
  console.log(`[Watcher] File added: ${filePath}`)
}

function handleAddDir(dirPath: string): void {
  console.log(`[Watcher] Directory added: ${dirPath}`)
}

function handleChange(filePath: string): void {
  console.log(`[Watcher] File changed: ${filePath}`)
}

function handleUnlink(filePath: string): void {
  console.log(`[Watcher] File removed: ${filePath}`)
}

function handleUnlinkDir(dirPath: string): void {
  console.log(`[Watcher] Directory removed: ${dirPath}`)
}

function handleError(dirPath: string, error: Error): void {
  console.error(`[Watcher] Watcher error: ${dirPath}, Error: ${error}`)
}

function handleReady(dirPath: string): void {
  console.log(`[Watcher] Ready watching: ${dirPath}`)
}

export function createFileWatcher(dirPath: string): chokidar.FSWatcher | null {
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
    watcher.on('ready', () => handleReady(dirPath))

    return watcher
  } catch (error: any) {
    console.error(`[Watcher] Failed to create watcher for ${dirPath}:`, error.message)
    return null
  }
}