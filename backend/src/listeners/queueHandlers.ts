import { broadcastTask } from '../instances/sse'
import { folderFanout, fileFanout, publishScanEntry, publishImportEntry } from '../instances/fanoutQueues'
import type { ScanPayload } from '../types/fanout'
import { processScanFolder } from '../services/scanService'
import { processReadFile } from '../services/mediaService'
import { appLogger } from '../utils/logging'

const log = appLogger

function createQueueHandler(name: string, process: (payload: ScanPayload) => Promise<void>) {
  return async (payload: ScanPayload) => {
    log.info('Processing queue task', { name, payload })
    broadcastTask('task-start', name, payload)
    try {
      await process(payload)
      broadcastTask('task-complete', name, payload)
    } catch (error) {
      log.exception('Queue task error', error instanceof Error ? error : undefined, { name })
      broadcastTask('task-error', name, payload, String(error))
      throw error
    }
  }
}

folderFanout.register('scan-folder', createQueueHandler('scan-folder', (payload) => processScanFolder(payload, publishScanEntry)))
fileFanout.register('read-file', createQueueHandler('read-file', (payload) => processReadFile(payload, publishImportEntry)))