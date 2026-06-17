import fs from 'fs'
import path from 'path'
import { db as drizzleDb } from '../db/index'
import { scanCheckpoint } from '../db/schema'
import { scanDirectory } from '../services/scanService'
import { publishScanEntry } from '../instances/fanoutQueues'
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

async function scanKnownDirectories(): Promise<void> {
  const PAGE_SIZE = 10
  let offset = 0
  let total = 0

  while (true) {
    const checkpoints = await drizzleDb
      .select()
      .from(scanCheckpoint)
      .limit(PAGE_SIZE)
      .offset(offset)
      .all()

    if (checkpoints.length === 0) break

    total += checkpoints.length

    await Promise.all(checkpoints.map(cp =>
      scanDirectory(cp.path, publishScanEntry).catch((error: any) => {
        console.error(`[Startup] 扫描已知目录失败 ${cp.path}:`, error.message)
      })
    ))

    offset += PAGE_SIZE
  }

  console.log(`[Startup] 已检查 ${total} 个已知目录`)
}

export async function checkAndPublishChangedDirectories(): Promise<void> {
  console.log('[Startup] 检查 media 目录变化...')

  // 第一步：遍历 checkpoint 表，检查已知目录是否变化
  await scanKnownDirectories()

  // 第二步：readdir 兜底，处理 checkpoint 表中不存在的新目录
  // 已在第一步处理过的目录，hasDirectoryChanged 会返回 false，不会重复扫描
  const subDirs = await getMediaSubDirectories()
  if (subDirs.length === 0) {
    console.log('[Startup] 未找到挂载的子目录')
    return
  }
  console.log(`[Startup] 当前 media 下有 ${subDirs.length} 个子目录`)

  console.log('[Startup] 启动目录监听...')
  for (const dirPath of subDirs) {
    createFileWatcher(dirPath)
  }

  console.log('[Startup] 补充扫描新目录...')
  for (const dirPath of subDirs) {
    await scanDirectory(dirPath, publishScanEntry)
  }

  console.log('[Startup] media 目录检查完成')
}