import { EventFanoutManager } from '../services/eventFanoutManager';
import { SqliteQueueRepository } from '../repositories/SqliteQueueRepository';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');

export const scanFanout = new EventFanoutManager('scan', [
  {
    name: 'scan-folder',
    options: {
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
      concurrency: 1
    }
  },
  {
    name: 'read-file',
    options: {
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
      concurrency: 2
    }
  }
]);

// export const importFanout = new EventFanoutManager('import-file', [
//   {
//     name: 'import-primary',
//     options: {
//       backend: { type: 'file', filePath: path.join(dataDir, 'import-primary.json') },
//       delay: 1000,
//       maxRetries: 3,
//       maxProcessingTime: 120000,
//       concurrency: 2
//     }
//   }
// ]);

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