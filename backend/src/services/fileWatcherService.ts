import chokidar from 'chokidar';
import { prisma } from '../server';
import { calculateFileHash, getFileMetadata, getFileType } from '../utils/fileUtils';
import fs from 'fs';
import { queueService } from './queueService';

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

      await prisma.media.upsert({
        where: {
          sourceDirectoryId_filepath: {
            sourceDirectoryId: sourceDirId,
            filepath: filePath
          }
        },
        update: {
          filename: filePath.split('\\').pop() || filePath.split('/').pop() || '',
          fileSize: BigInt(stat.size),
          fileType,
          hash,
          ...mediaData,
          metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined,
          updatedAt: new Date()
        },
        create: {
          sourceDirectoryId: sourceDirId,
          filename: filePath.split('\\').pop() || filePath.split('/').pop() || '',
          filepath: filePath,
          fileSize: BigInt(stat.size),
          fileType,
          hash,
          ...mediaData,
          metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined
        }
      });
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

      await prisma.media.updateMany({
        where: {
          sourceDirectoryId: sourceDirId,
          filepath: filePath
        },
        data: {
          fileSize: BigInt(stat.size),
          hash,
          ...mediaData,
          metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error processing changed file:', error);
    }
  });

  watcher.on('unlink', async (filePath: string) => {
    try {
      await prisma.media.updateMany({
        where: {
          sourceDirectoryId: sourceDirId,
          filepath: filePath
        },
        data: {
          status: 'removed',
          updatedAt: new Date()
        }
      });
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
  const dirs = await prisma.sourceDirectory.findMany({
    where: { enabled: true }
  });

  for (const dir of dirs) {
    try {
      await startSourceDirWatcher(dir.id, dir.path);
    } catch (error) {
      console.error(`Failed to start watcher for ${dir.path}:`, error);
    }
  }
}
