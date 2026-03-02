export function formatFileSize(bytes) {
  if (bytes == null || isNaN(bytes) || bytes < 0) return '-'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDate(dateString) {
  if (!dateString) return '-'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('zh-CN')
}

/** 从文章内容取前5个字作为默认标题，与 useDocument 上传逻辑一致 */
export function getDefaultTitleFromContent(content) {
  const raw = (content || '').trim()
  return raw.slice(0, 5) || '新文档'
}
