import { Router, Request, Response } from 'express';
import { queue, queueService, consumerManager } from '../instances/queue';

const router: Router = Router();

router.get('/status', async (req: Request, res: Response) => {
  try {
    const statuses = await queue.getAllQueueStatuses();
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/status/:queueName', async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const status = await queue.getQueueStatus(queueName);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    let tasks;
    if (type) {
      tasks = await queue.getTasksByType(type as string);
    } else {
      tasks = await queue.getAllTasks();
    }
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = await queue.getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/config', async (req: Request, res: Response) => {
  try {
    const configs = await queueService.getAllQueueConfigs();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/config/:queueName', async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const config = await queueService.getQueueConfig(queueName);
    if (!config) {
      return res.status(404).json({ error: 'Queue config not found' });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.put('/config/:queueName', async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const updates = req.body;
    
    await queueService.updateQueueConfig(queueName, updates);
    
    if (updates.consumerCount !== undefined) {
      await queue.scaleQueue(queueName, updates.consumerCount);
    }
    
    res.json({ message: 'Queue config updated successfully' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/scale/:queueName', async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const { consumerCount } = req.body;
    
    await queue.scaleQueue(queueName, consumerCount);
    
    res.json({ message: `Scaled queue ${queueName} to ${consumerCount} consumers` });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const { days } = req.body;
    await queueService.cleanupOldTasks(days || 7);
    res.json({ message: 'Old tasks cleaned up successfully' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
