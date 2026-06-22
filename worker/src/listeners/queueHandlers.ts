import { folderFanout, fileFanout, publishScanEntry, publishImportEntry } from '../instances/fanoutQueues'
import type { ScanPayload } from '@my-photo/shared'
import { processScanFolder } from '../services/scanService'
import { processReadFile } from '../services/mediaService'
import { appLogger } from '@my-photo/shared'
import type { LoggerWithException } from '@my-photo/shared'

const log = appLogger

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://localhost:3000'

async function notifyAPI(event: string, type: string, payload: any, error?: string): Promise<void> {
  try {
    await fetch(`${API_INTERNAL_URL}/api/internal/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, type, payload, error }),
    })
  } catch {
    // 通知失败不影响主流程
  }
}

function createIdPool(size: number) {
  const available: number[] = []
  for (let i = size; i >= 1; i--) available.push(i)

  return {
    acquire(): number {
      return available.pop() ?? 0
    },
    release(id: number): void {
      available.push(id)
    },
  }
}

function createQueueHandler(
  name: string,
  concurrency: number,
  process: (payload: ScanPayload, opts: { logger: LoggerWithException }) => Promise<void>,
) {
  const pool = createIdPool(concurrency)

  return async (payload: ScanPayload) => {
    const workerId = String(pool.acquire())
    const workerLog = appLogger.child({ queue: name, worker: workerId }) as LoggerWithException
    log.info('Processing queue task', { queue: name, worker: workerId, payload })
    notifyAPI('task-start', name, payload)
    try {
      await process(payload, { logger: workerLog })
      notifyAPI('task-complete', name, payload)
    } catch (error) {
      log.exception('Queue task error', error instanceof Error ? error : undefined, { queue: name, worker: workerId })
      notifyAPI('task-error', name, payload, String(error))
      throw error
    } finally {
      pool.release(Number(workerId))
    }
  }
}

export function registerQueueHandlers(): void {
  folderFanout.register('scan-folder', createQueueHandler('scan-folder', 2, (payload, opts) => processScanFolder(payload, publishScanEntry, opts)))
  fileFanout.register('read-file', createQueueHandler('read-file', 3, (payload, opts) => processReadFile(payload, publishImportEntry, opts)))
}