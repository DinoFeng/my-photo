import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '../utils/apiClient'

export interface ExportTask {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  processed: number
  total: number
  skipped: number
  errors: number
  currentFile?: string
}

interface ExportResponse {
  taskId: string
}

export const useExportStore = defineStore('export', () => {
  const tasks = ref<ExportTask[]>([])
  const selectedIds = ref<string[]>([])

  const addTask = (task: ExportTask) => {
    tasks.value.push(task)
  }

  const updateTask = (id: string, updates: Partial<ExportTask>) => {
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...updates }
    }
  }

  const removeTask = (id: string) => {
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  const selectPhotos = (ids: string[]) => {
    selectedIds.value = ids
  }

  const toggleSelect = (id: string) => {
    const index = selectedIds.value.indexOf(id)
    if (index === -1) {
      selectedIds.value.push(id)
    } else {
      selectedIds.value.splice(index, 1)
    }
  }

  const clearSelection = () => {
    selectedIds.value = []
  }

  const exportPhotos = async (
    photoIds: string[],
    options: {
      path: string
      pattern: string
      duplicatePolicy: string
      includeSubfolders: boolean
    }
  ): Promise<string> => {
    const result = await apiClient.post<ExportResponse>('/export/batch', {
      photoIds,
      ...options
    })
    return result.taskId
  }

  const getTaskStatus = async (taskId: string): Promise<ExportTask | null> => {
    try {
      return await apiClient.get<ExportTask>(`/queue/tasks/${taskId}`)
    } catch {
      return null
    }
  }

  return {
    tasks,
    selectedIds,
    addTask,
    updateTask,
    removeTask,
    selectPhotos,
    toggleSelect,
    clearSelection,
    exportPhotos,
    getTaskStatus
  }
})