import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'

export interface ImportTask {
  id: string
  sourcePath: string
  targetPath: string | null
  fileName: string
  fileHash: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'duplicate'
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}

export interface DuplicateGroup {
  fileHash: string
  photos: any[]
}

export const useImportStore = defineStore('import', () => {
  const tasks = ref<ImportTask[]>([])
  const duplicates = ref<DuplicateGroup[]>([])
  const importing = ref(false)
  const progress = ref(0)
  const statusText = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  const pendingTasks = computed(() => tasks.value.filter(t => t.status === 'pending'))
  const completedTasks = computed(() => tasks.value.filter(t => t.status === 'completed'))
  const failedTasks = computed(() => tasks.value.filter(t => t.status === 'failed'))

  async function fetchTasks(status?: string) {
    loading.value = true
    error.value = null
    try {
      tasks.value = await api.import.getTasks(status)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch tasks'
      console.error('Failed to fetch import tasks:', e)
    } finally {
      loading.value = false
    }
  }

  async function createTask(sourcePath: string, targetPath?: string) {
    try {
      const task = await api.import.createTask({ sourcePath, targetPath })
      tasks.value.unshift(task)
      return task
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create task'
      throw e
    }
  }

  async function processTasks() {
    importing.value = true
    progress.value = 0
    statusText.value = 'Processing...'
    
    try {
      const result = await api.import.process()
      progress.value = 100
      statusText.value = `Imported: ${result.imported}, Duplicates: ${result.duplicates}, Failed: ${result.failed}`
      await fetchTasks()
      await fetchDuplicates()
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to process tasks'
      statusText.value = 'Processing failed'
      throw e
    } finally {
      importing.value = false
    }
  }

  async function deleteTask(taskId: string) {
    try {
      await api.import.deleteTask(taskId)
      tasks.value = tasks.value.filter(t => t.id !== taskId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete task'
      throw e
    }
  }

  async function fetchDuplicates() {
    try {
      duplicates.value = await api.duplicates.getAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch duplicates'
      console.error('Failed to fetch duplicates:', e)
    }
  }

  async function handleDuplicate(photoId: string, action: 'skip' | 'rename' | 'overwrite') {
    try {
      await api.duplicates.handle(photoId, action)
      await fetchDuplicates()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to handle duplicate'
      throw e
    }
  }

  async function deleteDuplicate(photoId: string) {
    try {
      await api.duplicates.delete(photoId)
      await fetchDuplicates()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete duplicate'
      throw e
    }
  }

  function reset() {
    tasks.value = []
    duplicates.value = []
    importing.value = false
    progress.value = 0
    statusText.value = ''
    error.value = null
  }

  return {
    tasks,
    duplicates,
    importing,
    progress,
    statusText,
    loading,
    error,
    pendingTasks,
    completedTasks,
    failedTasks,
    fetchTasks,
    createTask,
    processTasks,
    deleteTask,
    fetchDuplicates,
    handleDuplicate,
    deleteDuplicate,
    reset
  }
})
