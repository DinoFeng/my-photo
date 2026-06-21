import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient, sseRequest } from '../utils/apiClient'

export interface Media {
  id: string
  sourcePath: string
  filename: string
  filepath: string
  fileSize: number
  fileType: string
  hash: string | null
  width: number | null
  height: number | null
  duration: number | null
  make: string | null
  model: string | null
  dateTaken: string | null
  latitude: number | null
  longitude: number | null
  metadata: string | null
  thumbnailPath: string | null
  status: string
  createdAt: string
  updatedAt: string
}

interface MediaResponse {
  data: Media[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const useMediaStore = defineStore('media', () => {
  const mediaList = ref<Media[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const searchQuery = ref('')
  const currentPage = ref(1)
  const totalPages = ref(1)
  const totalCount = ref(0)
  const sseAbortController = ref<AbortController | null>(null)
  const fileTypeFilter = ref('')
  const sourcePathFilter = ref('')

  const hasMore = computed(() => currentPage.value < totalPages.value)

  const loadMedia = async (page: number = 1, search?: string) => {
    if (page === 1) {
      loading.value = true
    } else {
      loadingMore.value = true
    }

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '30',
      })
      if (search) {
        params.set('search', search)
      }
      if (fileTypeFilter.value) {
        params.set('fileType', fileTypeFilter.value)
      }
      if (sourcePathFilter.value) {
        params.set('sourcePath', sourcePathFilter.value)
      }

      const data = await apiClient.get<MediaResponse>(`/media?${params}`)

      if (page === 1) {
        mediaList.value = data.data
      } else {
        mediaList.value = [...mediaList.value, ...data.data]
      }

      currentPage.value = data.pagination.page
      totalPages.value = data.pagination.totalPages
      totalCount.value = data.pagination.total
    } catch (error) {
      console.error('Failed to load media:', error)
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  const loadMore = async () => {
    if (loadingMore.value || !hasMore.value) return
    await loadMedia(currentPage.value + 1, searchQuery.value || undefined)
  }

  const resetAndLoad = async () => {
    mediaList.value = []
    currentPage.value = 1
    totalPages.value = 1
    await loadMedia(1, searchQuery.value || undefined)
  }

  const addMedia = (mediaItem: Media) => {
    const existingIndex = mediaList.value.findIndex((m) => m.id === mediaItem.id)
    if (existingIndex >= 0) {
      mediaList.value[existingIndex] = mediaItem
    } else {
      mediaList.value.unshift(mediaItem)
    }
  }

  const deleteMedia = async (id: string) => {
    try {
      await apiClient.delete(`/media/${id}`)
      mediaList.value = mediaList.value.filter((m) => m.id !== id)
    } catch (error) {
      console.error('Failed to delete media:', error)
    }
  }

  const setSearchQuery = (query: string) => {
    searchQuery.value = query
    resetAndLoad()
  }

  const connectMediaSSE = async () => {
    if (sseAbortController.value) return

    const controller = new AbortController()
    sseAbortController.value = controller

    try {
      await sseRequest(
        '/media-updates',
        {
          'media-added': (mediaItem: Media) => {
            addMedia(mediaItem)
          },
        },
        controller.signal,
      )
    } catch {
      // Connection closed or error
    } finally {
      sseAbortController.value = null
    }
  }

  const disconnectMediaSSE = () => {
    if (sseAbortController.value) {
      sseAbortController.value.abort()
      sseAbortController.value = null
    }
  }

  return {
    mediaList,
    loading,
    loadingMore,
    searchQuery,
    currentPage,
    totalPages,
    totalCount,
    hasMore,
    fileTypeFilter,
    sourcePathFilter,
    loadMedia,
    loadMore,
    resetAndLoad,
    addMedia,
    deleteMedia,
    setSearchQuery,
    connectMediaSSE,
    disconnectMediaSSE,
  }
})