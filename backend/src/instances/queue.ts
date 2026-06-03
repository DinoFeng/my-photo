import { queueService } from '../services/queueService';
import { consumerManager } from '../services/consumerManager';

export const queue = {
  enqueue: async (type: string, payload: Record<string, unknown>): Promise<string> => {
    return queueService.enqueue(type, payload);
  },

  getTask: async (id: string) => {
    return queueService.getTask(id);
  },

  getAllTasks: async () => {
    return queueService.getAllTasks();
  },

  getTasksByType: async (type: string) => {
    return queueService.getTasksByType(type);
  },

  bindConsumer: (queueName: string, handler: (payload: any) => Promise<void>) => {
    consumerManager.registerQueue(queueName, handler);
  },

  bindConsumers: (queueName: string, handler: (payload: any) => Promise<void>, count: number = 1) => {
    consumerManager.registerQueue(queueName, handler, { consumerCount: count });
  },

  getQueueStatus: async (queueName: string) => {
    return consumerManager.getQueueStatus(queueName);
  },

  getAllQueueStatuses: async () => {
    return queueService.getAllQueueStatuses();
  },

  scaleQueue: async (queueName: string, consumerCount: number) => {
    return consumerManager.scaleQueue(queueName, consumerCount);
  }
};

export { queueService, consumerManager };
