import { ref, onMounted } from 'vue'
import { documentAPI } from '../services/api'

// 模块级共享状态，保证 EditorView 与 SidebarRight 等使用同一份文档列表，保存/删除后列表同步刷新
const documents = ref([])
const loading = ref(false)
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
      const res = await documentAPI.upload({ title, content: content || '' })
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
        await fetchDocuments()
        await fetchStats()
        return { success: true, data: res.data }
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
    loading,
    uploadStats,
    getUploadChartData,
    fetchDocuments,
    fetchStats,
    deleteDocument,
    uploadDocument,
    updateDocument,
    getDocument
  }
}
