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

const broadcastTask = (event: string, type: string, payload: any, error?: string) => {
  monitorService.broadcast({ 
    event, 
    data: { type, payload, error } 
  });
};

queue.bindConsumer('scan', async (payload) => {
  console.log(`[Queue] Task started: scan`, payload);
  broadcastTask('task-start', 'scan', payload);
  try {
    await startScan(payload.sourceDirectoryId)
    broadcastTask('task-complete', 'scan', payload);
  } catch (error) {
    broadcastTask('task-error', 'scan', payload, String(error));
    throw error;
  }
})

queue.bindConsumer('import-file', async (payload) => {
  console.log(`[Queue] Task started: import-file`, payload);
  broadcastTask('task-start', 'import-file', payload);
  try {
    await processImport(payload.importPath, payload.sourceDirectoryId)
    broadcastTask('task-complete', 'import-file', payload);
  } catch (error) {
    broadcastTask('task-error', 'import-file', payload, String(error));
    throw error;
  }
})

queue.bindConsumer('export', async (payload) => {
  console.log(`[Queue] Task started: export`, payload);
  broadcastTask('task-start', 'export', payload);
  try {
    await exportMedia(payload.mediaIds, payload.exportPath, payload.organizePattern)
    broadcastTask('task-complete', 'export', payload);
  } catch (error) {
    broadcastTask('task-error', 'export', payload, String(error));
    throw error;
  }
})

queue.bindConsumers('source-file-add', async (payload) => {
  console.log(`[Queue] Task started: source-file-add`, payload);
  broadcastTask('task-start', 'source-file-add', payload);
  try {
    await processSourceFileAdded(payload.filePath, payload.sourceDirId)
    broadcastTask('task-complete', 'source-file-add', payload);
  } catch (error) {
    broadcastTask('task-error', 'source-file-add', payload, String(error));
    throw error;
  }
}, 3)

queue.bindConsumers('source-file-change', async (payload) => {
  console.log(`[Queue] Task started: source-file-change`, payload);
  broadcastTask('task-start', 'source-file-change', payload);
  try {
    await processSourceFileChanged(payload.filePath, payload.sourceDirId)
    broadcastTask('task-complete', 'source-file-change', payload);
  } catch (error) {
    broadcastTask('task-error', 'source-file-change', payload, String(error));
    throw error;
  }
}, 2)

queue.bindConsumers('source-file-remove', async (payload) => {
  console.log(`[Queue] Task started: source-file-remove`, payload);
  broadcastTask('task-start', 'source-file-remove', payload);
  try {
    await processSourceFileRemoved(payload.filePath, payload.sourceDirId)
    broadcastTask('task-complete', 'source-file-remove', payload);
  } catch (error) {
    broadcastTask('task-error', 'source-file-remove', payload, String(error));
    throw error;
  }
}, 2)
