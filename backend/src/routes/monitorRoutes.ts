import { Router } from 'express';
import { getWatcherStatus, getScanProgress } from '../services/fileWatcherService';
import { db } from '../db';
import { sourceDirectory, media } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  scanFanout,
  importFanout,
  exportFanout,
  sourceFileAddFanout,
  sourceFileChangeFanout,
  sourceFileRemoveFanout
} from '../instances/fanoutQueues';

const router: Router = Router();

const fanoutMap = [scanFanout, importFanout, exportFanout, sourceFileAddFanout, sourceFileChangeFanout, sourceFileRemoveFanout];

router.get('/status', async (_req, res) => {
  try {
    const watcherStatus = getWatcherStatus();
    
    const allTasks = await Promise.all(
      fanoutMap.map(async (fanout) => {
        const queue = fanout.getQueue(fanout.getQueueNames()[0]);
        return queue.getAllTasks();
      })
    );
    const tasks = allTasks.flat();
    const activeTasks = tasks.filter((t: { status: string }) => t.status === 'pending' || t.status === 'processing').length;
    
    const sourceDirsResult = await db.select().from(sourceDirectory);
    const sourceDirsCount = sourceDirsResult.length;
    
    const mediaResult = await db.select().from(media);
    const mediaCount = mediaResult.length;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      watchers: watcherStatus,
      tasks: {
        total: tasks.length,
        active: activeTasks
      },
      database: {
        sourceDirs: sourceDirsCount,
        media: mediaCount
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/watchers', async (_req, res) => {
  const status = getWatcherStatus();
  res.json(status);
});

router.get('/scan-progress', async (_req, res) => {
  const progress = getScanProgress();
  res.json(progress);
});

router.get('/stats', async (_req, res) => {
  try {
    const sourceDirs = await db.select().from(sourceDirectory);
    const mediaByDir = await Promise.all(sourceDirs.map(async dir => {
      const mediaResult = await db.select().from(media).where(eq(media.sourceDirectoryId, dir.id));
      return {
        id: dir.id,
        name: dir.name,
        path: dir.path,
        mediaCount: mediaResult.length
      };
    }));
    
    const totalMediaResult = await db.select().from(media);
    const totalMedia = totalMediaResult.length;
    
    const photosResult = await db.select().from(media).where(eq(media.fileType, 'photo'));
    const photosCount = photosResult.length;
    
    const videosResult = await db.select().from(media).where(eq(media.fileType, 'video'));
    const videosCount = videosResult.length;
    
    res.json({
      totalSourceDirs: sourceDirs.length,
      totalMedia,
      photos: photosCount,
      videos: videosCount,
      mediaByDirectory: mediaByDir
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
