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
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface MediaGroupsResponse {
  groups: MediaGroup[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type GroupGranularity = 'year' | 'month' | 'day'

// 将时间线 label 解析为日期范围 (afterDate, beforeDate)
// "2026年" → { afterDate: '2025-12-31', beforeDate: '2026-12-31' }
// "2026年06月" → { afterDate: '2026-05-31', beforeDate: '2026-06-30' }
// "2026年06月28日" → { afterDate: '2026-06-27', beforeDate: '2026-06-28' }
function parseGroupLabel(label: string): { afterDate: string; beforeDate: string } | null {
  // 年：YYYY年
  let m = label.match(/^(\d{4})年$/)
  if (m) {
    const year = parseInt(m[1])
    return { afterDate: `${year - 1}-12-31`, beforeDate: `${year}-12-31` }
  }
  // 月：YYYY年MM月
  m = label.match(/^(\d{4})年(\d{2})月$/)
  if (m) {
    const year = parseInt(m[1])
    const month = parseInt(m[2])
    // 计算该月最后一天
    const lastDay = new Date(year, month, 0).getDate()
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
    return {
      afterDate: `${year}-${String(month - 1).padStart(2, '0')}-${String(prevMonthLastDay).padStart(2, '0')}`,
      beforeDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    }
  }
  // 日：YYYY年MM月DD日
  m = label.match(/^(\d{4})年(\d{2})月(\d{2})日$/)
  if (m) {
    const year = parseInt(m[1])
    const month = parseInt(m[2])
    const day = parseInt(m[3])
    // 前一天
    const prevDate = new Date(year, month - 1, day - 1)
    return {
      afterDate: `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`,
      beforeDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    }
  }
  return null
}

function parseDateLabel(label: string): string | null {
  const match = label.match(/^(\d{4})年(\d{2})月(\d{2})日$/)
  if (!match) return null
  return `${match[1]}-${match[2]}-${match[3]}`
}

export const useMediaStore = defineStore('media', () => {
  const mediaList = ref<Media[]>([])
  const mediaGroups = ref<MediaGroup[]>([])
  const loadingGroups = ref(false)
  const loadingMoreGroups = ref(false)
  const groupGranularity = ref<GroupGranularity>('year')
  const groupPage = ref(1)
  const groupTotalPages = ref(1)
  const groupFilterLabel = ref<string>('') // 当前用于筛选图片的 group label
  const hasMoreGroups = computed(() => groupPage.value < groupTotalPages.value)
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

  // 独立接口：加载日期分组（时间线用），支持分页 + 粒度切换
  const loadMediaGroups = async (opts: { reset?: boolean } = {}) => {
    const reset = opts.reset ?? true
    const targetPage = reset ? 1 : groupPage.value + 1

    // reset 模式：标记 loadingGroups，否则 loadingMoreGroups
    if (reset) {
      if (loadingGroups.value) return null
      loadingGroups.value = true
    } else {
      if (loadingMoreGroups.value || !hasMoreGroups.value) return null
      loadingMoreGroups.value = true
    }

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: '20',
        granularity: groupGranularity.value,
      })
      if (searchQuery.value) params.set('search', searchQuery.value)
      if (fileTypeFilter.value) params.set('fileType', fileTypeFilter.value)
      if (sourcePathFilter.value) params.set('sourcePath', sourcePathFilter.value)

      const data = await apiClient.get<MediaGroupsResponse>(`/media/groups?${params.toString()}`)

      mediaGroups.value = reset ? data.groups : [...mediaGroups.value, ...data.groups]
      groupPage.value = data.pagination.page
      groupTotalPages.value = data.pagination.totalPages

      return data.groups
    } catch (error) {
      console.error('Failed to load media groups:', error)
      return null
    } finally {
      loadingGroups.value = false
      loadingMoreGroups.value = false
    }
  }

  const loadMoreGroups = () => loadMediaGroups({ reset: false })

  // 切换分组粒度：清空并重新加载 groups，然后用第一个 group 重新加载图片
  const setGroupGranularity = async (granularity: GroupGranularity) => {
    if (groupGranularity.value === granularity) return
    groupGranularity.value = granularity
    groupPage.value = 1
    groupTotalPages.value = 1
    mediaGroups.value = []
    const groups = await loadMediaGroups({ reset: true })
    // 用第一个 group 的日期范围加载图片
    if (groups && groups.length > 0) {
      const firstLabel = groups[0].label
      groupFilterLabel.value = firstLabel
      activeDate.value = firstLabel
      const range = parseGroupLabel(firstLabel)
      const res = await loadMedia({
        page: 1,
        beforeDate: range?.beforeDate,
        afterDate: range?.afterDate,
        mode: 'replace',
      })
      if (res) {
        normalPage.value = res.page
        normalTotalPages.value = res.totalPages
      }
    } else {
      mediaList.value = []
      groupFilterLabel.value = ''
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
    if (loadingMore.value || !hasMoreNormal.value) return
    const range = groupFilterLabel.value ? parseGroupLabel(groupFilterLabel.value) : null
    const res = await loadMedia({
      page: normalPage.value + 1,
      beforeDate: range?.beforeDate,
      afterDate: range?.afterDate,
      mode: 'append',
    })
    if (res) {
      normalPage.value = res.page
      normalTotalPages.value = res.totalPages
    }
  }

  const loadNewer = async () => {
    // group 筛选模式下不支持向上加载（单向分页）
    return
  }

  const resetAndLoad = async () => {
    clearAll()
    // 1. 先加载 groups（按年分组）
    const groups = await loadMediaGroups({ reset: true })
    if (groups && groups.length > 0) {
      // 2. 取第一个 group（如 "2026年"），用它的日期范围来加载图片
      const firstLabel = groups[0].label
      groupFilterLabel.value = firstLabel
      activeDate.value = firstLabel
      const range = parseGroupLabel(firstLabel)
      // 3. 用该日期范围调用 media API
      const res = await loadMedia({
        page: 1,
        beforeDate: range?.beforeDate,
        afterDate: range?.afterDate,
        mode: 'replace',
      })
      if (res) {
        normalPage.value = res.page
        normalTotalPages.value = res.totalPages
      }
    } else {
      // 无分组数据，直接全量加载
      const res = await loadMedia({ page: 1, mode: 'replace' })
      if (res) {
        normalPage.value = res.page
        normalTotalPages.value = res.totalPages
      }
    }
  }

  // 点击时间线的某个 group → 切换到该日期范围，重新加载图片
  const jumpToGroup = async (label: string) => {
    const range = parseGroupLabel(label)
    if (!range) return null
    groupFilterLabel.value = label
    activeDate.value = label
    const res = await loadMedia({
      page: 1,
      beforeDate: range.beforeDate,
      afterDate: range.afterDate,
      mode: 'replace',
    })
    if (res) {
      normalPage.value = res.page
      normalTotalPages.value = res.totalPages
    }
    return label
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
    loadingGroups,
    loadingMoreGroups,
    groupGranularity,
    groupPage,
    groupTotalPages,
    hasMoreGroups,
    searchQuery,
    totalCount,
    hasMoreOlder,
    hasMoreNewer,
    hasMoreNormal,
    normalPage,
    normalTotalPages,
    fileTypeFilter,
    sourcePathFilter,
    activeDate,
    anchorDateIso,
    groupFilterLabel,
    olderPage,
    newerPage,
    recentlyAdded,
    loadMedia,
    loadMediaGroups,
    loadMoreGroups,
    setGroupGranularity,
    loadMore,
    loadNewer,
    resetAndLoad,
    jumpToDate,
    jumpToGroup,
    addMedia,
    deleteMedia,
    setActiveDate,
    setSearchQuery,
    connectMediaSSE,
    disconnectMediaSSE,
    clearRecentlyAdded,
  }
})