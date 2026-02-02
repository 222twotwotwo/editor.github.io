<template>
  <div :data-theme="theme">
    <TopBar
      :soundEnabled="soundEnabled"
      @toggle-left-sidebar="toggleLeftSidebar"
      @toggle-right-sidebar="toggleRightSidebar"
      @toggle-sound="toggleSound"
      @toggle-theme="toggleTheme"
      @export-html="handleExportHTML"
      @export-md="handleExportMD"
      @export-pdf="handleExportPDF"
    />

    <div class="container">
      <SidebarLeft
        :collapsed="leftSidebarCollapsed"
        :repoOwner="repoOwner"
        :repoName="repoName"
        :filePath="filePath"
        :token="token"
        :todayCount="todayCount"
        :uploadChartData="uploadChartData"
        :currentTheme="theme"
        @upload-github="uploadToGitHub"
        @update-repo-owner="repoOwner = $event"
        @update-repo-name="repoName = $event"
        @update-file-path="filePath = $event"
        @update-token="token = $event"
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
        :files="files"
        :currentFile="currentFile"
        :fileNameInput="fileNameInput"
        @toggle-sidebar="toggleRightSidebar"
        @new-file="newFile"
        @open-file="openFile"
        @save-file="saveFile"
        @delete-file="deleteFile"
        @import-file="importFile"
        @update-file-name="fileNameInput = $event"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import TopBar from './components/TopBar.vue'
import SidebarLeft from './components/SidebarLeft.vue'
import SidebarRight from './components/SidebarRight.vue'
import EditorPane from './components/EditorPane.vue'
import { useTheme } from './composables/useTheme'
import { useFileSystem } from './composables/useFileSystem'
import { useAudio } from './composables/useAudio'
import { useGitHub } from './composables/useGitHub'
import { useHighlightColors } from './composables/useHighlightColors'
import { useSidebar } from './composables/useSidebar'
import { exportHTML as exportHTMLUtil, exportMD as exportMDUtil,   exportPDF as exportPDFUtil } from './utils/exportUtils'
import { markdownToHtml } from './utils/markdownParser'

// 使用组合式函数
const { theme, toggleTheme } = useTheme()
const { 
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
} = useFileSystem(markdownToHtml)
const { soundEnabled, toggleSound, playEditSound, playExportSound } = useAudio()
const { 
  repoOwner, 
  repoName, 
  filePath, 
  token, 
  todayCount, 
  uploadChartData, 
  uploadToGitHub, 
  updateStats 
} = useGitHub()
const { resetHighlightColors } = useHighlightColors()
const { 
  leftSidebarCollapsed, 
  rightSidebarCollapsed, 
  toggleLeftSidebar, 
  toggleRightSidebar 
} = useSidebar()

// 处理编辑器输入
const handleEditorInput = (content) => {
  currentContent.value = content
  renderPreview()
  playEditSound()
}

// 导出功能
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

// 初始化
onMounted(() => {
  updateStats()
  if (currentFile.value) {
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
</style><template>
  <div :data-theme="theme">
    <TopBar
      :soundEnabled="soundEnabled"
      @toggle-left-sidebar="toggleLeftSidebar"
      @toggle-right-sidebar="toggleRightSidebar"
      @toggle-sound="toggleSound"
      @toggle-theme="toggleTheme"
      @export-html="handleExportHTML"
      @export-md="handleExportMD"
      @export-pdf="handleExportPDF"
    />

    <div class="container">
      <SidebarLeft
        :collapsed="leftSidebarCollapsed"
        :repoOwner="repoOwner"
        :repoName="repoName"
        :filePath="filePath"
        :token="token"
        :todayCount="todayCount"
        :uploadChartData="uploadChartData"
        :currentTheme="theme"
        @upload-github="uploadToGitHub"
        @update-repo-owner="repoOwner = $event"
        @update-repo-name="repoName = $event"
        @update-file-path="filePath = $event"
        @update-token="token = $event"
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
        :files="files"
        :currentFile="currentFile"
        :fileNameInput="fileNameInput"
        @toggle-sidebar="toggleRightSidebar"
        @new-file="newFile"
        @open-file="openFile"
        @save-file="saveFile"
        @delete-file="deleteFile"
        @import-file="importFile"
        @update-file-name="fileNameInput = $event"
      />
    </div>

    <!-- 添加桌宠组件 -->
    <DesktopPet v-if="showPet" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import TopBar from './components/TopBar.vue'
import SidebarLeft from './components/SidebarLeft.vue'
import SidebarRight from './components/SidebarRight.vue'
import EditorPane from './components/EditorPane.vue'
// 导入新的桌宠组件
import DesktopPet from './components/DesktopPet.vue'
import { useTheme } from './composables/useTheme'
import { useFileSystem } from './composables/useFileSystem'
import { useAudio } from './composables/useAudio'
import { useGitHub } from './composables/useGitHub'
import { useHighlightColors } from './composables/useHighlightColors'
import { useSidebar } from './composables/useSidebar'
import { exportHTML as exportHTMLUtil, exportMD as exportMDUtil,   exportPDF as exportPDFUtil } from './utils/exportUtils'
import { markdownToHtml } from './utils/markdownParser'

// 使用组合式函数
const { theme, toggleTheme } = useTheme()
const { 
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
} = useFileSystem(markdownToHtml)
const { soundEnabled, toggleSound, playEditSound, playExportSound } = useAudio()
const { 
  repoOwner, 
  repoName, 
  filePath, 
  token, 
  todayCount, 
  uploadChartData, 
  uploadToGitHub, 
  updateStats 
} = useGitHub()
const { resetHighlightColors } = useHighlightColors()
const { 
  leftSidebarCollapsed, 
  rightSidebarCollapsed, 
  toggleLeftSidebar, 
  toggleRightSidebar 
} = useSidebar()

// 是否显示桌宠
const showPet = ref(true)

// 处理编辑器输入
const handleEditorInput = (content) => {
  currentContent.value = content
  renderPreview()
  playEditSound()
}

// 导出功能
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

// 初始化
onMounted(() => {
  updateStats()
  if (currentFile.value) {
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