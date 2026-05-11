import { defineStore } from 'pinia'
import { ref } from 'vue'

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
    const response = await fetch('http://localhost:3000/api/export/batch', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa('admin:password'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        photoIds,
        ...options
      })
    })

    const result = await response.json()
    return result.taskId
  }

  const getTaskStatus = async (taskId: string): Promise<ExportTask | null> => {
    const response = await fetch(`http://localhost:3000/api/queue/tasks/${taskId}`, {
      headers: {
        'Authorization': 'Basic ' + btoa('admin:password')
      }
    })

    if (!response.ok) {
      return null
    }

    return response.json()
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