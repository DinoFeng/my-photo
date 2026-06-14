import fs from 'fs'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db as drizzleDb } from '../db'
import { scanCheckpoint } from '../db/schema'
import { scanFanout, ScanPayload } from '../instances/fanoutQueues'

const MEDIA_PATH = process.env.MEDIA_PATH || './media'

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
    stat.
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
 * 更新 scanCheckpoint 记录（保存当前 mtime）
 */
async function updateScanCheckpoint(dirPath: string): Promise<void> {
  const stat = await fs.promises.stat(dirPath)
  const now = new Date().toISOString()
  
  await drizzleDb
    .update(scanCheckpoint)
    .set({
      lastScannedMtime: stat.mtimeMs,
      lastScannedFile: now,
      status: 'completed',
      updatedAt: now
    })
    .where(eq(scanCheckpoint.path, dirPath))
}

/**
 * 发布目录到扫描队列
 */
async function publishDirectory(dirPath: string): Promise<void> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = `${dirPath}/${entry.name}`
    const isDir = entry.isDirectory()
    
    let fileSize: number | undefined
    let mtime: number | undefined
    
    if (!isDir) {
      const stat = await fs.promises.stat(fullPath)
      fileSize = stat.size
      mtime = stat.mtimeMs
    }
    
    const payload: ScanPayload = {
      currentPath: fullPath,
      type: isDir ? 'directory' : 'file',
      fileSize,
      mtime
    }
    
    await scanFanout.publish(payload)
  }
}

/**
 * 扫描目录并发布所有子项到队列
 * 返回是否成功扫描
 */
export async function scanDirectory(dirPath: string): Promise<boolean> {
  const changed = await hasDirectoryChanged(dirPath)
  if (!changed) {
    console.log(`[ScanService] Directory not changed, skipping: ${dirPath}`)
    return false
  }
  
  const isRoot = dirPath.startsWith(MEDIA_PATH) && 
    dirPath.split('/').length === MEDIA_PATH.split('/').length + 1
  
  await getOrCreateScanCheckpoint(dirPath, isRoot)
  
  console.log(`[ScanService] Scanning directory: ${dirPath}`)
  await publishDirectory(dirPath)
  await updateScanCheckpoint(dirPath)
  
  return true
}