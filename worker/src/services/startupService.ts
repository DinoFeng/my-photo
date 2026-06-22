import fs from 'fs'
import path from 'path'
import { db, scanCheckpoint, config } from '@my-photo/shared'
import { scanDirectory } from '../services/scanService'
import { publishScanEntry } from '../instances/fanoutQueues'
import { createFileWatcher } from '../listeners/fileWatcher'
import { appLogger } from '@my-photo/shared'

const log = appLogger

const MEDIA_PATH = config.MEDIA_PATH

async function getMediaSubDirectories(): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(MEDIA_PATH, { withFileTypes: true })
    return entries
      .filter(entry => entry.isDirectory() || entry.isSymbolicLink())
      .map(entry => path.join(MEDIA_PATH, entry.name))
  } catch (err) {
    log.exception('media 目录不存在或无法读取', err instanceof Error ? err : undefined)
    return []
  }
}

async function scanKnownDirectories(): Promise<void> {
  const PAGE_SIZE = 10
  let offset = 0
  let total = 0

  while (true) {
    const checkpoints = await db
      .select()
      .from(scanCheckpoint)
      .limit(PAGE_SIZE)
      .offset(offset)
      .all()

    if (checkpoints.length === 0) break

    total += checkpoints.length

    await Promise.all(
      checkpoints.map(async (cp) => {
        const resolvedPath = path.isAbsolute(cp.path) ? cp.path : path.resolve(MEDIA_PATH, cp.path)
        await scanDirectory(resolvedPath, publishScanEntry).catch((error: unknown) => {
          log.exception('扫描已知目录失败', error instanceof Error ? error : undefined, { path: cp.path })
        })
      })
    )

    offset += PAGE_SIZE
  }

  log.info('已检查已知目录', { total })
}

export async function startDirectoryWatchers(): Promise<void> {
  log.info('启动目录监听...')

  const subDirs = await getMediaSubDirectories()
  if (subDirs.length === 0) {
    log.warn('未找到挂载的子目录')
    return
  }
  log.info('当前 media 子目录数量', { count: subDirs.length })

  for (const dirPath of subDirs) {
    await createFileWatcher(dirPath)
  }
  log.info('所有目录监听已就绪')
}

export async function scanDirectories(): Promise<void> {
  log.info('检查 media 目录变化...')

  const subDirs = await getMediaSubDirectories()
  if (subDirs.length === 0) {
    log.warn('未找到挂载的子目录')
    return
  }

  log.info('检查已知目录变化...')
  await scanKnownDirectories()

  log.info('补充扫描新目录...')
  for (const dirPath of subDirs) {
    await scanDirectory(dirPath, publishScanEntry)
  }

  log.info('media 目录检查完成')
}