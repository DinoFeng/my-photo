import { monitorService } from '../instances/sse'
import { startScan } from '../services/scanService'
import { processImport } from '../services/importService'
import { exportMedia } from '../services/exportService'
import { 
  processSourceFileAdded, 
  processSourceFileChanged, 
  processSourceFileRemoved 
} from '../services/sourceFileProcessor'
import {
  scanFanout,
  importFanout,
  exportFanout,
  sourceFileAddFanout,
  sourceFileChangeFanout,
  sourceFileRemoveFanout
} from '../instances/fanoutQueues'

const broadcastTask = (event: string, type: string, payload: any, error?: string) => {
  monitorService.broadcast({ 
    event, 
    data: { type, payload, error } 
  });
};

interface ScanPayload {
  sourceDirectoryId: string;
}

interface ImportPayload {
  importPath: string;
  sourceDirectoryId: string;
}

interface ExportPayload {
  mediaIds: string[];
  exportPath: string;
  organizePattern?: string;
}

interface SourceFilePayload {
  filePath: string;
  sourceDirId: string;
}

scanFanout.register('scan-primary', async (payload: ScanPayload) => {
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

importFanout.register('import-primary', async (payload: ImportPayload) => {
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

exportFanout.register('export-primary', async (payload: ExportPayload) => {
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

sourceFileAddFanout.register('source-file-add-primary', async (payload: SourceFilePayload) => {
  console.log(`[Queue] Task started: source-file-add`, payload);
  broadcastTask('task-start', 'source-file-add', payload);
  try {
    await processSourceFileAdded(payload.filePath, payload.sourceDirId)
    broadcastTask('task-complete', 'source-file-add', payload);
  } catch (error) {
    broadcastTask('task-error', 'source-file-add', payload, String(error));
    throw error;
  }
})

sourceFileChangeFanout.register('source-file-change-primary', async (payload: SourceFilePayload) => {
  console.log(`[Queue] Task started: source-file-change`, payload);
  broadcastTask('task-start', 'source-file-change', payload);
  try {
    await processSourceFileChanged(payload.filePath, payload.sourceDirId)
    broadcastTask('task-complete', 'source-file-change', payload);
  } catch (error) {
    broadcastTask('task-error', 'source-file-change', payload, String(error));
    throw error;
  }
})

sourceFileRemoveFanout.register('source-file-remove-primary', async (payload: SourceFilePayload) => {
  console.log(`[Queue] Task started: source-file-remove`, payload);
  broadcastTask('task-start', 'source-file-remove', payload);
  try {
    await processSourceFileRemoved(payload.filePath, payload.sourceDirId)
    broadcastTask('task-complete', 'source-file-remove', payload);
  } catch (error) {
    broadcastTask('task-error', 'source-file-remove', payload, String(error));
    throw error;
  }
})

export function startAllQueues(): void {
  scanFanout.startAll();
  importFanout.startAll();
  exportFanout.startAll();
  sourceFileAddFanout.startAll();
  sourceFileChangeFanout.startAll();
  sourceFileRemoveFanout.startAll();
  console.log('[Queue] All queues started');
}
