<template>
  <div :data-theme="theme">
    <TopBar
      :soundEnabled="soundEnabled"
      :theme="theme"
      :on-toggle-left-sidebar="toggleLeftSidebar"
      @toggle-sound="toggleSound"
      @toggle-theme="toggleTheme"
      @export-html="handleExportHTML"
      @export-md="handleExportMD"
      @export-pdf="handleExportPDF"
    />

    <div class="container">
      <SidebarLeft
        :collapsed="leftSidebarCollapsed"
        @reset-colors="resetHighlightColors"
      />

      <main class="main">
        <EditorPane
          v-model="currentContent"
          :previewContent="previewContent"
          @update:modelValue="handleEditorInput"
        />
      </main>

      <SidebarRight
        :collapsed="rightSidebarCollapsed"
        :currentFile="currentFile"
        :fileNameInput="fileNameInput"
        @open-file="handleOpenFile"
        @save-file="handleSaveFile"
        @delete-file="handleDeleteFile"
        @import-file="importFile"
        @update-file-name="fileNameInput = $event"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import SidebarLeft from '../components/SidebarLeft.vue'
import SidebarRight from '../components/SidebarRight.vue'
import EditorPane from '../components/EditorPane.vue'
import { useTheme } from '../composables/useTheme'
import { useFileSystem } from '../composables/useFileSystem'
import { useDocument } from '../composables/useDocument'
import { useAudio } from '../composables/useAudio'
import { useHighlightColors } from '../composables/useHighlightColors'
import { useSidebar } from '../composables/useSidebar'
import { exportHTML as exportHTMLUtil, exportMD as exportMDUtil, exportPDF as exportPDFUtil } from '../utils/exportUtils'
import { markdownToHtml } from '../utils/markdownParser'

const { theme, toggleTheme } = useTheme()
const {
  currentFile,
  currentContent,
  fileNameInput,
  previewContent,
  newFile,
  setContent,
  clearCurrent,
  importFile,
  renderPreview
} = useFileSystem(markdownToHtml)

const {
  getDocument,
  uploadDocument,
  updateDocument,
  fetchDocuments
} = useDocument()

const currentDocumentId = ref(null)
const { soundEnabled, toggleSound, playEditSound, playExportSound } = useAudio()
const { resetHighlightColors } = useHighlightColors()
const { leftSidebarCollapsed, rightSidebarCollapsed, toggleLeftSidebar } = useSidebar()

const handleEditorInput = (content) => {
  currentContent.value = content
  renderPreview()
  playEditSound()
}

const handleExportHTML = () => {
  playExportSound()
  exportHTMLUtil(previewContent.value)
}

const handleExportMD = () => {
  playExportSound()
  exportMDUtil(currentContent.value, currentFile.value)
}

const handleExportPDF = () => {
  playExportSound()
  exportPDFUtil()
}

const handleOpenFile = async (doc) => {
  const res = await getDocument(doc.id)
  if (res.success && res.data) {
    const d = res.data
    currentDocumentId.value = d.id
    setContent(d.title, d.content, d.filename)
  } else {
    alert('加载文档失败')
  }
}

const handleSaveFile = async () => {
  const title = (fileNameInput.value || '').trim()
  if (!title) {
    alert('请输入文档标题')
    return
  }
  const content = currentContent.value || ''
  if (currentDocumentId.value) {
    const res = await updateDocument(currentDocumentId.value, { title, content })
    if (res.success) {
      alert('已保存到数据库')
    } else {
      alert('保存失败')
    }
  } else {
    const res = await uploadDocument({ title, content })
    if (res.success && res.data && res.data.id) {
      currentDocumentId.value = res.data.id
      currentFile.value = (res.data.filename || title).replace(/\.md$/, '')
      alert('已上传到数据库')
    } else {
      alert('上传失败')
    }
  }
}

const handleDeleteFile = (doc) => {
  if (currentDocumentId.value === doc.id) {
    clearCurrent()
    currentDocumentId.value = null
  }
}

onMounted(() => {
  const savedContent = localStorage.getItem('windowedEditorContent')
  const savedTitle = localStorage.getItem('windowedEditorTitle')
  if (savedContent) {
    setContent(savedTitle || '未命名文档', savedContent, savedTitle || '未命名文档')
    localStorage.removeItem('windowedEditorContent')
    localStorage.removeItem('windowedEditorTitle')
  } else if (currentContent.value) {
    renderPreview()
  }
})
</script>

<style scoped>
.container {
  display: flex;
  height: calc(100vh - 52px);
}
.main {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
}
</style>
