import { db } from '../db';
import { taskQueue, queueConfig } from '../db/schema';
import { eq, and, lt, desc, asc, count, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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

export class QueueService {
  async enqueue(type: string, payload: Record<string, unknown>): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.insert(taskQueue).values({
      id,
      type,
      payload: JSON.stringify(payload),
      createdAt: now,
      updatedAt: now
    });

    return id;
  }

  async dequeue(type: string, consumerId: string): Promise<Task | null> {
    const now = new Date().toISOString();

    const result = await db.transaction(async (tx) => {
      const tasks = await tx.select()
        .from(taskQueue)
        .where(and(
          eq(taskQueue.type, type),
          eq(taskQueue.status, 'pending')
        ))
        .orderBy(desc(taskQueue.priority), asc(taskQueue.createdAt))
        .limit(1);

      if (tasks.length === 0) {
        return null;
      }

      const task = tasks[0];

      await tx.update(taskQueue)
        .set({
          status: 'running',
          consumerId,
          updatedAt: now
        })
        .where(eq(taskQueue.id, task.id));

      return task;
    });

    if (!result) {
      return null;
    }

    return this.mapRowToTask(result);
  }

  private mapRowToTask(row: typeof taskQueue.$inferSelect): Task {
    return {
      id: row.id,
      type: row.type,
      payload: JSON.parse(row.payload),
      status: (row.status || 'pending') as TaskStatus,
      consumerId: row.consumerId || undefined,
      retryCount: row.retryCount || 0,
      maxRetries: row.maxRetries || 3,
      priority: row.priority || 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async markAsDone(taskId: string): Promise<void> {
    await db.update(taskQueue)
      .set({
        status: 'done',
        updatedAt: new Date().toISOString()
      })
      .where(eq(taskQueue.id, taskId));
  }

  async markAsFailed(taskId: string): Promise<void> {
    const task = await db.select({ retryCount: taskQueue.retryCount, maxRetries: taskQueue.maxRetries })
      .from(taskQueue)
      .where(eq(taskQueue.id, taskId));

    if (task.length === 0) {
      return;
    }

    const row = task[0];
    const retryCount = row.retryCount ?? 0;
    const maxRetries = row.maxRetries ?? 3;

    if (retryCount < maxRetries) {
      await db.update(taskQueue)
        .set({
          retryCount: retryCount + 1,
          status: 'pending',
          consumerId: null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(taskQueue.id, taskId));
    } else {
      await db.update(taskQueue)
        .set({
          status: 'failed',
          updatedAt: new Date().toISOString()
        })
        .where(eq(taskQueue.id, taskId));
    }
  }

  async getTask(taskId: string): Promise<Task | null> {
    const tasks = await db.select()
      .from(taskQueue)
      .where(eq(taskQueue.id, taskId));

    if (tasks.length === 0) {
      return null;
    }

    return this.mapRowToTask(tasks[0]);
  }

  async getTasksByType(type: string): Promise<Task[]> {
    const tasks = await db.select()
      .from(taskQueue)
      .where(eq(taskQueue.type, type));

    return tasks.map(t => this.mapRowToTask(t));
  }

  async getAllTasks(): Promise<Task[]> {
    const tasks = await db.select().from(taskQueue);

    return tasks.map(t => this.mapRowToTask(t));
  }

  async getQueueStatus(type: string): Promise<QueueStatus> {
    const statuses = await db.select({
      status: taskQueue.status,
      count: sql<number>`COUNT(${taskQueue.id})`
    })
      .from(taskQueue)
      .where(eq(taskQueue.type, type))
      .groupBy(taskQueue.status);

    const config = await this.getQueueConfig(type);

    const statusMap: Record<string, number> = {};
    statuses.forEach(s => {
      const statusKey = s.status || 'pending';
      statusMap[statusKey] = Number(s.count);
    });

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
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    await db.delete(taskQueue)
      .where(and(
        eq(taskQueue.status, 'done'),
        lt(taskQueue.updatedAt, cutoff)
      ));
  }
}

export const queueService = new QueueService();
