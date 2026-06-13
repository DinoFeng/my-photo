import { Router, Request, Response } from 'express';
import {
  scanFanout,
  importFanout,
  exportFanout,
  sourceFileAddFanout,
  sourceFileChangeFanout,
  sourceFileRemoveFanout
} from '../instances/fanoutQueues';

const router: Router = Router();

interface TaskStatus {
  status: string;
}

const fanoutMap: Record<string, typeof scanFanout> = {
  'scan': scanFanout,
  'import-file': importFanout,
  'export': exportFanout,
  'source-file-add': sourceFileAddFanout,
  'source-file-change': sourceFileChangeFanout,
  'source-file-remove': sourceFileRemoveFanout
};

router.get('/status', async (req: Request, res: Response) => {
  try {
    const statuses = await Promise.all(
      Object.entries(fanoutMap).map(async ([name, fanout]) => {
        const queue = fanout.getQueue(fanout.getQueueNames()[0]);
        const tasks = await queue.getAllTasks();
        return {
          name,
          queues: fanout.getQueueNames(),
          pending: tasks.filter((t: TaskStatus) => t.status === 'pending').length,
          processing: tasks.filter((t: TaskStatus) => t.status === 'processing').length,
          completed: tasks.filter((t: TaskStatus) => t.status === 'done').length,
          failed: tasks.filter((t: TaskStatus) => t.status === 'failed').length
        };
      })
    );
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    if (type && fanoutMap[type as string]) {
      const fanout = fanoutMap[type as string];
      const queue = fanout.getQueue(fanout.getQueueNames()[0]);
      const tasks = await queue.getAllTasks();
      res.json(tasks);
    } else {
      const allTasks = await Promise.all(
        Object.values(fanoutMap).map(async (fanout) => {
          const queue = fanout.getQueue(fanout.getQueueNames()[0]);
          return queue.getAllTasks();
        })
      );
      res.json(allTasks.flat());
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
