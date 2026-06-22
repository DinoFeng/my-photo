import { EventEmitter } from 'events'

export const DB_READY = 'db-ready'

type AppEvent = typeof DB_READY

export class AppEventBus extends EventEmitter {
  emit(event: AppEvent, ...args: any[]): boolean {
    return super.emit(event, ...args)
  }

  on(event: AppEvent, listener: (...args: any[]) => void): this {
    return super.on(event, listener)
  }
}