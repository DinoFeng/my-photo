import { db } from '../db';
import { taskQueue, queueConfig } from '../db/schema';
import { eq, and, or, lt, desc, asc, count, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface Task {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'running' | 'done' | 'failed';
  consumerId?: string;
  retryCount: number;
  maxRetries: number;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueueResult {
  isNew: boolean;
  taskId: string;
}

export interface QueueStorage {
  enqueue(type: string, payload: Record<string, unknown>): Promise<EnqueueResult>;
  enqueueIfNotExists(type: string, payload: Record<string, unknown>): Promise<EnqueueResult>;
  dequeue(type: string, consumerId: string): Promise<Task | null>;
  markAsDone(taskId: string): Promise<void>;
  markAsFailed(taskId: string): Promise<void>;
  getTask(taskId: string): Promise<Task | null>;
  getTasksByType(type: string): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;
  cleanupOldTasks(days: number): Promise<void>;
}

export class DatabaseQueueStorage implements QueueStorage {
  private mapRowToTask(row: typeof taskQueue.$inferSelect): Task {
    return {
      id: row.id,
      type: row.type,
      payload: JSON.parse(row.payload),
      status: (row.status || 'pending') as Task['status'],
      consumerId: row.consumerId || undefined,
      retryCount: row.retryCount || 0,
      maxRetries: row.maxRetries || 3,
      priority: row.priority || 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async enqueue(type: string, payload: Record<string, unknown>): Promise<EnqueueResult> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.insert(taskQueue).values({
      id,
      type,
      payload: JSON.stringify(payload),
      createdAt: now,
      updatedAt: now
    });

    return { isNew: true, taskId: id };
  }

  async enqueueIfNotExists(type: string, payload: Record<string, unknown>): Promise<EnqueueResult> {
    const existing = await db.select({ id: taskQueue.id })
      .from(taskQueue)
      .where(and(
        eq(taskQueue.type, type),
        eq(taskQueue.payload, JSON.stringify(payload)),
        or(
          eq(taskQueue.status, 'pending'),
          eq(taskQueue.status, 'running')
        )
      ))
      .limit(1);

    if (existing.length > 0) {
      return { isNew: false, taskId: existing[0].id };
    }

    return this.enqueue(type, payload);
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

  async cleanupOldTasks(days: number = 7): Promise<void> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    await db.delete(taskQueue)
      .where(and(
        eq(taskQueue.status, 'done'),
        lt(taskQueue.updatedAt, cutoff)
      ));
  }
}

export class InMemoryQueueStorage implements QueueStorage {
  private tasks: Map<string, Task> = new Map();
  private idCounter = 0;

  async enqueue(type: string, payload: Record<string, unknown>): Promise<EnqueueResult> {
    const id = `task-${++this.idCounter}-${Date.now()}`;
    const now = new Date().toISOString();

    this.tasks.set(id, {
      id,
      type,
      payload,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      priority: 0,
      createdAt: now,
      updatedAt: now
    });

    return { isNew: true, taskId: id };
  }

  async enqueueIfNotExists(type: string, payload: Record<string, unknown>): Promise<EnqueueResult> {
    const payloadStr = JSON.stringify(payload);
    
    for (const [id, task] of this.tasks) {
      if (task.type === type && 
          JSON.stringify(task.payload) === payloadStr && 
          (task.status === 'pending' || task.status === 'running')) {
        return { isNew: false, taskId: id };
      }
    }

    return this.enqueue(type, payload);
  }

  async dequeue(type: string, consumerId: string): Promise<Task | null> {
    const pendingTasks = Array.from(this.tasks.values())
      .filter(t => t.type === type && t.status === 'pending')
      .sort((a, b) => b.priority - a.priority || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (pendingTasks.length === 0) {
      return null;
    }

    const task = pendingTasks[0];
    task.status = 'running';
    task.consumerId = consumerId;
    task.updatedAt = new Date().toISOString();

    return { ...task };
  }

  async markAsDone(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'done';
      task.updatedAt = new Date().toISOString();
    }
  }

  async markAsFailed(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = 'pending';
        task.consumerId = undefined;
      } else {
        task.status = 'failed';
      }
      task.updatedAt = new Date().toISOString();
    }
  }

  async getTask(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) || null;
  }

  async getTasksByType(type: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(t => t.type === type);
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async cleanupOldTasks(days: number): Promise<void> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    for (const [id, task] of this.tasks) {
      if (task.status === 'done' && task.updatedAt < cutoff) {
        this.tasks.delete(id);
      }
    }
  }
}

export type StorageType = 'database' | 'memory';

export interface QueueStorageConfig {
  type: StorageType;
}

export function createQueueStorage(config: QueueStorageConfig): QueueStorage {
  switch (config.type) {
    case 'database':
      return new DatabaseQueueStorage();
    case 'memory':
      return new InMemoryQueueStorage();
    default:
      throw new Error(`Unknown storage type: ${config.type}`);
  }
}

export const defaultStorage = new DatabaseQueueStorage();