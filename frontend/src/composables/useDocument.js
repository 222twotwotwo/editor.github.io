import { ref, computed, onMounted } from 'vue'
import { documentAPI } from '../services/api'

// 模块级共享状态，保证 EditorView 与 SidebarRight 等使用同一份文档列表，保存/删除后列表同步刷新
const documents = ref([])
const loading = ref(false)

const STORAGE_KEY_LAST_ACCESS = 'documentLastAccessed'

function getStoredLastAccessedMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_ACCESS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch (_) {}
  return {}
}

const lastAccessedMap = ref(getStoredLastAccessedMap())

function touchDocumentAccess(docId) {
  if (docId == null) return
  const key = String(docId)
  const next = { ...lastAccessedMap.value, [key]: Date.now() }
  lastAccessedMap.value = next
  try {
    localStorage.setItem(STORAGE_KEY_LAST_ACCESS, JSON.stringify(next))
  } catch (_) {}
}

const uploadStats = ref({
  todayCount: 0,
  totalCount: 0,
  totalSize: 0,
  daily: []
})

export function useDocument() {

  const fetchDocuments = async () => {
    loading.value = true
    try {
      const res = await documentAPI.list()
      if (res && res.success !== false && Array.isArray(res.data)) {
        documents.value = res.data
      } else {
        documents.value = []
      }
    } catch (err) {
      documents.value = []
    } finally {
      loading.value = false
    }
  }

  /** 按最近访问时间排序的文档列表（切换窗口/编辑页/桌面后顺序会更新） */
  const sortedDocuments = computed(() => {
    const list = documents.value || []
    const map = lastAccessedMap.value || {}
    return [...list].sort((a, b) => {
      const idA = a.id != null ? String(a.id) : ''
      const idB = b.id != null ? String(b.id) : ''
      const tA = map[idA] || 0
      const tB = map[idB] || 0
      if (tB !== tA) return tB - tA
      const uA = (a.updated_at && new Date(a.updated_at).getTime()) || 0
      const uB = (b.updated_at && new Date(b.updated_at).getTime()) || 0
      if (uB !== uA) return uB - uA
      return (b.id ?? 0) - (a.id ?? 0)
    })
  })

  const fetchStats = async () => {
    try {
      const res = await documentAPI.stats()
      if (res && res.success !== false && res.data) {
        uploadStats.value = {
          todayCount: res.data.todayCount ?? 0,
          totalCount: res.data.totalCount ?? 0,
          totalSize: res.data.totalSize ?? 0,
          daily: res.data.daily ?? []
        }
      }
    } catch (err) {
      uploadStats.value = { todayCount: 0, totalCount: 0, totalSize: 0, daily: [] }
    }
  }

  const getUploadChartData = () => {
    const daily = uploadStats.value.daily || []
    const dayMap = {}
    daily.forEach(({ date, count }) => { dayMap[date] = count })
    const labels = []
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      labels.push(key.slice(5))
      data.push(dayMap[key] ?? 0)
    }
    return { labels, data }
  }

  const deleteDocument = async (id) => {
    try {
      const res = await documentAPI.delete(id)
      return { success: res && res.success !== false }
    } catch (err) {
      return { success: false }
    }
  }

  const uploadDocument = async ({ title, content }) => {
    try {
      const rawContent = content || ''
      let finalTitle = (title || '').trim()
      if (!finalTitle) {
        finalTitle = rawContent.slice(0, 5) || '新文档'
      }
      const res = await documentAPI.upload({ title: finalTitle, content: rawContent })
      if (res && res.success !== false) {
        await fetchDocuments()
        await fetchStats()
        return { success: true, data: res.data }
      }
      return { success: false }
    } catch (err) {
      return { success: false }
    }
  }

  const updateDocument = async (id, { title, content }) => {
    try {
      const res = await documentAPI.update(id, { title, content: content ?? '' })
      if (res && res.success !== false) {
        const data = res.data
        const doc = documents.value.find(d => d.id === id)
        if (doc && data) {
          doc.title = data.title ?? doc.title
          doc.filename = data.filename ?? doc.filename
          doc.file_size = data.file_size ?? doc.file_size
          doc.updated_at = new Date().toISOString()
        }
        await fetchStats()
        return { success: true, data }
      }
      return { success: false }
    } catch (err) {
      return { success: false }
    }
  }

  const getDocument = async (id) => {
    try {
      const res = await documentAPI.get(id)
      if (res && res.success !== false && res.data) return { success: true, data: res.data }
      return { success: false }
    } catch (err) {
      return { success: false }
    }
  }

  onMounted(() => {
    fetchDocuments()
    fetchStats()
  })

  return {
    documents,
    sortedDocuments,
    loading,
    uploadStats,
    getUploadChartData,
    fetchDocuments,
    fetchStats,
    deleteDocument,
    uploadDocument,
    updateDocument,
    getDocument,
    touchDocumentAccess
  }
}
