import { ref, onMounted } from 'vue'
import { markdownToHtml } from '../utils/markdownParser'

/**
 * 仅管理当前编辑状态，不使用本地存储；保存/打开/删除由父组件通过数据库 API 完成。
 */
export function useFileSystem(markdownParser) {
  const currentFile = ref(null)
  const currentContent = ref('')
  const fileNameInput = ref('')
  const previewContent = ref('')

  const renderPreview = () => {
    if (markdownParser) {
      previewContent.value = markdownParser(currentContent.value)
    }
  }

  /** 新建文档：清空编辑器 */
  const newFile = () => {
    currentFile.value = null
    currentContent.value = ''
    fileNameInput.value = '新文档'
    renderPreview()
  }

  /** 从数据库加载后设置编辑器内容 */
  const setContent = (title, content, filename) => {
    fileNameInput.value = title || ''
    currentContent.value = content || ''
    currentFile.value = (filename || '').replace(/\.md$/i, '') || title || ''
    renderPreview()
  }

  /** 清空当前文档（如删除后） */
  const clearCurrent = () => {
    currentFile.value = null
    currentContent.value = ''
    fileNameInput.value = ''
    renderPreview()
  }

  /** 导入本地 .md 文件到编辑器，用户可再保存到数据库 */
  const importFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        const name = file.name.replace(/\.md$/i, '')
        fileNameInput.value = name
        currentContent.value = event.target.result || ''
        currentFile.value = name
        renderPreview()
        alert(`已导入: ${file.name}，可点击「保存文档」上传到数据库`)
      }
      reader.readAsText(file)
    }
    input.click()
  }

  onMounted(() => {
    renderPreview()
  })

  return {
    currentFile,
    currentContent,
    fileNameInput,
    previewContent,
    newFile,
    setContent,
    clearCurrent,
    importFile,
    renderPreview
  }
}
