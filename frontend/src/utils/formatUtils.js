export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

/** 从文章内容取前5个字作为默认标题，与 useDocument 上传逻辑一致 */
export function getDefaultTitleFromContent(content) {
  const raw = (content || '').trim()
  return raw.slice(0, 5) || '新文档'
}
