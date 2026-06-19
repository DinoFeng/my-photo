import fs from 'fs'
import path from 'path'
import { db as drizzleDb } from '../db/index'
import { scanCheckpoint } from '../db/schema'
import { scanDirectory } from '../services/scanService'
import { publishScanEntry } from '../instances/fanoutQueues'
import { createFileWatcher } from '../listeners/fileWatcher'
import { appLogger } from '../utils/logging'

const log = appLogger

const MEDIA_PATH = process.env.MEDIA_PATH || './media'

async function getMediaSubDirectories(): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(MEDIA_PATH, { withFileTypes: true })
    return entries
      .filter(entry => entry.isDirectory() || entry.isSymbolicLink())
      .map(entry => path.join(MEDIA_PATH, entry.name))
  } catch {
    log.warn('media 目录不存在或无法读取')
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
      scanDirectory(cp.path, publishScanEntry).catch((error: unknown) => {
        log.exception('扫描已知目录失败', error instanceof Error ? error : undefined, { path: cp.path })
      })
    ))

    offset += PAGE_SIZE
  }

  log.info('已检查已知目录', { total })
}

export async function checkAndPublishChangedDirectories(): Promise<void> {
  log.info('检查 media 目录变化...')

  await scanKnownDirectories()

  const subDirs = await getMediaSubDirectories()
  if (subDirs.length === 0) {
    log.warn('未找到挂载的子目录')
    return
  }
  log.info('当前 media 子目录数量', { count: subDirs.length })

  log.info('启动目录监听...')
  for (const dirPath of subDirs) {
    createFileWatcher(dirPath)
  }

  log.info('补充扫描新目录...')
  for (const dirPath of subDirs) {
    await scanDirectory(dirPath, publishScanEntry)
  }

  log.info('media 目录检查完成')
}