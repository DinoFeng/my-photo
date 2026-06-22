import { EventFanoutManager } from '../utils/eventFanoutManager';
import { SqliteQueueRepository } from '../repositories/SqliteQueueRepository';
import type { ScanPayload } from '@my-photo/shared';
import type { UpsertResult } from '@my-photo/shared';
import type { LoggerLike } from 'queue-manager-pro';
import { appLogger } from '@my-photo/shared';
import { dumpActiveSteps } from '../utils/stepTracker';
import path from 'path';

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');

function createQueueLogger(name: string): LoggerLike {
  return {
    info(...args: any[]) {
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      appLogger.info(msg, { queue: name });
    },
    warn(...args: any[]) {
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      appLogger.warn(msg, { queue: name });
    },
    error(...args: any[]) {
      const errArg = args.find((a) => a instanceof Error);
      const msg = args.map((a) => (a instanceof Error ? a.message : typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      const context: Record<string, any> = { queue: name };
      if (errArg) {
        context.originalCode = (errArg as any).code;
        context.originalName = errArg.name;
      }
      const steps = dumpActiveSteps();
      const fullMsg = steps ? `${msg} | ${steps}` : msg;
      appLogger.exception(fullMsg, undefined, context);
    },
    debug(...args: any[]) {
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      appLogger.debug(msg, { queue: name });
    },
  };
}

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
      delay: 100,
      maxRetries: 3,
      maxProcessingTime: 60000,
      concurrency: 3,
      logger: createQueueLogger('scan-folder')
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
      delay: 100,
      maxRetries: 3,
      maxProcessingTime: 120000,
      concurrency: 9,
      logger: createQueueLogger('read-file')
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
  // 预留：read-file 完成后发布到下游队列（thumbnail / face-detect）
}