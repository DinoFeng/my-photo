import { createClient, type Client } from '@libsql/client';
import type { QueueRepository, Task, HandlerMap, LoggerLike } from 'queue-manager-pro';
import { randomUUID } from 'crypto';

type EmitMethod = (event: string, ...args: any[]) => boolean;

export class SqliteQueueRepository implements QueueRepository {
  logger?: LoggerLike;
  emitEvent?: EmitMethod;
  MAX_RETRIES: number;
  MAX_PROCESSING_TIME: number;
  readonly id: string;
  private client: Client;
  private tableName: string;
  private dequeueLock: boolean = false;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(dbPath: string, tableName: string, maxRetries: number, maxProcessingTime: number) {
    this.MAX_RETRIES = maxRetries;
    this.MAX_PROCESSING_TIME = maxProcessingTime;
    this.id = randomUUID();
    this.tableName = tableName;
    this.client = createClient({ url: `file:${dbPath}` });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = this.doInit();
    }
    await this.initPromise;
    this.initialized = true;
  }

  private async doInit(): Promise<void> {
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        handler TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        log TEXT,
        retryCount INTEGER DEFAULT 0,
        maxRetries INTEGER NOT NULL,
        maxProcessingTime INTEGER NOT NULL,
        priority INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);
    await this.client.execute(`PRAGMA journal_mode = WAL`);
    await this.client.execute(`PRAGMA busy_timeout = 5000`);
  }

  async init(): Promise<void> {
    await this.ensureInitialized();
  }

  async loadTasks(status?: Task<HandlerMap>['status']): Promise<Task<HandlerMap>[]> {
    await this.ensureInitialized();
    const sql = status
      ? `SELECT * FROM ${this.tableName} WHERE status = ?`
      : `SELECT * FROM ${this.tableName}`;
    const args = status ? [status] : [];
    const result = await this.client.execute({ sql, args });

    return result.rows.map(row => this.rowToTask(row));
  }

  async saveTasks(tasks: Task<HandlerMap>[], _status?: Task<HandlerMap>['status']): Promise<Task<HandlerMap>[]> {
    await this.ensureInitialized();
    await this.client.execute(`DELETE FROM ${this.tableName}`);

    for (const task of tasks) {
      await this.enqueue(task);
    }
    return tasks;
  }

  async enqueue(task: Task<HandlerMap>): Promise<void> {
    await this.ensureInitialized();
    const sql = `
      INSERT INTO ${this.tableName} (id, handler, payload, status, log, retryCount, maxRetries, maxProcessingTime, priority, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.client.execute({
      sql,
      args: [
        task.id,
        task.handler,
        JSON.stringify(task.payload),
        task.status,
        task.log ?? null,
        task.retryCount,
        task.maxRetries,
        task.maxProcessingTime,
        task.priority,
        typeof task.createdAt === 'string' ? task.createdAt : task.createdAt.toISOString(),
        typeof task.updatedAt === 'string' ? task.updatedAt : task.updatedAt.toISOString(),
      ]
    });
  }

  async updateTask(id: string, obj: Partial<Task<HandlerMap>>): Promise<Task<HandlerMap> | undefined> {
    await this.ensureInitialized();
    const task = await this.getTaskById(id);
    if (!task) return undefined;

    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (key === 'payload') {
        updates.push(`${key} = ?`);
        args.push(JSON.stringify(value));
      } else if (key === 'createdAt' || key === 'updatedAt') {
        updates.push(`${key} = ?`);
        args.push(typeof value === 'string' ? value : (value as Date).toISOString());
      } else {
        updates.push(`${key} = ?`);
        args.push(value as string | number | null);
      }
    }

    updates.push('updatedAt = ?');
    args.push(new Date().toISOString());
    args.push(id);

    const sql = `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`;
    await this.client.execute({ sql, args });

    return this.getTaskById(id);
  }

  async deleteTask(id: string, hardDelete?: boolean): Promise<Task<HandlerMap> | undefined> {
    await this.ensureInitialized();
    const task = await this.getTaskById(id);
    if (!task) return undefined;

    if (hardDelete) {
      await this.client.execute({
        sql: `DELETE FROM ${this.tableName} WHERE id = ?`,
        args: [id]
      });
    } else {
      await this.updateTask(id, { status: 'deleted' });
    }
    return task;
  }

  async dequeue(): Promise<Task<HandlerMap> | null> {
    await this.ensureInitialized();
    if (this.dequeueLock) return null;
    this.dequeueLock = true;

    try {
      const tasks = await this.loadTasks();
      const taskToProcess = [...tasks]
        .sort((a, b) => b.priority - a.priority || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .find(t => t.status === 'pending');

      if (taskToProcess) {
        taskToProcess.status = 'processing';
        await this.updateTask(taskToProcess.id, { status: 'processing' });
        return taskToProcess;
      } else {
        await this.checkAndHandleStuckTasks(tasks);
        return null;
      }
    } finally {
      this.dequeueLock = false;
    }
  }

  private async getTaskById(id: string): Promise<Task<HandlerMap> | undefined> {
    const result = await this.client.execute({
      sql: `SELECT * FROM ${this.tableName} WHERE id = ?`,
      args: [id]
    });
    if (result.rows.length === 0) return undefined;
    return this.rowToTask(result.rows[0]);
  }

  private rowToTask(row: Record<string, unknown>): Task<HandlerMap> {
    return {
      id: row.id as string,
      handler: row.handler as string,
      payload: JSON.parse(row.payload as string),
      status: row.status as Task<HandlerMap>['status'],
      log: row.log as string | undefined,
      retryCount: row.retryCount as number,
      maxRetries: row.maxRetries as number,
      maxProcessingTime: row.maxProcessingTime as number,
      priority: row.priority as number,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
    };
  }

  private async checkAndHandleStuckTasks(tasks: Task<HandlerMap>[]): Promise<void> {
    const now = Date.now();
    for (const task of tasks) {
      if (task.status !== 'processing') continue;

      const elapsed = now - new Date(task.updatedAt).getTime();
      this.logger?.info(`Checking task ${task.id} status: elapsed time ${elapsed / 1000}s`);

      const maxProcessingTime = task.maxProcessingTime ?? this.MAX_PROCESSING_TIME;
      if (elapsed > maxProcessingTime) {
        this.emitEvent?.('taskStuck', task);
        this.logger?.warn(`Task ${task.id} is stuck`);

        const maxRetries = task.maxRetries ?? this.MAX_RETRIES;
        if (task.retryCount < maxRetries) {
          this.logger?.warn(`Retrying task ${task.id} (${task.retryCount + 1}/${maxRetries})`);
          await this.updateTask(task.id, { retryCount: task.retryCount + 1, status: 'pending' });
          this.emitEvent?.('taskRetried', task);
        } else {
          const error = `Task ${task.id} failed after ${maxRetries} retries`;
          this.emitEvent?.('taskFailed', task, new Error(error));
          this.logger?.error(error);
          await this.updateTask(task.id, { status: 'failed' });
        }
      }
    }
  }
}