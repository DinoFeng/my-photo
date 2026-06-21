import { Injectable } from '@nestjs/common';
import { ScanPayload } from './types.js';

interface QueueItem {
  id: string;
  payload: ScanPayload;
  retries: number;
  createdAt: number;
}

type Handler = (payload: ScanPayload) => Promise<void>;

@Injectable()
export class QueueService {
  private queues: Map<string, QueueItem[]> = new Map();
  private handlers: Map<string, Handler> = new Map();
  private concurrency: Map<string, number> = new Map();
  private running: Map<string, number> = new Map();

  register(name: string, handler: Handler, concurrency = 3) {
    this.queues.set(name, []);
    this.handlers.set(name, handler);
    this.concurrency.set(name, concurrency);
    this.running.set(name, 0);
    console.log(`Queue registered: ${name}`);
  }

  async publish(name: string, payload: ScanPayload) {
    const queue = this.queues.get(name);
    if (!queue) {
      console.warn(`Queue "${name}" not registered`);
      return;
    }

    queue.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      payload,
      retries: 0,
      createdAt: Date.now(),
    });

    setImmediate(() => this.runQueue(name));
  }

  private async runQueue(name: string) {
    const queue = this.queues.get(name);
    const handler = this.handlers.get(name);
    const concurrency = this.concurrency.get(name) || 3;
    const currentRunning = this.running.get(name) || 0;

    if (!queue || !handler) return;
    if (currentRunning >= concurrency) return;

    const item = queue.shift();
    if (!item) return;

    this.running.set(name, currentRunning + 1);

    try {
      await handler(item.payload);
    } catch (err) {
      console.error(`Queue ${name} error:`, err instanceof Error ? err.message : String(err));
      if (item.retries < 3) {
        item.retries++;
        queue.push(item);
      }
    } finally {
      const stillRunning = (this.running.get(name) || 1) - 1;
      this.running.set(name, Math.max(0, stillRunning));
      setImmediate(() => this.runQueue(name));
    }
  }
}