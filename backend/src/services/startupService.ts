import fs from 'fs'
import path from 'path'
import { scanDirectory } from '../services/scanService'

const MEDIA_PATH = process.env.MEDIA_PATH || './media'

/**
 * 获取 media 目录下的直接子目录（挂载点）
 */
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

/**
 * 监听目录变化
 */
function watchDirectory(dirPath: string): void {
  const watcher = fs.watch(dirPath, { recursive: true }, async (eventType, filename) => {
    if (filename) {
      console.log(`[Watcher] ${eventType}: ${path.join(dirPath, filename)}`)
      try {
        await scanDirectory(dirPath)
      } catch (error) {
        console.error(`[Watcher] 扫描目录失败: ${error}`)
      }
    }
  })

  watcher.on('error', (error) => {
    console.error(`[Watcher] 监听失败: ${dirPath}, 错误: ${error}`)
  })

  console.log(`[Watcher] 已启动目录监听: ${dirPath}`)
}

/**
 * 启动时检查 media 目录下所有挂载的子目录，并发布扫描任务
 */
export async function checkAndPublishChangedDirectories(): Promise<void> {
  console.log('[Startup] 检查 media 目录变化...')

  const subDirs = await getMediaSubDirectories()

  if (subDirs.length === 0) {
    console.log('[Startup] 未找到挂载的子目录')
    return
  }

  console.log(`[Startup] 找到 ${subDirs.length} 个子目录`)

  // 先启动所有目录监听
  console.log('[Startup] 启动目录监听...')
  for (const dirPath of subDirs) {
    watchDirectory(dirPath)
  }

  // 然后扫描目录
  console.log('[Startup] 开始扫描目录...')
  for (const dirPath of subDirs) {
    await scanDirectory(dirPath)
  }

  console.log('[Startup] media 目录检查完成')
}