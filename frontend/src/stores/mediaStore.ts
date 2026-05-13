import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient, sseRequest } from '../utils/apiClient'

export interface Media {
  id: string
  filename: string
  filepath: string
  fileSize: number
  fileType: string
  width?: number
  height?: number
  dateTaken?: string
  sourceDirectoryId: string
}

interface MediaResponse {
  data: Media[]
  pagination: {
    page: number
    pages: number
  }
}

export const useMediaStore = defineStore('media', () => {
  const mediaList = ref<Media[]>([])
  const loading = ref(false)
  const searchQuery = ref('')
  const currentPage = ref(1)
  const totalPages = ref(1)
  const sseAbortController = ref<AbortController | null>(null)

  const filteredMedia = computed(() => {
    if (!searchQuery.value) return mediaList.value
    return mediaList.value.filter(m =>
      m.filename.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  })

  const loadMedia = async (page: number = 1, search?: string) => {
    loading.value = true
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      })
      if (search) {
        params.set('search', search)
      }

      const data = await apiClient.get<MediaResponse>(`/api/media?${params}`)
      mediaList.value = data.data
      currentPage.value = data.pagination.page
      totalPages.value = data.pagination.pages
    } catch (error) {
      console.error('Failed to load media:', error)
    }
    loading.value = false
  }

  const addMedia = (mediaItem: Media) => {
    const existingIndex = mediaList.value.findIndex(m => m.id === mediaItem.id)
    if (existingIndex >= 0) {
      mediaList.value[existingIndex] = mediaItem
    } else {
      mediaList.value.unshift(mediaItem)
    }
  }

  const addMediaList = (mediaItems: Media[]) => {
    mediaItems.forEach(item => addMedia(item))
  }

  const deleteMedia = async (id: string) => {
    try {
      await apiClient.delete(`/api/media/${id}`)
      mediaList.value = mediaList.value.filter(m => m.id !== id)
    } catch (error) {
      console.error('Failed to delete media:', error)
    }
  }

  const setSearchQuery = (query: string) => {
    searchQuery.value = query
    currentPage.value = 1
  }

  const connectMediaSSE = async () => {
    if (sseAbortController.value) return
    
    const controller = new AbortController()
    sseAbortController.value = controller
    
    try {
      await sseRequest(
        '/api/sse/media-updates',
        {
          'media-added': (mediaItem: Media) => {
            addMedia(mediaItem)
          },
          'media-list': (mediaItems: Media[]) => {
            addMediaList(mediaItems)
          }
        },
        controller.signal
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
    searchQuery,
    currentPage,
    totalPages,
    filteredMedia,
    loadMedia,
    addMedia,
    addMediaList,
    deleteMedia,
    setSearchQuery,
    connectMediaSSE,
    disconnectMediaSSE
  }
})