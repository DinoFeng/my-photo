import { MessageQueue } from '../utils/queue';

export const messageQueue = new MessageQueue();

export const queue = {
  enqueue: async (type: string, payload: Record<string, unknown>): Promise<string> => {
    return messageQueue.publish(type, payload);
  },

  getTask: async (id: string) => {
    return messageQueue.getJob(id);
  },

  getAllTasks: async () => {
    return messageQueue.getAllJobs();
  },

  removeTask: async (id: string): Promise<boolean> => {
    return messageQueue.removeJob(id);
  },

  bindConsumer: (queueName: string, handler: (payload: any) => Promise<void>) => {
    messageQueue.bindConsumer(queueName, handler);
  }
};