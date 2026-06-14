import fs from 'fs'
import path from 'path'
import { scanDirectory } from '../services/scanService'
import { createFileWatcher } from '../listeners/fileWatcher'

const MEDIA_PATH = process.env.MEDIA_PATH || './media'

async function getMediaSubDirectories(): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(MEDIA_PATH, { withFileTypes: true })
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(MEDIA_PATH, entry.name))
  } catch {
    console.log('[Startup] media 目录不存在或无法读取')
    return []
  }
}

export async function checkAndPublishChangedDirectories(): Promise<void> {
  console.log('[Startup] 检查 media 目录变化...')

  const subDirs = await getMediaSubDirectories()

  if (subDirs.length === 0) {
    console.log('[Startup] 未找到挂载的子目录')
    return
  }

  console.log(`[Startup] 找到 ${subDirs.length} 个子目录`)

  console.log('[Startup] 启动目录监听...')
  for (const dirPath of subDirs) {
    createFileWatcher(dirPath)
  }

  console.log('[Startup] 开始扫描目录...')
  for (const dirPath of subDirs) {
    await scanDirectory(dirPath)
  }

  console.log('[Startup] media 目录检查完成')
}