import { db } from '../db';
import { sourceDirectory } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { QueueStorage, EnqueueResult } from './queueStorage';
import { defaultStorage } from './queueStorage';

export interface QueueProcessor {
  enqueue(type: string, payload: Record<string, unknown>): Promise<EnqueueResult>;
}

export class DefaultQueueProcessor implements QueueProcessor {
  constructor(private storage: QueueStorage = defaultStorage) {}

  async enqueue(type: string, payload: Record<string, unknown>): Promise<EnqueueResult> {
    return this.storage.enqueue(type, payload);
  }
}

export class ScanQueueProcessor implements QueueProcessor {
  constructor(private storage: QueueStorage = defaultStorage) {}

  async enqueue(type: string, payload: Record<string, unknown>): Promise<EnqueueResult> {
    const path = payload.path as string;
    if (!path) {
      throw new Error('scan queue requires "path" in payload');
    }

    const existingDir = await db.select({ id: sourceDirectory.id, enabled: sourceDirectory.enabled })
      .from(sourceDirectory)
      .where(eq(sourceDirectory.path, path))
      .limit(1);

    let sourceDirectoryId: string;

    if (existingDir.length === 0) {
      const now = new Date().toISOString();
      const newDir = await db.insert(sourceDirectory).values({
        id: uuidv4(),
        path,
        name: path.split('/').pop() || path.split('\\').pop() || path,
        enabled: true,
        createdAt: now,
        updatedAt: now
      }).returning();
      sourceDirectoryId = newDir[0].id;
    } else {
      sourceDirectoryId = existingDir[0].id;
      if (!existingDir[0].enabled) {
        throw new Error(`Source directory is disabled: ${path}`);
      }
    }

    const effectivePayload = { sourceDirectoryId };
    return this.storage.enqueueIfNotExists(type, effectivePayload);
  }
}

export class SourceFileAddProcessor implements QueueProcessor {
  constructor(private storage: QueueStorage = defaultStorage) {}

  async enqueue(type: string, payload: Record<string, unknown>): Promise<EnqueueResult> {
    const filePath = payload.filePath as string;
    const sourceDirPath = payload.sourceDirPath as string;

    if (!filePath || !sourceDirPath) {
      throw new Error('source-file-add queue requires "filePath" and "sourceDirPath" in payload');
    }

    const existingDir = await db.select({ id: sourceDirectory.id })
      .from(sourceDirectory)
      .where(eq(sourceDirectory.path, sourceDirPath))
      .limit(1);

    let sourceDirId: string;

    if (existingDir.length === 0) {
      const now = new Date().toISOString();
      const newDir = await db.insert(sourceDirectory).values({
        id: uuidv4(),
        path: sourceDirPath,
        name: sourceDirPath.split('/').pop() || sourceDirPath.split('\\').pop() || sourceDirPath,
        enabled: true,
        createdAt: now,
        updatedAt: now
      }).returning();
      sourceDirId = newDir[0].id;
    } else {
      sourceDirId = existingDir[0].id;
    }

    const effectivePayload = { filePath, sourceDirId };
    return this.storage.enqueueIfNotExists(type, effectivePayload);
  }
}

export class SourceFileChangeProcessor implements QueueProcessor {
  constructor(private storage: QueueStorage = defaultStorage) {}

  async enqueue(type: string, payload: Record<string, unknown>): Promise<EnqueueResult> {
    const filePath = payload.filePath as string;
    const sourceDirPath = payload.sourceDirPath as string;

    if (!filePath || !sourceDirPath) {
      throw new Error('source-file-change queue requires "filePath" and "sourceDirPath" in payload');
    }

    const existingDir = await db.select({ id: sourceDirectory.id })
      .from(sourceDirectory)
      .where(eq(sourceDirectory.path, sourceDirPath))
      .limit(1);

    if (existingDir.length === 0) {
      throw new Error(`Source directory not found: ${sourceDirPath}`);
    }

    const sourceDirId = existingDir[0].id;
    const effectivePayload = { filePath, sourceDirId };
    return this.storage.enqueueIfNotExists(type, effectivePayload);
  }
}

export class SourceFileRemoveProcessor implements QueueProcessor {
  constructor(private storage: QueueStorage = defaultStorage) {}

  async enqueue(type: string, payload: Record<string, unknown>): Promise<EnqueueResult> {
    const filePath = payload.filePath as string;
    const sourceDirPath = payload.sourceDirPath as string;

    if (!filePath || !sourceDirPath) {
      throw new Error('source-file-remove queue requires "filePath" and "sourceDirPath" in payload');
    }

    const existingDir = await db.select({ id: sourceDirectory.id })
      .from(sourceDirectory)
      .where(eq(sourceDirectory.path, sourceDirPath))
      .limit(1);

    if (existingDir.length === 0) {
      throw new Error(`Source directory not found: ${sourceDirPath}`);
    }

    const sourceDirId = existingDir[0].id;
    const effectivePayload = { filePath, sourceDirId };
    return this.storage.enqueueIfNotExists(type, effectivePayload);
  }
}

export class ImportFileProcessor implements QueueProcessor {
  constructor(private storage: QueueStorage = defaultStorage) {}

  async enqueue(type: string, payload: Record<string, unknown>): Promise<EnqueueResult> {
    const filePath = payload.filePath as string;
    if (!filePath) {
      throw new Error('import-file queue requires "filePath" in payload');
    }

    return this.storage.enqueue(type, payload);
  }
}

export class ExportProcessor implements QueueProcessor {
  constructor(private storage: QueueStorage = defaultStorage) {}

  async enqueue(type: string, payload: Record<string, unknown>): Promise<EnqueueResult> {
    const mediaIds = payload.mediaIds as string[];
    const exportPath = payload.exportPath as string;

    if (!mediaIds || !exportPath) {
      throw new Error('export queue requires "mediaIds" and "exportPath" in payload');
    }

    return this.storage.enqueue(type, payload);
  }
}

export const queueProcessors: Record<string, QueueProcessor> = {
  'scan': new ScanQueueProcessor(),
  'source-file-add': new SourceFileAddProcessor(),
  'source-file-change': new SourceFileChangeProcessor(),
  'source-file-remove': new SourceFileRemoveProcessor(),
  'import-file': new ImportFileProcessor(),
  'export': new ExportProcessor(),
};

export function getProcessor(type: string): QueueProcessor {
  return queueProcessors[type] || new DefaultQueueProcessor();
}

export function setStorage(storage: QueueStorage): void {
  queueProcessors['scan'] = new ScanQueueProcessor(storage);
  queueProcessors['source-file-add'] = new SourceFileAddProcessor(storage);
  queueProcessors['source-file-change'] = new SourceFileChangeProcessor(storage);
  queueProcessors['source-file-remove'] = new SourceFileRemoveProcessor(storage);
  queueProcessors['import-file'] = new ImportFileProcessor(storage);
  queueProcessors['export'] = new ExportProcessor(storage);
}