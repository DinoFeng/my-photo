import { monitorService } from '../instances/sse'
import {
  scanFanout,
  ScanPayload,
} from '../instances/fanoutQueues'
import { isMediaFile } from '../utils/fileUtils'
import { scanDirectory, findSourceDirectory } from '../services/scanService'

const broadcastTask = (event: string, type: string, payload: any, error?: string) => {
  monitorService.broadcast({ 
    event, 
    data: { type, payload, error } 
  });
};

export function startAllQueues(): void {
  scanFanout.startAll()
}

// scan-folder 队列：收到目录消息后检查变化，有变化则扫描并发布子�?
scanFanout.register('scan-folder', async (payload: ScanPayload) => {
  console.log(`[Queue: scan-folder] Processing:`, payload);
  broadcastTask('task-start', 'scan-folder', payload);
  try {
    if (payload.type === 'directory') {
      await scanDirectory(payload.currentPath)
    }
    
    broadcastTask('task-complete', 'scan-folder', payload);
  } catch (error) {
    broadcastTask('task-error', 'scan-folder', payload, String(error));
    throw error;
  }
});

// read-file 队列：收到文件消息后判断是否多媒体文件并入库
scanFanout.register('read-file', async (payload: ScanPayload) => {
  console.log(`[Queue: read-file] Processing:`, payload);
  broadcastTask('task-start', 'read-file', payload);
  try {
    if (payload.type === 'file') {
      if (isMediaFile(payload.currentPath)) {
        const sourcePath = await findSourceDirectory(payload.currentPath)
        
        if (!sourcePath) {
          console.log(`[Queue: read-file] No source directory found for: ${payload.currentPath}`)
        } else {
          console.log(`[Queue: read-file] Media file found, pending import: ${payload.currentPath}, sourcePath: ${sourcePath}`)
        }
      } else {
        console.log(`[Queue: read-file] Not a media file, skipping: ${payload.currentPath}`)
      }
    }
    
    broadcastTask('task-complete', 'read-file', payload);
  } catch (error) {
    broadcastTask('task-error', 'read-file', payload, String(error));
    throw error;
  }
});