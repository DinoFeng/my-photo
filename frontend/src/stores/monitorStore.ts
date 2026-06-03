import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface MonitorEvent {
  event: string
  data: any
  timestamp: Date
}

export const useMonitorStore = defineStore('monitor', () => {
  const events = ref<MonitorEvent[]>([])
  const isConnected = ref(false)
  let eventSource: EventSource | null = null
  let eventBuffer: MonitorEvent[] = []

  const addEvent = (event: string, data: any) => {
    const monitorEvent: MonitorEvent = {
      event,
      data,
      timestamp: new Date()
    }
    events.value.unshift(monitorEvent)
    // 只保留最近 100 条事件
    if (events.value.length > 100) {
      events.value = events.value.slice(0, 100)
    }
    console.log(`[Monitor] ${event}:`, data)
  }

  const connect = () => {
    if (eventSource) return

    eventSource = new EventSource('/api/sse/connect')

    eventSource.addEventListener('connected', (e) => {
      console.log('[Monitor] SSE connected:', JSON.parse(e.data))
      isConnected.value = true
      addEvent('connected', JSON.parse(e.data))
    })

    eventSource.addEventListener('file-add', (e) => {
      addEvent('file-add', JSON.parse(e.data))
    })

    eventSource.addEventListener('file-change', (e) => {
      addEvent('file-change', JSON.parse(e.data))
    })

    eventSource.addEventListener('file-remove', (e) => {
      addEvent('file-remove', JSON.parse(e.data))
    })

    eventSource.addEventListener('import-file-add', (e) => {
      addEvent('import-file-add', JSON.parse(e.data))
    })

    eventSource.addEventListener('task-start', (e) => {
      addEvent('task-start', JSON.parse(e.data))
    })

    eventSource.addEventListener('task-complete', (e) => {
      addEvent('task-complete', JSON.parse(e.data))
    })

    eventSource.addEventListener('task-error', (e) => {
      addEvent('task-error', JSON.parse(e.data))
    })

    eventSource.onerror = () => {
      console.error('[Monitor] SSE error, reconnecting...')
      isConnected.value = false
      disconnect()
      // 5秒后重连
      setTimeout(() => connect(), 5000)
    }
  }

  const disconnect = () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }

  return {
    events,
    isConnected,
    connect,
    disconnect,
    addEvent
  }
})