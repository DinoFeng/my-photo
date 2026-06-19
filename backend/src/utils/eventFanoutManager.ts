import { QueueManager } from 'queue-manager-pro';
import type { SubscriberQueueConfig, QueueConfig, Handler, HandlerMap } from '../types/fanout';

export class EventFanoutManager<H extends HandlerMap = HandlerMap> {
    private queues: Map<string, QueueManager<H>> = new Map();
    private concurrencyMap: Map<string, number | undefined> = new Map();
    private readonly taskName: string;

    constructor(taskName: string, queueConfigs: SubscriberQueueConfig[]) {
        this.taskName = taskName;
        for (const config of queueConfigs) {
            const queue = QueueManager.getInstance<H>(config.options);
            this.queues.set(config.name, queue);
            this.concurrencyMap.set(config.name, config.options.concurrency);
        }
    }

    register(
        queueName: string,
        handler: H[keyof H],
        options?: { maxRetries?: number; maxProcessingTime?: number }
    ): void {
        const queue = this.getQueue(queueName);
        queue.register(this.taskName as keyof H, handler as H[keyof H], {
            ...options,
            paramSchema: () => ({ isValid: true as const, message: null }),
        });
    }

    registerAll(handler: H[keyof H], options?: { maxRetries?: number; maxProcessingTime?: number }): void {
        for (const queue of this.queues.values()) {
            queue.register(this.taskName as keyof H, handler as H[keyof H], {
                ...options,
                paramSchema: () => ({ isValid: true as const, message: null }),
            });
        }
    }

    async publish(
        payload: Parameters<H[keyof H]>[0],
        options?: { maxRetries?: number; maxProcessingTime?: number; priority?: number }
    ): Promise<void> {
        const tasks = Array.from(this.queues.values()).map((queue) =>
            queue.addTaskToQueue(this.taskName as keyof H, payload, options)
        );
        await Promise.all(tasks);
    }

    startAll(): void {
        for (const [name, queue] of this.queues) {
            const concurrency = this.concurrencyMap.get(name);
            queue.startWorker(concurrency);
        }
    }

    async stopAll(): Promise<void> {
        const stops = Array.from(this.queues.values()).map((q) => q.stopWorker());
        await Promise.all(stops);
    }

    getQueue(queueName: string): QueueManager<H> {
        const queue = this.queues.get(queueName);
        if (!queue) throw new Error(`队列 ${queueName} 不存在`);
        return queue;
    }

    getQueueNames(): string[] {
        return Array.from(this.queues.keys());
    }
}