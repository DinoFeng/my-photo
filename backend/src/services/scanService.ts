import fs from 'fs'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db as drizzleDb } from '../db/index'
import { scanCheckpoint } from '../db/schema'
import { scanFanout, ScanPayload } from '../instances/fanoutQueues'

const MEDIA_PATH = process.env.MEDIA_PATH || './media'
const PUBLISH_BATCH = 50

/**
 * 获取文件所属的源目录路径
 */
export async function findSourceDirectory(filePath: string): Promise<string | null> {
  const rootDirs = await drizzleDb
    .select()
    .from(scanCheckpoint)
    .where(eq(scanCheckpoint.isRoot, true))
  
  for (const dir of rootDirs) {
    if (filePath.startsWith(dir.path)) {
      return dir.path
    }
  }
  
  return null
}

/**
 * 检查目录是否有变化（当前 mtime > 上次扫描时记录的 mtime）
 */
export async function hasDirectoryChanged(dirPath: string): Promise<boolean> {
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
      return true  // 从未扫描过，视为有变化
    }
    
    return currentMtime > record.lastScannedMtime
  } catch {
    return true
  }
}

/**
 * 获取或创建 scanCheckpoint 记录
 */
async function getOrCreateScanCheckpoint(dirPath: string, isRoot: boolean): Promise<string> {
  const records = await drizzleDb
    .select()
    .from(scanCheckpoint)
    .where(eq(scanCheckpoint.path, dirPath))
    .limit(1)
  
  if (records.length > 0) {
    return records[0].id
  }
  
  const stat = await fs.promises.stat(dirPath)
  
  const now = new Date().toISOString()
  const result = await drizzleDb.insert(scanCheckpoint).values({
    id: uuidv4(),
    path: dirPath,
    isRoot,
    lastScannedMtime: stat.mtimeMs,
    status: 'idle',
    createdAt: now,
    updatedAt: now
  }).returning()
  
  return result[0].id
}

/**
 * 发布目录内容到扫描队列，并更新 checkpoint
 */
async function publishDirectory(dirPath: string): Promise<void> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })

  const payloads: ScanPayload[] = entries.map((entry) => ({
    currentPath: `${dirPath}/${entry.name}`,
    type: entry.isDirectory() ? 'directory' : 'file',
  }))

  const stat = await fs.promises.stat(dirPath)
  const now = new Date().toISOString()

  await drizzleDb
    .update(scanCheckpoint)
    .set({
      lastScannedMtime: stat.mtimeMs,
      status: 'completed',
      updatedAt: now,
    })
    .where(eq(scanCheckpoint.path, dirPath))

  for (let i = 0; i < payloads.length; i += PUBLISH_BATCH) {
    const batch = payloads.slice(i, i + PUBLISH_BATCH)
    await Promise.all(batch.map((p) => scanFanout.publish(p)))
  }

  console.log(
    `[ScanService] Published ${payloads.length} entries from: ${dirPath}`
  )
}

/**
 * 扫描目录并发布所有子项到队列
 * 返回是否成功扫描（有变化并已发布）
 */
export async function scanDirectory(dirPath: string): Promise<boolean> {
  const changed = await hasDirectoryChanged(dirPath)
  if (!changed) {
    console.log(`[ScanService] Directory not changed, skipping: ${dirPath}`)
    return false
  }

  const isRoot =
    dirPath.startsWith(MEDIA_PATH) &&
    dirPath.split('/').length === MEDIA_PATH.split('/').length + 1

  await getOrCreateScanCheckpoint(dirPath, isRoot)

  console.log(`[ScanService] Scanning directory: ${dirPath}`)
  await publishDirectory(dirPath)

  return true
}