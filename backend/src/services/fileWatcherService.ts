import chokidar from 'chokidar';
import { db } from '../db';
import { sourceDirectory, media } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { calculateFileHash, getFileMetadata, getFileType } from '../utils/fileUtils';
import fs from 'fs';
import { queueService } from './queueService';
import { v4 as uuidv4 } from 'uuid';

interface WatcherInstance {
  watcher: chokidar.FSWatcher;
  sourceDirId: string;
  path: string;
  type: 'source' | 'import';
}

const watchers = new Map<string, WatcherInstance>();

export async function startSourceDirWatcher(sourceDirId: string, watchPath: string): Promise<void> {
  if (watchers.has(sourceDirId)) {
    return;
  }

  const watcher = chokidar.watch(watchPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  watcher.on('add', async (filePath: string) => {
    try {
      const stat = fs.statSync(filePath);
      const hash = await calculateFileHash(filePath);
      const metadata = await getFileMetadata(filePath);
      const fileType = getFileType(filePath);
      const { metadata: rawMetadata, ...mediaData } = metadata;
      const now = new Date().toISOString();

      const existingMediaResult = await db.select().from(media)
        .where(and(eq(media.filepath, filePath), eq(media.sourceDirectoryId, sourceDirId)))
      const existingMedia = existingMediaResult[0];
      const filename = filePath.split('\\').pop() || filePath.split('/').pop() || '';

      const processedMediaData = {
        ...mediaData,
        dateTaken: mediaData.dateTaken ? mediaData.dateTaken.toISOString() : undefined
      };

      if (existingMedia) {
        await db.update(media).set({
          filename,
          fileSize: stat.size,
          fileType,
          hash,
          ...processedMediaData,
          metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined,
          updatedAt: now
        }).where(eq(media.id, existingMedia.id));
      } else {
        await db.insert(media).values({
          id: uuidv4(),
          sourceDirectoryId: sourceDirId,
          filename,
          filepath: filePath,
          fileSize: stat.size,
          fileType,
          hash,
          ...processedMediaData,
          createdAt: now,
          updatedAt: now
        });
      }
    } catch (error) {
      console.error('Error processing added file:', error);
    }
  });

  watcher.on('change', async (filePath: string) => {
    try {
      const stat = fs.statSync(filePath);
      const hash = await calculateFileHash(filePath);
      const metadata = await getFileMetadata(filePath);
      const { metadata: rawMetadata, ...mediaData } = metadata;
      const now = new Date().toISOString();

      const processedMediaData = {
        ...mediaData,
        dateTaken: mediaData.dateTaken ? mediaData.dateTaken.toISOString() : undefined
      };

      await db.update(media).set({
        fileSize: stat.size,
        hash,
        ...processedMediaData,
        metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined,
        updatedAt: now
      }).where(and(eq(media.sourceDirectoryId, sourceDirId), eq(media.filepath, filePath)));
    } catch (error) {
      console.error('Error processing changed file:', error);
    }
  });

  watcher.on('unlink', async (filePath: string) => {
    try {
      await db.update(media).set({
        status: 'removed',
        updatedAt: new Date().toISOString()
      }).where(and(eq(media.sourceDirectoryId, sourceDirId), eq(media.filepath, filePath)));
    } catch (error) {
      console.error('Error processing removed file:', error);
    }
  });

  watchers.set(sourceDirId, { watcher, sourceDirId, path: watchPath, type: 'source' });
}

export async function stopSourceDirWatcher(sourceDirId: string): Promise<void> {
  const instance = watchers.get(sourceDirId);
  if (instance) {
    await instance.watcher.close();
    watchers.delete(sourceDirId);
  }
}

export async function startImportDirWatcher(importPath: string): Promise<void> {
  if (watchers.has('import')) {
    return;
  }

  const watcher = chokidar.watch(importPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 3000,
      pollInterval: 100
    }
  });

  watcher.on('add', async (filePath: string) => {
    try {
      await queueService.enqueue('import-file', { filePath });
    } catch (error) {
      console.error('Error queueing import file:', error);
    }
  });

  watchers.set('import', { watcher, sourceDirId: 'import', path: importPath, type: 'import' });
}

export async function stopImportDirWatcher(): Promise<void> {
  const instance = watchers.get('import');
  if (instance) {
    await instance.watcher.close();
    watchers.delete('import');
  }
}

export function getWatcherStatus(): Record<string, {
  type: 'source' | 'import';
  path: string;
  watching: boolean;
}> {
  const status: Record<string, {
    type: 'source' | 'import';
    path: string;
    watching: boolean;
  }> = {};

  watchers.forEach((instance, key) => {
    status[key] = {
      type: instance.type,
      path: instance.path,
      watching: true
    };
  });

  return status;
}

export async function restartAllWatchers(): Promise<void> {
  for (const [, instance] of watchers) {
    await instance.watcher.close();
    if (instance.type === 'source') {
      await startSourceDirWatcher(instance.sourceDirId, instance.path);
    } else {
      await startImportDirWatcher(instance.path);
    }
  }
}

export async function startWatchersForAllSourceDirs(): Promise<void> {
  const dirs = await db.select().from(sourceDirectory).where(eq(sourceDirectory.enabled, true));

  for (const dir of dirs) {
    try {
      await startSourceDirWatcher(dir.id, dir.path);
    } catch (error) {
      console.error(`Failed to start watcher for ${dir.path}:`, error);
    }
  }
}