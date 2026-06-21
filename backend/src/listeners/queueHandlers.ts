import { broadcastTask } from '../instances/sse'
import { folderFanout, fileFanout, publishScanEntry, publishImportEntry } from '../instances/fanoutQueues'
import type { ScanPayload } from '../types/fanout'
import { processScanFolder } from '../services/scanService'
import { processReadFile } from '../services/mediaService'
import { appLogger } from '../utils/logging'
import type { LoggerWithException } from '../utils/logging'

const log = appLogger

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
    broadcastTask('task-start', name, payload)
    try {
      await process(payload, { logger: workerLog })
      broadcastTask('task-complete', name, payload)
    } catch (error) {
      log.exception('Queue task error', error instanceof Error ? error : undefined, { queue: name, worker: workerId })
      broadcastTask('task-error', name, payload, String(error))
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