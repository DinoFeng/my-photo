import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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

export const useMediaStore = defineStore('media', () => {
  const mediaList = ref<Media[]>([])
  const loading = ref(false)
  const searchQuery = ref('')
  const currentPage = ref(1)
  const totalPages = ref(1)

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

      const response = await fetch(`http://localhost:3000/api/media?${params}`, {
        headers: {
          'Authorization': 'Basic ' + btoa('admin:password')
        }
      })
      const data = await response.json()
      mediaList.value = data.data
      currentPage.value = data.pagination.page
      totalPages.value = data.pagination.pages
    } catch (error) {
      console.error('Failed to load media:', error)
    }
    loading.value = false
  }

  const deleteMedia = async (id: string) => {
    try {
      await fetch(`http://localhost:3000/api/media/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:password')
        }
      })
      mediaList.value = mediaList.value.filter(m => m.id !== id)
    } catch (error) {
      console.error('Failed to delete media:', error)
    }
  }

  const setSearchQuery = (query: string) => {
    searchQuery.value = query
    currentPage.value = 1
  }

  return {
    mediaList,
    loading,
    searchQuery,
    currentPage,
    totalPages,
    filteredMedia,
    loadMedia,
    deleteMedia,
    setSearchQuery
  }
})