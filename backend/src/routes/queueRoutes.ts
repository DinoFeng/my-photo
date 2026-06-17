import { Router, Request, Response } from 'express';
import { folderFanout, fileFanout } from '../instances/fanoutQueues';

const router: Router = Router();

interface TaskStatus {
  status: string;
}

async function getFanoutStatus(fanout: typeof folderFanout) {
  const queueNames = fanout.getQueueNames();
  const queue = fanout.getQueue(queueNames[0]);
  const tasks = await queue.getAllTasks();
  return {
    name: 'scan',
    queues: queueNames,
    pending: tasks.filter((t: TaskStatus) => t.status === 'pending').length,
    processing: tasks.filter((t: TaskStatus) => t.status === 'processing').length,
    completed: tasks.filter((t: TaskStatus) => t.status === 'done').length,
    failed: tasks.filter((t: TaskStatus) => t.status === 'failed').length
  };
}

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const [folderStatus, fileStatus] = await Promise.all([
      getFanoutStatus(folderFanout),
      getFanoutStatus(fileFanout)
    ]);
    res.json([folderStatus, fileStatus]);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const folderQueue = folderFanout.getQueue(folderFanout.getQueueNames()[0]);
    const fileQueue = fileFanout.getQueue(fileFanout.getQueueNames()[0]);
    const [folderTasks, fileTasks] = await Promise.all([
      folderQueue.getAllTasks(),
      fileQueue.getAllTasks()
    ]);
    res.json({ folder: folderTasks, file: fileTasks });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;