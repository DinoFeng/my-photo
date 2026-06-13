import chokidar from 'chokidar';
import { db } from '../db';
import { sourceDirectory, media } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { queue } from '../instances/queue';
import { monitorService } from '../instances/sse';
import { scanDirectory } from '../utils/fileUtils';

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
    console.log(`[Watch] File added: ${filePath}`);
    monitorService.broadcast({ event: 'file-add', data: { filePath, sourceDirId } });
    try {
      await queue.enqueue('source-file-add', { 
        filePath, 
        sourceDirPath: watchPath 
      });
    } catch (error) {
      console.error('Error queueing added file:', error);
    }
  });

  watcher.on('change', async (filePath: string) => {
    console.log(`[Watch] File changed: ${filePath}`);
    monitorService.broadcast({ event: 'file-change', data: { filePath, sourceDirId } });
    try {
      await queue.enqueue('source-file-change', { 
        filePath, 
        sourceDirPath: watchPath 
      });
    } catch (error) {
      console.error('Error queueing changed file:', error);
    }
  });

  watcher.on('unlink', async (filePath: string) => {
    console.log(`[Watch] File removed: ${filePath}`);
    monitorService.broadcast({ event: 'file-remove', data: { filePath, sourceDirId } });
    try {
      await queue.enqueue('source-file-remove', { 
        filePath, 
        sourceDirPath: watchPath 
      });
    } catch (error) {
      console.error('Error queueing removed file:', error);
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
    console.log(`[Watch] Import file detected: ${filePath}`);
    monitorService.broadcast({ event: 'import-file-add', data: { filePath } });
    try {
      await queue.enqueue('import-file', { filePath });
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

interface ScanProgress {
  sourceDirId: string;
  sourceDirName: string;
  status: 'pending' | 'scanning' | 'completed' | 'error';
  totalFiles: number;
  processedFiles: number;
  error?: string;
}

const scanProgressMap = new Map<string, ScanProgress>();

export function getScanProgress(): Record<string, ScanProgress> {
  const result: Record<string, ScanProgress> = {};
  scanProgressMap.forEach((progress, id) => {
    result[id] = progress;
  });
  return result;
}

export async function startWatchersForAllSourceDirs(): Promise<void> {
  const dirs = await db.select().from(sourceDirectory).where(eq(sourceDirectory.enabled, true));

  for (const dir of dirs) {
    try {
      await startSourceDirWatcher(dir.id, dir.path);
      
      detectAndProcessNewFiles(dir.id, dir.path).catch(error => {
        console.error(`Error detecting files in ${dir.path}:`, error);
      });
    } catch (error) {
      console.error(`Failed to start watcher for ${dir.path}:`, error);
    }
  }
}

export async function detectAndProcessNewFiles(sourceDirId: string, watchPath: string): Promise<void> {
  const dirResult = await db.select({ name: sourceDirectory.name })
    .from(sourceDirectory).where(eq(sourceDirectory.id, sourceDirId));
  const dirName = dirResult[0]?.name || 'Unknown';

  scanProgressMap.set(sourceDirId, {
    sourceDirId,
    sourceDirName: dirName,
    status: 'scanning',
    totalFiles: 0,
    processedFiles: 0
  });

  try {
    const existingFiles = await db.select({ filepath: media.filepath })
      .from(media)
      .where(and(
        eq(media.sourceDirectoryId, sourceDirId),
        eq(media.status, 'active')
      ));
    
    const existingFilePaths = new Set(existingFiles.map(f => f.filepath));
    const currentFiles = await scanDirectory(watchPath);
    const newFiles = currentFiles.filter(filePath => !existingFilePaths.has(filePath));

    scanProgressMap.set(sourceDirId, {
      ...scanProgressMap.get(sourceDirId)!,
      totalFiles: newFiles.length
    });

    console.log(`[Detect] Found ${newFiles.length} new file(s) in ${watchPath}`);
    monitorService.broadcast({ 
      event: 'detect-new-files', 
      data: { sourceDirId, count: newFiles.length, path: watchPath } 
    });

    let processed = 0;
    for (const filePath of newFiles) {
      try {
        await queue.enqueue('source-file-add', { filePath, sourceDirPath: watchPath });
        processed++;
        scanProgressMap.set(sourceDirId, {
          ...scanProgressMap.get(sourceDirId)!,
          processedFiles: processed
        });
        console.log(`[Detect] Queued new file: ${filePath}`);
      } catch (error) {
        console.error(`Error queueing new file ${filePath}:`, error);
      }
    }

    scanProgressMap.set(sourceDirId, {
      ...scanProgressMap.get(sourceDirId)!,
      status: 'completed'
    });
    console.log(`[Detect] Completed scanning ${watchPath}`);
  } catch (error) {
    scanProgressMap.set(sourceDirId, {
      ...scanProgressMap.get(sourceDirId)!,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error(`Error detecting new files in ${watchPath}:`, error);
  }
}