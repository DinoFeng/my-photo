type EventHandler<T> = (data: T) => void | Promise<void>;

interface EventListeners<T> {
  [eventName: string]: EventHandler<T>[];
}

export class EventBus {
  private listeners: EventListeners<any> = {};

  on<T>(eventName: string, handler: EventHandler<T>): void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(handler);
  }

  off<T>(eventName: string, handler: EventHandler<T>): void {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName] = this.listeners[eventName].filter(
      (h) => h !== handler
    );
  }

  async emit<T>(eventName: string, data: T): Promise<void> {
    if (!this.listeners[eventName]) return;
    for (const handler of this.listeners[eventName]) {
      await handler(data);
    }
  }

  once<T>(eventName: string, handler: EventHandler<T>): void {
    const onceHandler: EventHandler<T> = async (data) => {
      await handler(data);
      this.off(eventName, onceHandler);
    };
    this.on(eventName, onceHandler);
  }
}

export type { EventHandler };