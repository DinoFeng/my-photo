import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sseRequest } from '../utils/apiClient'

export interface MonitorEvent {
  event: string
  data: any
  timestamp: Date
}

export const useMonitorStore = defineStore('monitor', () => {
  const events = ref<MonitorEvent[]>([])
  const isConnected = ref(false)
  let sseAbortController: AbortController | null = null

  const addEvent = (event: string, data: any) => {
    const monitorEvent: MonitorEvent = {
      event,
      data,
      timestamp: new Date()
    }
    events.value.unshift(monitorEvent)
    if (events.value.length > 100) {
      events.value = events.value.slice(0, 100)
    }
    console.log(`[Monitor] ${event}:`, data)
  }

  const connect = async () => {
    if (sseAbortController) return

    const controller = new AbortController()
    sseAbortController = controller

    try {
      await sseRequest(
        '/connect',
        {
          'connected': (data: any) => {
            isConnected.value = true
            addEvent('connected', data)
          },
          'file-add': (data: any) => addEvent('file-add', data),
          'file-change': (data: any) => addEvent('file-change', data),
          'file-remove': (data: any) => addEvent('file-remove', data),
          'import-file-add': (data: any) => addEvent('import-file-add', data),
          'task-start': (data: any) => addEvent('task-start', data),
          'task-complete': (data: any) => addEvent('task-complete', data),
          'task-error': (data: any) => addEvent('task-error', data),
        },
        controller.signal
      )
    } catch (error) {
      console.error('[Monitor] SSE connection failed:', error)
      isConnected.value = false
    } finally {
      if (sseAbortController === controller) {
        sseAbortController = null
      }
      isConnected.value = false
    }
  }

  const disconnect = () => {
    if (sseAbortController) {
      sseAbortController.abort()
      sseAbortController = null
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