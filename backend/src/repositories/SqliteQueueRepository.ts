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
    await this.client.execute(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON ${this.tableName}(status)`);
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
    const t0 = Date.now();
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
    const elapsed = Date.now() - t0;
    if (elapsed > 100) {
      this.logger?.warn(`Slow enqueue: ${elapsed}ms`);
    }
  }

  async updateTask(id: string, obj: Partial<Task<HandlerMap>>): Promise<Task<HandlerMap> | undefined> {
    await this.ensureInitialized();

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

    const sql = `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ? RETURNING *`;
    const result = await this.client.execute({ sql, args });
    if (result.rows.length === 0) return undefined;
    return this.rowToTask(result.rows[0]);
  }

  async deleteTask(id: string, hardDelete?: boolean): Promise<Task<HandlerMap> | undefined> {
    await this.ensureInitialized();

    if (hardDelete) {
      const result = await this.client.execute({
        sql: `DELETE FROM ${this.tableName} WHERE id = ? RETURNING *`,
        args: [id]
      });
      if (result.rows.length === 0) return undefined;
      return this.rowToTask(result.rows[0]);
    } else {
      return this.updateTask(id, { status: 'deleted' });
    }
  }

  async dequeue(): Promise<Task<HandlerMap> | null> {
    await this.ensureInitialized();
    if (this.dequeueLock) return null;
    this.dequeueLock = true;
    const t0 = Date.now();

    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY priority DESC, createdAt ASC LIMIT 1`;
      const result = await this.client.execute({ sql, args: ['pending'] });
      if (result.rows.length === 0) return null;

      const taskToProcess = this.rowToTask(result.rows[0]);
      taskToProcess.status = 'processing';
      await this.updateTask(taskToProcess.id, { status: 'processing' });
      const elapsed = Date.now() - t0;
      if (elapsed > 100) {
        this.logger?.warn(`Slow dequeue: ${elapsed}ms`);
      }
      return taskToProcess;
    } finally {
      this.dequeueLock = false;
    }
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
}