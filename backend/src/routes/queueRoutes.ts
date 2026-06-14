import { Router, Request, Response } from 'express';
import { scanFanout } from '../instances/fanoutQueues';

const router: Router = Router();

interface TaskStatus {
  status: string;
}

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const queue = scanFanout.getQueue(scanFanout.getQueueNames()[0]);
    const tasks = await queue.getAllTasks();
    res.json([{
      name: 'scan',
      queues: scanFanout.getQueueNames(),
      pending: tasks.filter((t: TaskStatus) => t.status === 'pending').length,
      processing: tasks.filter((t: TaskStatus) => t.status === 'processing').length,
      completed: tasks.filter((t: TaskStatus) => t.status === 'done').length,
      failed: tasks.filter((t: TaskStatus) => t.status === 'failed').length
    }]);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const queue = scanFanout.getQueue(scanFanout.getQueueNames()[0]);
    const tasks = await queue.getAllTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;