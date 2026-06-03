import { queue } from '../instances/queue'
import { monitorService } from '../instances/sse'
import { startScan } from '../services/scanService'
import { processImport } from '../services/importService'
import { exportMedia } from '../services/exportService'
import { 
  processSourceFileAdded, 
  processSourceFileChanged, 
  processSourceFileRemoved 
} from '../services/sourceFileProcessor'

queue.bindConsumer('scan', async (payload) => {
  console.log(`[Queue] Task started: scan`, payload);
  monitorService.broadcast({ event: 'task-start', data: { type: 'scan', payload } });
  try {
    await startScan(payload.sourceDirectoryId)
    monitorService.broadcast({ event: 'task-complete', data: { type: 'scan', payload } });
  } catch (error) {
    monitorService.broadcast({ event: 'task-error', data: { type: 'scan', payload, error: String(error) } });
    throw error;
  }
})

queue.bindConsumer('import', async (payload) => {
  console.log(`[Queue] Task started: import`, payload);
  monitorService.broadcast({ event: 'task-start', data: { type: 'import', payload } });
  try {
    await processImport(payload.importPath, payload.sourceDirectoryId)
    monitorService.broadcast({ event: 'task-complete', data: { type: 'import', payload } });
  } catch (error) {
    monitorService.broadcast({ event: 'task-error', data: { type: 'import', payload, error: String(error) } });
    throw error;
  }
})

queue.bindConsumer('import-file', async (payload) => {
  console.log(`[Queue] Task started: import-file`, payload);
  monitorService.broadcast({ event: 'task-start', data: { type: 'import-file', payload } });
  try {
    await processImport(payload.importPath, payload.sourceDirectoryId)
    monitorService.broadcast({ event: 'task-complete', data: { type: 'import-file', payload } });
  } catch (error) {
    monitorService.broadcast({ event: 'task-error', data: { type: 'import-file', payload, error: String(error) } });
    throw error;
  }
})

queue.bindConsumer('export', async (payload) => {
  console.log(`[Queue] Task started: export`, payload);
  monitorService.broadcast({ event: 'task-start', data: { type: 'export', payload } });
  try {
    await exportMedia(payload.mediaIds, payload.exportPath, payload.organizePattern)
    monitorService.broadcast({ event: 'task-complete', data: { type: 'export', payload } });
  } catch (error) {
    monitorService.broadcast({ event: 'task-error', data: { type: 'export', payload, error: String(error) } });
    throw error;
  }
})

queue.bindConsumer('source-file-add', async (payload) => {
  console.log(`[Queue] Task started: source-file-add`, payload);
  monitorService.broadcast({ event: 'task-start', data: { type: 'source-file-add', payload } });
  try {
    await processSourceFileAdded(payload.filePath, payload.sourceDirId)
    monitorService.broadcast({ event: 'task-complete', data: { type: 'source-file-add', payload } });
  } catch (error) {
    monitorService.broadcast({ event: 'task-error', data: { type: 'source-file-add', payload, error: String(error) } });
    throw error;
  }
})

queue.bindConsumer('source-file-change', async (payload) => {
  console.log(`[Queue] Task started: source-file-change`, payload);
  monitorService.broadcast({ event: 'task-start', data: { type: 'source-file-change', payload } });
  try {
    await processSourceFileChanged(payload.filePath, payload.sourceDirId)
    monitorService.broadcast({ event: 'task-complete', data: { type: 'source-file-change', payload } });
  } catch (error) {
    monitorService.broadcast({ event: 'task-error', data: { type: 'source-file-change', payload, error: String(error) } });
    throw error;
  }
})

queue.bindConsumer('source-file-remove', async (payload) => {
  console.log(`[Queue] Task started: source-file-remove`, payload);
  monitorService.broadcast({ event: 'task-start', data: { type: 'source-file-remove', payload } });
  try {
    await processSourceFileRemoved(payload.filePath, payload.sourceDirId)
    monitorService.broadcast({ event: 'task-complete', data: { type: 'source-file-remove', payload } });
  } catch (error) {
    monitorService.broadcast({ event: 'task-error', data: { type: 'source-file-remove', payload, error: String(error) } });
    throw error;
  }
})