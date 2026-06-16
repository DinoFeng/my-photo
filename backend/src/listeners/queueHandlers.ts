import { broadcastTask } from '../instances/sse'
import { scanFanout, ScanPayload } from '../instances/fanoutQueues'
import { processScanFolder } from '../services/scanService'
import { processReadFile } from '../services/mediaService'

function createQueueHandler(name: string, process: (payload: ScanPayload) => Promise<void>) {
  return async (payload: ScanPayload) => {
    console.log(`[Queue: ${name}] Processing:`, payload)
    broadcastTask('task-start', name, payload)
    try {
      await process(payload)
      broadcastTask('task-complete', name, payload)
    } catch (error) {
      console.error(`[Queue: ${name}] Error:`, error)
      broadcastTask('task-error', name, payload, String(error))
      throw error
    }
  }
}

scanFanout.register('scan-folder', createQueueHandler('scan-folder', processScanFolder))
scanFanout.register('read-file', createQueueHandler('read-file', processReadFile))