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
  fileBirthtime: string | null
  fileMtime: string | null
  effectiveTime: string | null
  latitude: number | null
  longitude: number | null
  metadata: string | null
  thumbnailPath: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface MediaGroup {
  label: string
  count: number
}

interface MediaResponse {
  data: Media[]
  groups: MediaGroup[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function parseDateLabel(label: string): string | null {
  const match = label.match(/^(\d{4})年(\d{2})月(\d{2})日$/)
  if (!match) return null
  return `${match[1]}-${match[2]}-${match[3]}`
}

export const useMediaStore = defineStore('media', () => {
  const mediaList = ref<Media[]>([])
  const mediaGroups = ref<MediaGroup[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const loadingNewer = ref(false)
  const searchQuery = ref('')
  const totalCount = ref(0)
  const sseAbortController = ref<AbortController | null>(null)
  const fileTypeFilter = ref('')
  const sourcePathFilter = ref('')
  const activeDate = ref('')
  const recentlyAdded = ref<Media[]>([])

  // 锚点日期（YYYY-MM-DD），决定分页窗口中心
  // - null: 从最新日期开始的常规单向分页
  // - 有值: 以该日期为锚点的双向分页
  const anchorDateIso = ref<string | null>(null)

  // 双向分页的独立页码
  const olderPage = ref(1) // 往"更旧"方向（DESC 向后翻页）
  const newerPage = ref(1) // 往"更新"方向（ASC 向后翻页，再反转）
  const hasMoreOlder = ref(true)
  const hasMoreNewer = ref(true)

  // 常规单向分页（无锚点时使用）
  const normalPage = ref(1)
  const normalTotalPages = ref(1)
  const hasMoreNormal = computed(() => normalPage.value < normalTotalPages.value)

  const buildParams = (page: number, extra?: { beforeDate?: string; afterDate?: string; search?: string }) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: '30',
    })
    const searchVal = extra?.search ?? searchQuery.value
    if (searchVal) params.set('search', searchVal)
    if (fileTypeFilter.value) params.set('fileType', fileTypeFilter.value)
    if (sourcePathFilter.value) params.set('sourcePath', sourcePathFilter.value)
    if (extra?.beforeDate) params.set('beforeDate', extra.beforeDate)
    if (extra?.afterDate) params.set('afterDate', extra.afterDate)
    return params
  }

  // 合并图片（按 ID 去重），并保持 DESC 顺序（最新在前）
  const mergeMedia = (existing: Media[], incoming: Media[], mode: 'replace' | 'append' | 'prepend'): Media[] => {
    if (mode === 'replace') return [...incoming]

    const seen = new Set<string>()
    const result: Media[] = []

    const addItem = (m: Media) => {
      if (seen.has(m.id)) return
      seen.add(m.id)
      result.push(m)
    }

    if (mode === 'prepend') {
      // 先加 incoming（更新的数据应在前面），再加 existing
      incoming.forEach(addItem)
      existing.forEach(addItem)
    } else {
      // append: 先加 existing，再加 incoming（更旧的数据）
      existing.forEach(addItem)
      incoming.forEach(addItem)
    }

    return result
  }

  const loadMedia = async (
    opts: {
      page?: number
      beforeDate?: string
      afterDate?: string
      mode?: 'replace' | 'append' | 'prepend'
      search?: string
    } = {},
  ) => {
    const page = opts.page ?? 1
    const mode = opts.mode ?? (page === 1 ? 'replace' : 'append')

    if (mode === 'replace') {
      loading.value = true
    } else if (mode === 'prepend') {
      loadingNewer.value = true
    } else {
      loadingMore.value = true
    }

    try {
      const params = buildParams(page, {
        beforeDate: opts.beforeDate,
        afterDate: opts.afterDate,
        search: opts.search,
      })

      const data = await apiClient.get<MediaResponse>(`/media?${params}`)

      mediaList.value = mergeMedia(mediaList.value, data.data, mode)
      if (data.groups) mediaGroups.value = data.groups
      totalCount.value = data.pagination.total

      return {
        page: data.pagination.page,
        totalPages: data.pagination.totalPages,
        count: data.data.length,
      }
    } catch (error) {
      console.error('Failed to load media:', error)
      return null
    } finally {
      loading.value = false
      loadingMore.value = false
      loadingNewer.value = false
    }
  }

  const clearAll = () => {
    mediaList.value = []
    mediaGroups.value = []
    totalCount.value = 0
    activeDate.value = ''
    anchorDateIso.value = null
    olderPage.value = 1
    newerPage.value = 0 // 锚点模式下 first loadNewer 应该是 page=1
    hasMoreOlder.value = true
    hasMoreNewer.value = true
    normalPage.value = 1
    normalTotalPages.value = 1
  }

  const loadMore = async () => {
    // 有锚点 → 双向分页下滚（更旧）
    if (anchorDateIso.value) {
      if (loadingMore.value || !hasMoreOlder.value) return
      const nextPage = olderPage.value + 1
      const res = await loadMedia({
        page: nextPage,
        beforeDate: anchorDateIso.value,
        mode: 'append',
      })
      if (res) {
        olderPage.value = res.page
        hasMoreOlder.value = res.page < res.totalPages && res.count > 0
      }
      return
    }

    // 无锚点 → 常规单向分页
    if (loadingMore.value || !hasMoreNormal.value) return
    const res = await loadMedia({ page: normalPage.value + 1, mode: 'append' })
    if (res) {
      normalPage.value = res.page
      normalTotalPages.value = res.totalPages
    }
  }

  const loadNewer = async () => {
    // 有锚点 → 双向分页上滚（更新）
    if (anchorDateIso.value) {
      if (loadingNewer.value || !hasMoreNewer.value) return
      // 关键：newerPage 表示"已加载到的页码"，初始为0表示还没加载任何更新日期
      // 所以下一次应该加载 newerPage + 1
      const nextPage = newerPage.value + 1
      const res = await loadMedia({
        page: nextPage,
        afterDate: anchorDateIso.value,
        mode: 'prepend',
      })
      if (res) {
        newerPage.value = res.page
        hasMoreNewer.value = res.page < res.totalPages && res.count > 0
      }
      return
    }

    // 无锚点 → 已经在最前面了，无"更新"方向
    return
  }

  const resetAndLoad = async () => {
    clearAll()
    const res = await loadMedia({ page: 1, mode: 'replace' })
    if (res) {
      normalPage.value = res.page
      normalTotalPages.value = res.totalPages
    }
  }

  // 跳转到指定日期：以该日期为锚点，加载锚点附近的图片
  // 1. beforeDate: 锚点及更旧的图片（锚点在 DESC 列表中是最新的）
  // 2. afterDate page=1: 紧邻锚点的更新图片（让锚点在列表中间，上下都有滚动空间）
  const jumpToDate = async (dateLabel: string): Promise<string | null> => {
    const isoDate = parseDateLabel(dateLabel)
    if (!isoDate) return null

    activeDate.value = dateLabel
    anchorDateIso.value = isoDate
    mediaList.value = []
    olderPage.value = 1 // beforeDate 已加载 page=1
    newerPage.value = 1 // afterDate 已加载 page=1
    hasMoreOlder.value = true
    hasMoreNewer.value = true

    // 1. 先加载锚点及更旧的图片
    const olderRes = await loadMedia({
      page: 1,
      beforeDate: isoDate,
      mode: 'replace',
    })
    if (olderRes) {
      hasMoreOlder.value = olderRes.page < olderRes.totalPages && olderRes.count > 0
    }

    // 2. 加载紧邻锚点的更新图片（prepend 到列表顶部）
    //    预加载 2 页，确保上方有足够的滚动空间（30-60 张图片）
    const newerPagesToLoad = 2
    let lastNewerPage = 0
    for (let p = 1; p <= newerPagesToLoad; p++) {
      const newerRes = await loadMedia({
        page: p,
        afterDate: isoDate,
        mode: 'prepend',
      })
      if (newerRes && newerRes.count > 0) {
        lastNewerPage = newerRes.page
        hasMoreNewer.value = newerRes.page < newerRes.totalPages
      } else {
        hasMoreNewer.value = false
        break
      }
    }
    newerPage.value = lastNewerPage

    console.debug('[jumpToDate] 完成', {
      isoDate,
      mediaListLength: mediaList.value.length,
      hasMoreOlder: hasMoreOlder.value,
      hasMoreNewer: hasMoreNewer.value,
      firstDate: mediaList.value[0]?.effectiveTime || mediaList.value[0]?.createdAt,
      targetDate: isoDate,
      lastDate: mediaList.value[mediaList.value.length - 1]?.effectiveTime || mediaList.value[mediaList.value.length - 1]?.createdAt,
    })

    return dateLabel
  }

  const addMedia = (mediaItem: Media) => {
    const existingIndex = mediaList.value.findIndex((m) => m.id === mediaItem.id)
    if (existingIndex >= 0) {
      mediaList.value[existingIndex] = mediaItem
    } else {
      mediaList.value.unshift(mediaItem)
    }
    const recentIndex = recentlyAdded.value.findIndex((m) => m.id === mediaItem.id)
    if (recentIndex >= 0) {
      recentlyAdded.value.splice(recentIndex, 1)
    }
    recentlyAdded.value.unshift(mediaItem)
    if (recentlyAdded.value.length > 20) {
      recentlyAdded.value = recentlyAdded.value.slice(0, 20)
    }
  }

  const clearRecentlyAdded = () => {
    recentlyAdded.value = []
  }

  const deleteMedia = async (id: string) => {
    try {
      await apiClient.delete(`/media/${id}`)
      mediaList.value = mediaList.value.filter((m) => m.id !== id)
    } catch (error) {
      console.error('Failed to delete media:', error)
    }
  }

  const setActiveDate = (dateLabel: string) => {
    if (activeDate.value !== dateLabel) {
      activeDate.value = dateLabel
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
    mediaGroups,
    loading,
    loadingMore,
    loadingNewer,
    searchQuery,
    totalCount,
    hasMoreOlder,
    hasMoreNewer,
    fileTypeFilter,
    sourcePathFilter,
    activeDate,
    anchorDateIso,
    olderPage,
    newerPage,
    recentlyAdded,
    loadMedia,
    loadMore,
    loadNewer,
    resetAndLoad,
    jumpToDate,
    addMedia,
    deleteMedia,
    setActiveDate,
    setSearchQuery,
    connectMediaSSE,
    disconnectMediaSSE,
    clearRecentlyAdded,
  }
})