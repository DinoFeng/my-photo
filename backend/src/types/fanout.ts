import type { QueueBackendConfig } from 'queue-manager-pro';

export interface QueueConfig {
  backend: QueueBackendConfig;
  delay?: number;
  singleton?: boolean;
  maxRetries?: number;
  maxProcessingTime?: number;
  logger?: any;
  crashOnWorkerError?: boolean;
  concurrency?: number;
}

export interface SubscriberQueueConfig {
  name: string;
  options: QueueConfig;
}

export type Handler<T = any> = (payload: T) => Promise<any>;

export type QueueHandlerMap = Record<string, Handler>;