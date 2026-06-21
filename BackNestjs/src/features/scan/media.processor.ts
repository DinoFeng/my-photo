import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service.js';
import { media } from '../../core/database/schema.js';
import { ScanPayload } from '../../core/queue/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WorkerResult {
  hash: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    make?: string;
    model?: string;
    dateTaken?: string;
    latitude?: number;
    longitude?: number;
  };
}

const MEDIA_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heif',
  '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v',
]);

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heif',
]);

@Injectable()
export class MediaProcessor {
  constructor(private dbService: DatabaseService) {}

  async processFile(payload: ScanPayload) {
    if (payload.type !== 'file') return;

    const ext = path.extname(payload.currentPath).toLowerCase();
    if (!MEDIA_EXTENSIONS.has(ext)) return;

    const db = this.dbService.getDb();

    try {
      const existing = await db
        .select({ id: media.id, hash: media.hash })
        .from(media)
        .where(eq(media.filepath, payload.currentPath))
        .limit(1);

      const stat = await fs.promises.stat(payload.currentPath);

      const workerResult = await this.processWithWorker(payload.currentPath);

      if (existing[0]?.hash === workerResult.hash) {
        return;
      }

      const fileType = IMAGE_EXTENSIONS.has(ext) ? 'image' : 'video';
      const filename = path.basename(payload.currentPath);
      const now = new Date().toISOString();

      const metadata = workerResult.metadata;

      const data = {
        sourcePath: payload.sourcePath,
        filename,
        filepath: payload.currentPath,
        fileSize: stat.size,
        fileType,
        hash: workerResult.hash,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        duration: metadata.duration ?? null,
        make: metadata.make ?? null,
        model: metadata.model ?? null,
        dateTaken: metadata.dateTaken ?? null,
        latitude: metadata.latitude ?? null,
        longitude: metadata.longitude ?? null,
        metadata: null,
        thumbnailPath: null,
        status: 'active',
        updatedAt: now,
      };

      if (existing[0]) {
        await db.update(media).set(data).where(eq(media.id, existing[0].id));
      } else {
        await db.insert(media).values({
          id: uuidv4(),
          createdAt: now,
          ...data,
        });
      }

      console.log(`Processed: ${filename}`);
    } catch (err) {
      console.error(`Failed to process ${payload.currentPath}:`, err instanceof Error ? err.message : String(err));
    }
  }

  private processWithWorker(filePath: string): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'media.worker.js');
      const worker = new Worker(workerPath);

      worker.on('message', (result: WorkerResult & { error?: string }) => {
        if (result.error) reject(new Error(result.error));
        else resolve({ hash: result.hash, metadata: result.metadata });
      });

      worker.on('error', reject);

      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });

      worker.postMessage({ filePath });
    });
  }
}