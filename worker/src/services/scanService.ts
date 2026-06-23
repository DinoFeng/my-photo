import fs from 'fs'
import path from 'path'
import { performance } from 'perf_hooks'
import { eq, like } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db, scanCheckpoint, media, config, toMediaRelativePath } from '@my-photo/shared'
import type { ScanPayload, PublishFn } from '@my-photo/shared'
import { appLogger } from '@my-photo/shared'
import type { LoggerWithException } from '@my-photo/shared'
import { setStep, clearStep } from '../utils/stepTracker'

const MEDIA_PATH = config.MEDIA_PATH
const PUBLISH_BATCH = 50

async function hasDirectoryChanged(dirPath: string): Promise<{ changed: boolean; exists: boolean }> {
  try {
    const t_stat = performance.now()
    const stat = await fs.promises.stat(dirPath)
    const t_db = performance.now()
    const currentMtime = stat.mtimeMs
    const relativePath = toMediaRelativePath(dirPath)
    const records = await db
      .select()
      .from(scanCheckpoint)
      .where(eq(scanCheckpoint.path, relativePath))
      .limit(1)
    const t_end = performance.now()

    const record = records[0]
    if (!record || record.lastScannedMtime === null) {
      return { changed: true, exists: true }
    }

    const changed = currentMtime > record.lastScannedMtime
    if (!changed) {
      appLogger.debug('hasDirectoryChanged', { dirPath, stat: `${(t_db - t_stat).toFixed(0)}ms`, db: `${(t_end - t_db).toFixed(0)}ms`, total: `${(t_end - t_stat).toFixed(0)}ms` })
    }
    return { changed, exists: true }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { changed: false, exists: false }
    }
    throw error
  }
}

async function processDirectory(dirPath: string, publish: PublishFn, opts?: { logger?: LoggerWithException }): Promise<void> {
  const now = new Date().toISOString()
  const log = opts?.logger ?? appLogger
  const t0 = performance.now()
  const relativeDirPath = toMediaRelativePath(dirPath)

  setStep(dirPath, 'checkpoint')
  const existing = await db
    .select()
    .from(scanCheckpoint)
    .where(eq(scanCheckpoint.path, relativeDirPath))
    .limit(1)

  if (existing.length === 0) {
    const isRoot = relativeDirPath !== '' && !relativeDirPath.includes(path.sep)

    await db.insert(scanCheckpoint).values({
      id: uuidv4(),
      path: relativeDirPath,
      isRoot,
      status: 'scanning',
      createdAt: now,
      updatedAt: now,
    })
  } else {
    await db
      .update(scanCheckpoint)
      .set({ status: 'scanning', updatedAt: now })
      .where(eq(scanCheckpoint.path, relativeDirPath))
  }
  const t1 = performance.now()

  try {
    setStep(dirPath, 'readdir')
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    const t2 = performance.now()

    const payloads: ScanPayload[] = entries.map((entry) => ({
      currentPath: path.join(dirPath, entry.name),
      type: entry.isDirectory() ? 'directory' : 'file',
      sourcePath: relativeDirPath,
    }))

    setStep(dirPath, 'publish')
    const t_publish_start = performance.now()
    for (let i = 0; i < payloads.length; i += PUBLISH_BATCH) {
      const batch = payloads.slice(i, i + PUBLISH_BATCH)
      const t_batch = performance.now()
      await Promise.all(batch.map((p) => publish(p)))
      const t_batch_end = performance.now()
      if (t_batch_end - t_batch > 100) {
        log.debug('Publish batch slow', { dirPath, batchIndex: i / PUBLISH_BATCH, batchSize: batch.length, time: `${(t_batch_end - t_batch).toFixed(0)}ms` })
      }
    }
    const t3 = performance.now()

    setStep(dirPath, 'complete')
    const t_stat_start = performance.now()
    const stat = await fs.promises.stat(dirPath)
    const t_stat_end = performance.now()

    const t_db_start = performance.now()
    await db
      .update(scanCheckpoint)
      .set({
        lastScannedMtime: stat.mtimeMs,
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(scanCheckpoint.path, relativeDirPath))
    const t4 = performance.now()

    log.info('Published entries from directory', {
      count: payloads.length,
      dirPath,
      checkpoint: `${(t1 - t0).toFixed(0)}ms`,
      readdir: `${(t2 - t1).toFixed(0)}ms`,
      publish: `${(t3 - t_publish_start).toFixed(0)}ms`,
      stat: `${(t_stat_end - t_stat_start).toFixed(0)}ms`,
      finalize_db: `${(t4 - t_db_start).toFixed(0)}ms`,
      total: `${(t4 - t0).toFixed(0)}ms`,
    })
  } catch (error: any) {
    await db
      .update(scanCheckpoint)
      .set({
        status: 'error',
        errorCount: (existing[0]?.errorCount ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(scanCheckpoint.path, relativeDirPath))

    log.exception('Failed to process directory', error instanceof Error ? error : undefined, { dirPath })
  } finally {
    clearStep(dirPath)
  }
}

export async function scanDirectory(dirPath: string, publish: PublishFn, opts?: { logger?: LoggerWithException }): Promise<boolean> {
  const log = opts?.logger ?? appLogger
  const t0 = performance.now()
  const { changed, exists } = await hasDirectoryChanged(dirPath)
  const t1 = performance.now()

  if (!exists) {
    log.info('Directory removed, cleaning up', { dirPath, check: `${(t1 - t0).toFixed(0)}ms` })
    await deleteDirectoryRecords(dirPath)
    return false
  }

  if (!changed) {
    log.debug('Directory not changed, skipping', { dirPath, check: `${(t1 - t0).toFixed(0)}ms` })
    return false
  }

  log.info('Scanning directory', { dirPath, check: `${(t1 - t0).toFixed(0)}ms` })
  await processDirectory(dirPath, publish, opts)
  const t2 = performance.now()

  log.info('Directory scanned', { dirPath, check: `${(t1 - t0).toFixed(0)}ms`, scan: `${(t2 - t1).toFixed(0)}ms`, total: `${(t2 - t0).toFixed(0)}ms` })
  return true
}

export async function deleteDirectoryRecords(dirPath: string): Promise<void> {
  const relativePath = toMediaRelativePath(dirPath)
  const likePath = `${relativePath}%`

  await db.delete(media).where(like(media.filepath, likePath))
  await db.delete(scanCheckpoint).where(like(scanCheckpoint.path, likePath))

  appLogger.info('Cleaned up records for deleted directory', { dirPath })
}

export async function processScanFolder(payload: ScanPayload, publish: PublishFn, opts?: { logger?: LoggerWithException }): Promise<void> {
  if (payload.type !== 'directory') return
  try {
    setStep(payload.currentPath, 'scan')
    await scanDirectory(payload.currentPath, publish, opts)
  } finally {
    clearStep(payload.currentPath)
  }
}