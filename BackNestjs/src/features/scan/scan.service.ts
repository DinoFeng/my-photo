import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { v4 as uuidv4 } from 'uuid';
import { eq, like, sql } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service.js';
import { scanCheckpoint, media } from '../../core/database/schema.js';
import { QueueService, ScanPayload } from '../../core/queue/queue.service.js';

const MEDIA_PATH = process.env.MEDIA_PATH || './media';
const PUBLISH_BATCH = 50;

@Injectable()
export class ScanService {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();

  constructor(
    private dbService: DatabaseService,
    private queueService: QueueService,
  ) {}

  async start() {
    console.log('Starting directory watchers...');
    const subDirs = await this.getMediaSubDirectories();
    if (subDirs.length === 0) {
      console.warn('No media subdirectories found');
      return;
    }
    console.log(`Media subdirectories: ${subDirs.length}`);

    for (const dirPath of subDirs) {
      this.createWatcher(dirPath);
    }

    await this.scanKnownDirectories();

    console.log('Scanning new directories...');
    for (const dirPath of subDirs) {
      await this.scanDirectory(dirPath);
    }

    console.log('Media directory scan complete');
  }

  private async getMediaSubDirectories(): Promise<string[]> {
    try {
      const entries = await fs.promises.readdir(MEDIA_PATH, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
        .map((entry) => path.join(MEDIA_PATH, entry.name));
    } catch {
      return [];
    }
  }

  private createWatcher(dirPath: string) {
    const watcher = chokidar.watch(dirPath, {
      ignoreInitial: true,
      persistent: true,
    });

    watcher.on('add', (filePath) => {
      this.queueService.publish('file', {
        currentPath: filePath,
        type: 'file',
        sourcePath: dirPath,
      });
    });

    watcher.on('addDir', (dir) => {
      this.queueService.publish('folder', {
        currentPath: dir,
        type: 'directory',
        sourcePath: dirPath,
      });
    });

    watcher.on('change', (filePath) => {
      this.queueService.publish('file', {
        currentPath: filePath,
        type: 'file',
        sourcePath: dirPath,
      });
    });

    watcher.on('unlink', (filePath) => {
      this.deleteFileRecord(filePath);
    });

    watcher.on('unlinkDir', (dir) => {
      this.deleteDirectoryRecords(dir);
    });

    this.watchers.set(dirPath, watcher);
    console.log(`Watcher started: ${dirPath}`);
  }

  private async scanKnownDirectories() {
    const db = this.dbService.getDb();
    const records = await db.select().from(scanCheckpoint).all();

    for (const record of records) {
      await this.scanDirectory(record.path);
    }
  }

  private async hasDirectoryChanged(dirPath: string): Promise<{ changed: boolean; exists: boolean }> {
    try {
      const stat = await fs.promises.stat(dirPath);
      const currentMtime = stat.mtimeMs;

      const db = this.dbService.getDb();
      const records = await db
        .select()
        .from(scanCheckpoint)
        .where(eq(scanCheckpoint.path, dirPath))
        .limit(1);

      const record = records[0];
      if (!record || record.lastScannedMtime === null) {
        return { changed: true, exists: true };
      }

      return { changed: currentMtime > record.lastScannedMtime, exists: true };
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return { changed: false, exists: false };
      }
      throw err;
    }
  }

  async scanDirectory(dirPath: string): Promise<boolean> {
    const { changed, exists } = await this.hasDirectoryChanged(dirPath);

    if (!exists) {
      console.log(`Directory removed, cleaning up: ${dirPath}`);
      await this.deleteDirectoryRecords(dirPath);
      return false;
    }

    if (!changed) {
      return false;
    }

    console.log(`Scanning directory: ${dirPath}`);
    await this.processDirectory(dirPath);
    return true;
  }

  async processDirectory(dirPath: string) {
    const db = this.dbService.getDb();
    const now = new Date().toISOString();

    const existing = await db
      .select()
      .from(scanCheckpoint)
      .where(eq(scanCheckpoint.path, dirPath))
      .limit(1);

    if (existing.length === 0) {
      const relativePath = path.relative(MEDIA_PATH, dirPath);
      const isRoot = relativePath !== '' && !relativePath.includes(path.sep);

      await db.insert(scanCheckpoint).values({
        id: uuidv4(),
        path: dirPath,
        isRoot,
        status: 'scanning',
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await db
        .update(scanCheckpoint)
        .set({ status: 'scanning', updatedAt: now })
        .where(eq(scanCheckpoint.path, dirPath));
    }

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const payloads: ScanPayload[] = entries.map((entry) => ({
        currentPath: path.join(dirPath, entry.name),
        type: entry.isDirectory() ? 'directory' : 'file',
        sourcePath: dirPath,
      }));

      for (let i = 0; i < payloads.length; i += PUBLISH_BATCH) {
        const batch = payloads.slice(i, i + PUBLISH_BATCH);
        await Promise.all(
          batch.map((p) =>
            p.type === 'directory'
              ? this.queueService.publish('folder', p)
              : this.queueService.publish('file', p),
          ),
        );
      }

      const stat = await fs.promises.stat(dirPath);
      await db
        .update(scanCheckpoint)
        .set({
          lastScannedMtime: stat.mtimeMs,
          status: 'completed',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(scanCheckpoint.path, dirPath));

      console.log(`Directory processed: ${dirPath} (${payloads.length} items)`);
    } catch (err) {
      await db
        .update(scanCheckpoint)
        .set({
          status: 'error',
          errorCount: (existing[0]?.errorCount ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(scanCheckpoint.path, dirPath));

      console.error(`Failed to process directory: ${dirPath}`, err);
    }
  }

  private async deleteDirectoryRecords(dirPath: string) {
    const db = this.dbService.getDb();
    const likePath = `${dirPath}%`;

    await db.delete(media).where(like(media.filepath, likePath));
    await db.delete(scanCheckpoint).where(like(scanCheckpoint.path, likePath));

    console.log(`Cleaned up records for deleted directory: ${dirPath}`);
  }

  private async deleteFileRecord(filePath: string) {
    const db = this.dbService.getDb();
    await db.delete(media).where(eq(media.filepath, filePath));
    console.log(`Removed record for deleted file: ${filePath}`);
  }
}