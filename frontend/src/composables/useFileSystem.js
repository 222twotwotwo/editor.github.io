import { ref, computed, onMounted } from 'vue'
import { markdownToHtml } from '../utils/markdownParser'

export function useFileSystem(markdownParser) {
  const FILE_STORAGE_KEY = 'markdownStudioFiles'
  
  const files = ref({})
  const currentFile = ref(null)
  const currentContent = ref('')
  const fileNameInput = ref('')
  const previewContent = ref('')

  // 初始化文件系统
  const initFileSystem = () => {
    const savedFiles = localStorage.getItem(FILE_STORAGE_KEY)
    if (savedFiles) {
      files.value = JSON.parse(savedFiles)
      const fileNames = Object.keys(files.value)
      if (fileNames.length > 0) {
        openFile(fileNames[0])
      }
    }
  }

  // 渲染预览
  const renderPreview = () => {
    if (markdownParser) {
      previewContent.value = markdownParser(currentContent.value)
    }
  }

  // 打开文件
  const openFile = (filename) => {
    if (!files.value[filename]) return
    
    // 保存当前文件内容
    if (currentFile.value) {
      files.value[currentFile.value] = currentContent.value
      saveFilesToStorage()
    }
    
    // 加载新文件内容
    currentFile.value = filename
    currentContent.value = files.value[filename]
    fileNameInput.value = filename
    renderPreview()
  }

  // 新建文件
  const newFile = () => {
    let defaultName = '新文件'
    let count = 1
    
    while (files.value[defaultName]) {
      defaultName = `新文件${count}`
      count++
    }
    
    files.value[defaultName] = ''
    saveFilesToStorage()
    openFile(defaultName)
  }

  // 保存文件
  const saveFile = () => {
    const newFilename = fileNameInput.value.trim()
    if (!newFilename) {
      alert('请输入文件名')
      return
    }
    
    // 如果文件名已更改且存在
    if (newFilename !== currentFile.value && files.value[newFilename]) {
      if (!confirm(`文件 "${newFilename}" 已存在，是否覆盖？`)) {
        return
      }
    }
    
    // 如果是重命名
    if (currentFile.value && newFilename !== currentFile.value) {
      delete files.value[currentFile.value]
    }
    
    // 保存文件内容
    files.value[newFilename] = currentContent.value
    saveFilesToStorage()
    openFile(newFilename)
  }

  // 删除文件
  const deleteFile = (filename) => {
    if (!filename) filename = currentFile.value
    
    if (!filename || !files.value[filename]) {
      alert(`文件 "${filename || '未知'}.md" 不存在或已被删除`)
      return
    }

    if (!confirm(`确定要删除 "${filename}.md" 吗？`)) {
      return
    }

    const isDeleteCurrentFile = currentFile.value === filename

    // 删除文件
    delete files.value[filename]
    saveFilesToStorage()

    if (isDeleteCurrentFile) {
      currentFile.value = null
      currentContent.value = ''
      fileNameInput.value = ''
      renderPreview()
    }

    alert(`文件 "${filename}.md" 已成功删除`)
  }

  // 导入文件
  const importFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md'
    
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (event) => {
        const filename = file.name.replace(/\.md$/i, '')
        let finalName = filename
        let count = 1
        
        while (files.value[finalName]) {
          finalName = `${filename}${count}`
          count++
        }
        
        files.value[finalName] = event.target.result
        saveFilesToStorage()
        openFile(finalName)
        alert(`已导入文件: ${finalName}.md`)
      }
      reader.readAsText(file)
    }
    
    input.click()
  }

  // 保存到localStorage
  const saveFilesToStorage = () => {
    localStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(files.value))
  }

  onMounted(() => {
    initFileSystem()
  })

  return {
    files,
    currentFile,
    currentContent,
    fileNameInput,
    previewContent,
    newFile,
    openFile,
    saveFile,
    deleteFile,
    importFile,
    renderPreview
  }
}