import { db } from '../db';
import { queueConfig } from '../db/schema';
import { eq, count, sql } from 'drizzle-orm';
import { getProcessor } from './queueProcessors';
import { defaultStorage } from './queueStorage';
import type { QueueStorage, Task as StorageTask } from './queueStorage';

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed';

export interface Task {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: TaskStatus;
  consumerId?: string;
  retryCount: number;
  maxRetries: number;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueueConfig {
  name: string;
  consumerCount: number;
  enabled: boolean;
  pollingInterval: number;
  maxConcurrentTasks: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueueStatus {
  name: string;
  pendingCount: number;
  runningCount: number;
  doneCount: number;
  failedCount: number;
  consumerCount: number;
}

export interface EnqueueResult {
  isNew: boolean;
  taskId: string;
}

export class QueueService {
  constructor(private storage: QueueStorage = defaultStorage) {}

  async enqueue(type: string, payload: Record<string, unknown>): Promise<EnqueueResult> {
    const processor = getProcessor(type);
    return processor.enqueue(type, payload);
  }

  async dequeue(type: string, consumerId: string): Promise<Task | null> {
    const result = await this.storage.dequeue(type, consumerId);
    if (!result) return null;
    return this.convertTask(result);
  }

  private convertTask(task: StorageTask): Task {
    return {
      id: task.id,
      type: task.type,
      payload: task.payload,
      status: task.status,
      consumerId: task.consumerId,
      retryCount: task.retryCount,
      maxRetries: task.maxRetries,
      priority: task.priority,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };
  }

  async markAsDone(taskId: string): Promise<void> {
    await this.storage.markAsDone(taskId);
  }

  async markAsFailed(taskId: string): Promise<void> {
    await this.storage.markAsFailed(taskId);
  }

  async getTask(taskId: string): Promise<Task | null> {
    const result = await this.storage.getTask(taskId);
    if (!result) return null;
    return this.convertTask(result);
  }

  async getTasksByType(type: string): Promise<Task[]> {
    const tasks = await this.storage.getTasksByType(type);
    return tasks.map(t => this.convertTask(t));
  }

  async getAllTasks(): Promise<Task[]> {
    const tasks = await this.storage.getAllTasks();
    return tasks.map(t => this.convertTask(t));
  }

  async getQueueStatus(type: string): Promise<QueueStatus> {
    const tasks = await this.storage.getTasksByType(type);
    
    const statusMap: Record<string, number> = {
      pending: 0,
      running: 0,
      done: 0,
      failed: 0
    };
    
    tasks.forEach(task => {
      statusMap[task.status]++;
    });

    const config = await this.getQueueConfig(type);

    return {
      name: type,
      pendingCount: statusMap['pending'] || 0,
      runningCount: statusMap['running'] || 0,
      doneCount: statusMap['done'] || 0,
      failedCount: statusMap['failed'] || 0,
      consumerCount: config?.consumerCount || 1
    };
  }

  async getAllQueueStatuses(): Promise<QueueStatus[]> {
    const allTasks = await this.getAllTasks();
    const types = [...new Set(allTasks.map(t => t.type))];

    const statuses: QueueStatus[] = [];
    for (const type of types) {
      const status = await this.getQueueStatus(type);
      statuses.push(status);
    }

    return statuses;
  }

  async createQueueConfig(config: Omit<QueueConfig, 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString();

    await db.insert(queueConfig).values({
      ...config,
      createdAt: now,
      updatedAt: now
    }).onConflictDoUpdate({
      target: queueConfig.name,
      set: {
        consumerCount: config.consumerCount,
        enabled: config.enabled,
        pollingInterval: config.pollingInterval,
        maxConcurrentTasks: config.maxConcurrentTasks,
        updatedAt: now
      }
    });
  }

  async getQueueConfig(name: string): Promise<QueueConfig | null> {
    const configs = await db.select()
      .from(queueConfig)
      .where(eq(queueConfig.name, name));

    if (configs.length === 0) {
      return null;
    }

    const config = configs[0];
    return {
      name: config.name,
      consumerCount: config.consumerCount ?? 1,
      enabled: config.enabled ?? false,
      pollingInterval: config.pollingInterval ?? 1000,
      maxConcurrentTasks: config.maxConcurrentTasks ?? 10,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    };
  }

  async getAllQueueConfigs(): Promise<QueueConfig[]> {
    const configs = await db.select().from(queueConfig);

    return configs.map(config => ({
      name: config.name,
      consumerCount: config.consumerCount ?? 1,
      enabled: config.enabled ?? false,
      pollingInterval: config.pollingInterval ?? 1000,
      maxConcurrentTasks: config.maxConcurrentTasks ?? 10,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    }));
  }

  async updateQueueConfig(name: string, updates: Partial<QueueConfig>): Promise<void> {
    await db.update(queueConfig)
      .set({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .where(eq(queueConfig.name, name));
  }

  async deleteQueueConfig(name: string): Promise<void> {
    await db.delete(queueConfig)
      .where(eq(queueConfig.name, name));
  }

  async cleanupOldTasks(days: number = 7): Promise<void> {
    await this.storage.cleanupOldTasks(days);
  }
}

export const queueService = new QueueService();