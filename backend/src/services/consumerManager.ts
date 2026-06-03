import { queueService, type Task } from './queueService';

export type TaskHandler = (payload: Record<string, unknown>) => Promise<void>;

interface Consumer {
  id: string;
  queueType: string;
  handler: TaskHandler;
  intervalId: NodeJS.Timeout;
  running: boolean;
}

interface RegisteredQueue {
  type: string;
  handler: TaskHandler;
  consumerCount: number;
  pollingInterval: number;
  consumers: Consumer[];
}

export class ConsumerManager {
  private registeredQueues: Map<string, RegisteredQueue> = new Map();

  async registerQueue(
    queueType: string,
    handler: TaskHandler,
    options: {
      consumerCount?: number;
      pollingInterval?: number;
    } = {}
  ): Promise<void> {
    const consumerCount = options.consumerCount || 1;
    const pollingInterval = options.pollingInterval || 1000;

    await queueService.createQueueConfig({
      name: queueType,
      consumerCount,
      enabled: true,
      pollingInterval,
      maxConcurrentTasks: consumerCount * 2
    });

    const consumers: Consumer[] = [];
    for (let i = 0; i < consumerCount; i++) {
      const consumer = this.createConsumer(queueType, handler, pollingInterval, i);
      consumers.push(consumer);
    }

    this.registeredQueues.set(queueType, {
      type: queueType,
      handler,
      consumerCount,
      pollingInterval,
      consumers
    });

    console.log(`[ConsumerManager] Registered queue: ${queueType} with ${consumerCount} consumers`);
  }

  private createConsumer(
    queueType: string,
    handler: TaskHandler,
    pollingInterval: number,
    index: number
  ): Consumer {
    const consumerId = `${queueType}-consumer-${index}`;

    const intervalId = setInterval(async () => {
      await this.processTask(queueType, consumerId, handler);
    }, pollingInterval);

    return {
      id: consumerId,
      queueType,
      handler,
      intervalId,
      running: true
    };
  }

  private async processTask(queueType: string, consumerId: string, handler: TaskHandler): Promise<void> {
    try {
      const task = await queueService.dequeue(queueType, consumerId);

      if (!task) {
        return;
      }

      console.log(`[Consumer ${consumerId}] Processing task: ${task.id}`);

      try {
        await handler(task.payload);
        await queueService.markAsDone(task.id);
        console.log(`[Consumer ${consumerId}] Completed task: ${task.id}`);
      } catch (error) {
        console.error(`[Consumer ${consumerId}] Failed task: ${task.id}`, error);
        await queueService.markAsFailed(task.id);
      }
    } catch (error) {
      console.error(`[Consumer ${consumerId}] Error dequeuing task`, error);
    }
  }

  async startQueue(queueType: string): Promise<void> {
    const queue = this.registeredQueues.get(queueType);
    if (!queue) {
      throw new Error(`Queue not registered: ${queueType}`);
    }

    for (const consumer of queue.consumers) {
      if (!consumer.running) {
        consumer.intervalId = setInterval(async () => {
          await this.processTask(queueType, consumer.id, queue.handler);
        }, queue.pollingInterval);
        consumer.running = true;
      }
    }

    console.log(`[ConsumerManager] Started queue: ${queueType}`);
  }

  async stopQueue(queueType: string): Promise<void> {
    const queue = this.registeredQueues.get(queueType);
    if (!queue) {
      throw new Error(`Queue not registered: ${queueType}`);
    }

    for (const consumer of queue.consumers) {
      if (consumer.running) {
        clearInterval(consumer.intervalId);
        consumer.running = false;
      }
    }

    console.log(`[ConsumerManager] Stopped queue: ${queueType}`);
  }

  async scaleQueue(queueType: string, newConsumerCount: number): Promise<void> {
    const queue = this.registeredQueues.get(queueType);
    if (!queue) {
      throw new Error(`Queue not registered: ${queueType}`);
    }

    const currentCount = queue.consumers.length;

    if (newConsumerCount > currentCount) {
      for (let i = currentCount; i < newConsumerCount; i++) {
        const consumer = this.createConsumer(queueType, queue.handler, queue.pollingInterval, i);
        queue.consumers.push(consumer);
      }
    } else if (newConsumerCount < currentCount) {
      const toRemove = queue.consumers.splice(newConsumerCount);
      for (const consumer of toRemove) {
        if (consumer.running) {
          clearInterval(consumer.intervalId);
        }
      }
    }

    queue.consumerCount = newConsumerCount;

    await queueService.updateQueueConfig(queueType, { consumerCount: newConsumerCount });

    console.log(`[ConsumerManager] Scaled queue ${queueType} to ${newConsumerCount} consumers`);
  }

  async getQueueStatus(queueType: string) {
    const queue = this.registeredQueues.get(queueType);
    if (!queue) {
      throw new Error(`Queue not registered: ${queueType}`);
    }

    const dbStatus = await queueService.getQueueStatus(queueType);

    return {
      ...dbStatus,
      runningConsumers: queue.consumers.filter(c => c.running).length
    };
  }

  getAllRegisteredQueues(): RegisteredQueue[] {
    return Array.from(this.registeredQueues.values());
  }

  async shutdown(): Promise<void> {
    for (const queueType of this.registeredQueues.keys()) {
      await this.stopQueue(queueType);
    }
    this.registeredQueues.clear();
    console.log('[ConsumerManager] All queues stopped');
  }
}

export const consumerManager = new ConsumerManager();
