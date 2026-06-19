import { EventFanoutManager } from '../utils/eventFanoutManager';
import { SqliteQueueRepository } from '../repositories/SqliteQueueRepository';
import type { ScanPayload } from '../types/fanout';
import type { UpsertResult } from '../types/media';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');

export const folderFanout = new EventFanoutManager<{ scan: (payload: ScanPayload) => Promise<void> }>('scan', [
  {
    name: 'scan-folder',
    options: {
      singleton: false,
      backend: {
        type: 'custom',
        repository: new SqliteQueueRepository(
          path.join(dataDir, 'scan-folder.db'),
          'scan_tasks',
          3,
          60000
        )
      },
      delay: 1000,
      maxRetries: 3,
      maxProcessingTime: 60000,
      concurrency: 10,
      logger: console
    }
  }
]);

export const fileFanout = new EventFanoutManager<{ scan: (payload: ScanPayload) => Promise<void> }>('scan', [
  {
    name: 'read-file',
    options: {
      singleton: false,
      backend: {
        type: 'custom',
        repository: new SqliteQueueRepository(
          path.join(dataDir, 'read-file.db'),
          'read_file_tasks',
          3,
          120000
        )
      },
      delay: 1000,
      maxRetries: 3,
      maxProcessingTime: 120000,
      concurrency: 20,
      logger: console
    }
  }
]);

export function startAllQueues(): void {
  folderFanout.startAll()
  fileFanout.startAll()
}

export async function publishScanEntry(payload: ScanPayload): Promise<void> {
  if (payload.type === 'directory') {
    await folderFanout.publish(payload)
  } else {
    await fileFanout.publish(payload)
  }
}

export async function publishImportEntry(_payload: UpsertResult): Promise<void> {
  // 预留：read-file 完成后发布到下游队列
}

// export const exportFanout = new EventFanoutManager('export', [
//   {
//     name: 'export-primary',
//     options: {
//       backend: { type: 'file', filePath: path.join(dataDir, 'export-primary.json') },
//       delay: 1000,
//       maxRetries: 2,
//       maxProcessingTime: 300000,
//       concurrency: 2
//     }
//   }
// ]);

// export const sourceFileAddFanout = new EventFanoutManager('source-file-add', [
//   {
//     name: 'source-file-add-primary',
//     options: {
//       backend: { type: 'file', filePath: path.join(dataDir, 'source-file-add.json') },
//       delay: 500,
//       maxRetries: 2,
//       maxProcessingTime: 30000,
//       concurrency: 3
//     }
//   }
// ]);

// export const sourceFileChangeFanout = new EventFanoutManager('source-file-change', [
//   {
//     name: 'source-file-change-primary',
//     options: {
//       backend: { type: 'file', filePath: path.join(dataDir, 'source-file-change.json') },
//       delay: 500,
//       maxRetries: 2,
//       maxProcessingTime: 30000,
//       concurrency: 2
//     }
//   }
// ]);

// export const sourceFileRemoveFanout = new EventFanoutManager('source-file-remove', [
//   {
//     name: 'source-file-remove-primary',
//     options: {
//       backend: { type: 'file', filePath: path.join(dataDir, 'source-file-remove.json') },
//       delay: 500,
//       maxRetries: 2,
//       maxProcessingTime: 30000,
//       concurrency: 2
//     }
//   }
// ]);