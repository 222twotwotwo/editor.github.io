import { ref, onMounted } from 'vue'

export function useGitHub() {
  const repoOwner = ref('')
  const repoName = ref('')
  const filePath = ref('')
  const token = ref('')
  const todayCount = ref(0)
  const uploadChartData = ref({ labels: [], data: [] })
  
  const KEY = 'uploadStats'

  const today = () => {
    return new Date().toISOString().slice(0, 10)
  }

  const recordUploadSuccess = () => {
    const stats = JSON.parse(localStorage.getItem(KEY) || '{}')
    const todayDate = today()
    stats[todayDate] = (stats[todayDate] || 0) + 1
    localStorage.setItem(KEY, JSON.stringify(stats))
    updateStats()
  }

  const uploadToGitHub = async (content) => {
    const owner = repoOwner.value.trim()
    const repo = repoName.value.trim()
    const path = filePath.value.trim()
    const tokenValue = token.value.trim()
    
    if (!owner || !repo || !path || !tokenValue) {
      alert('信息不完整')
      return false
    }

    const encodedContent = btoa(unescape(encodeURIComponent(content)))
    const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`

    let sha = null
    try {
      const response = await fetch(api, { 
        headers: { Authorization: `token ${tokenValue}` } 
      })
      if (response.ok) {
        const data = await response.json()
        sha = data.sha
      }
    } catch (error) {
      console.error('获取文件SHA失败:', error)
    }

    try {
      const res = await fetch(api, {
        method: 'PUT',
        headers: {
          Authorization: `token ${tokenValue}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: 'Update Markdown', 
          content: encodedContent, 
          sha 
        })
      })

      if (!res.ok) {
        alert('上传失败')
        return false
      }
      
      recordUploadSuccess()
      alert('✅ 已上传到 GitHub')
      return true
    } catch (error) {
      alert('上传失败')
      console.error('上传失败:', error)
      return false
    }
  }

  const updateStats = () => {
    const stats = JSON.parse(localStorage.getItem(KEY) || '{}')
    todayCount.value = stats[today()] || 0

    const labels = []
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      labels.push(key.slice(5))
      data.push(stats[key] || 0)
    }

    uploadChartData.value = { labels, data }
  }

  onMounted(() => {
    updateStats()
  })

  return {
    repoOwner,
    repoName,
    filePath,
    token,
    todayCount,
    uploadChartData,
    uploadToGitHub,
    updateStats
  }
}