import { queue } from '../instances/queue'
import { startScan } from '../services/scanService'
import { processImport } from '../services/importService'
import { exportMedia } from '../services/exportService'

queue.bindConsumer('scan', async (payload) => {
  await startScan(payload.sourceDirectoryId)
})

queue.bindConsumer('import', async (payload) => {
  await processImport(payload.importPath, payload.sourceDirectoryId)
})

queue.bindConsumer('export', async (payload) => {
  await exportMedia(payload.mediaIds, payload.exportPath, payload.organizePattern)
})