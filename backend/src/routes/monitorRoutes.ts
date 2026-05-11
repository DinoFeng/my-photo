import { Router } from 'express';
import { getWatcherStatus } from '../services/fileWatcherService';
import { queueService } from '../services/queueService';
import { prisma } from '../server';
const router: Router = Router();
router.get('/status', async (_req, res) => {
  try {
    const watcherStatus = getWatcherStatus();
    const tasks = await queueService.getAllTasks();
    const activeTasks = tasks.filter((t: { status: string }) => t.status === 'pending' || t.status === 'running').length;
    const sourceDirs = await prisma.sourceDirectory.count();
    const mediaCount = await prisma.media.count();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      watchers: watcherStatus,
      tasks: {
        total: tasks.length,
        active: activeTasks
      },
      database: {
        sourceDirs,
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

router.get('/stats', async (_req, res) => {
 try {
 const sourceDirs = await prisma.sourceDirectory.findMany();
 const mediaByDir = await Promise.all(sourceDirs.map(async dir => {
 const count = await prisma.media.count({
 where: { sourceDirectoryId: dir.id }
 });
 return {
 id: dir.id,
 name: dir.name,
 path: dir.path,
 mediaCount: count
 };
 }));
 const totalMedia = await prisma.media.count();
 const photosCount = await prisma.media.count({ where: { fileType: 'photo' } });
 const videosCount = await prisma.media.count({ where: { fileType: 'video' } });
 res.json({
 totalSourceDirs: sourceDirs.length,
 totalMedia,
 photos: photosCount,
 videos: videosCount,
 mediaByDirectory: mediaByDir
 });
 }
 catch (error) {
 res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
 }
});
export default router;