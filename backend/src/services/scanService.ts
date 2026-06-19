import fs from 'fs'
import path from 'path'
import { eq, like } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db as drizzleDb } from '../db/index'
import { scanCheckpoint, media } from '../db/schema'
import type { ScanPayload, PublishFn } from '../types/fanout'
import { appLogger } from '../utils/logging'

const log = appLogger

const MEDIA_PATH = process.env.MEDIA_PATH || './media'
const PUBLISH_BATCH = 50

/**
 * 检查目录是否有变化（当前 mtime > 上次扫描时记录的 mtime）
 */
async function hasDirectoryChanged(dirPath: string): Promise<{ changed: boolean; exists: boolean }> {
  try {
    const stat = await fs.promises.stat(dirPath)
    const currentMtime = stat.mtimeMs
    const records = await drizzleDb
      .select()
      .from(scanCheckpoint)
      .where(eq(scanCheckpoint.path, dirPath))
      .limit(1)

    const record = records[0]
    if (!record || record.lastScannedMtime === null) {
      return { changed: true, exists: true }
    }

    return { changed: currentMtime > record.lastScannedMtime, exists: true }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { changed: false, exists: false }
    }
    throw error
  }
}

/**
 * 处理目录：创建 checkpoint、读取内容、发布到队列
 */
async function processDirectory(dirPath: string, publish: PublishFn): Promise<void> {
  const now = new Date().toISOString()

  const existing = await drizzleDb
    .select()
    .from(scanCheckpoint)
    .where(eq(scanCheckpoint.path, dirPath))
    .limit(1)

  if (existing.length === 0) {
    const relativePath = path.relative(MEDIA_PATH, dirPath)
    const isRoot = relativePath !== '' && !relativePath.includes(path.sep)

    await drizzleDb.insert(scanCheckpoint).values({
      id: uuidv4(),
      path: dirPath,
      isRoot,
      status: 'scanning',
      createdAt: now,
      updatedAt: now,
    })
  } else {
    await drizzleDb
      .update(scanCheckpoint)
      .set({ status: 'scanning', updatedAt: now })
      .where(eq(scanCheckpoint.path, dirPath))
  }

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })

    const payloads: ScanPayload[] = entries.map((entry) => ({
      currentPath: path.join(dirPath, entry.name),
      type: entry.isDirectory() ? 'directory' : 'file',
      sourcePath: dirPath,
    }))

    for (let i = 0; i < payloads.length; i += PUBLISH_BATCH) {
      const batch = payloads.slice(i, i + PUBLISH_BATCH)
      await Promise.all(batch.map((p) => publish(p)))
    }

    const stat = await fs.promises.stat(dirPath)

    await drizzleDb
      .update(scanCheckpoint)
      .set({
        lastScannedMtime: stat.mtimeMs,
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(scanCheckpoint.path, dirPath))

    log.info('Published entries from directory', { count: payloads.length, dirPath })

    // eventBus.emit('scanProgressUpdated', {
    //   sourceDirectoryId: dirPath,
    //   checkpoint: { path: dirPath, status: 'completed' },
    // })
  } catch (error: any) {
    await drizzleDb
      .update(scanCheckpoint)
      .set({
        status: 'error',
        errorCount: (existing[0]?.errorCount ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(scanCheckpoint.path, dirPath))

    log.exception('Failed to process directory', error instanceof Error ? error : undefined, { dirPath })
  }
}

/**
 * 扫描目录并发布所有子项到队列
 * 返回是否成功扫描（有变化并已发布）
 */
export async function scanDirectory(dirPath: string, publish: PublishFn): Promise<boolean> {
  const { changed, exists } = await hasDirectoryChanged(dirPath)

  if (!exists) {
    log.info('Directory removed, cleaning up', { dirPath })
    await deleteDirectoryRecords(dirPath)
    return false
  }

  if (!changed) {
    log.debug('Directory not changed, skipping', { dirPath })
    return false
  }

  log.info('Scanning directory', { dirPath })
  await processDirectory(dirPath, publish)
  return true
}

/**
 * 删除目录相关的所有记录：media 表文件 + checkpoint 表（含子目录）
 */
export async function deleteDirectoryRecords(dirPath: string): Promise<void> {
  const likePath = `${dirPath}%`

  await drizzleDb.delete(media).where(like(media.filepath, likePath))
  await drizzleDb.delete(scanCheckpoint).where(like(scanCheckpoint.path, likePath))

  log.info('Cleaned up records for deleted directory', { dirPath })
}

export async function processScanFolder(payload: ScanPayload, publish: PublishFn): Promise<void> {
  if (payload.type !== 'directory') return
  await scanDirectory(payload.currentPath, publish)
}