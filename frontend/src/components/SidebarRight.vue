<template>
  <aside class="sidebar-right" :class="{ collapsed }">
    <section class="panel">
      <h3>📂 我的文档</h3>
      <div class="document-list">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="!documents || documents.length === 0" class="empty-list">
          暂无文档
        </div>
        <div
          v-else
          v-for="doc in documents"
          :key="doc.id"
          class="document-item"
          :class="{ active: currentFile === doc.filename.replace(/\.md$/, '') }"
          @click="openDocument(doc)"
        >
          <div class="document-info">
            <div class="document-title">{{ doc.title }}</div>
            <div class="document-meta">
              <span>{{ formatFileSize(doc.file_size) }}</span>
              <span>{{ formatDate(doc.updated_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="panel ai-panel">
      <h3>✨ AI 续写</h3>
      <label class="ai-toggle-row">
        <span class="ai-toggle-label">启用 AI 续写</span>
        <input
          type="checkbox"
          :checked="aiEnabled"
          @change="toggleAiEnabled"
        >
      </label>
      <div v-if="aiEnabled" class="api-key-row">
        <label class="api-key-label">API 密钥 (DeepSeek)</label>
        <input
          type="password"
          :value="apiKey"
          @input="setApiKey($event.target.value)"
          placeholder="sk- 粘贴你的 API 密钥"
          class="api-key-input"
        >
      </div>
    </section>

    <section class="panel">
      <h3>文档操作</h3>
      <input
        :value="fileNameInput"
        @input="$emit('update-file-name', $event.target.value)"
        placeholder="文档标题"
      >
      <div class="button-group">
        <button type="button" @click="$emit('save-file')">💾 保存到数据库</button>
        <button type="button" @click="$emit('import-file')">📂 导入文档</button>
        <button
          type="button"
          class="delete-current-btn"
          :disabled="!currentDoc"
          @click="deleteCurrentDocument"
        >🗑️ 删除当前文档</button>
      </div>
    </section>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useDocument } from '../composables/useDocument'
import { useAiContinuationSettings } from '../composables/useAiContinuationSettings'

const { aiEnabled, apiKey, setApiKey, toggleAiEnabled } = useAiContinuationSettings()

const props = defineProps({
  collapsed: Boolean,
  fileNameInput: String,
  currentFile: String
})

const emit = defineEmits([
  'open-file',
  'save-file',
  'delete-file',
  'import-file',
  'update-file-name'
])

const { documents, loading, deleteDocument: deleteDoc, fetchDocuments } = useDocument()

const currentDoc = computed(() => {
  if (!props.currentFile || !documents.value?.length) return null
  return documents.value.find(doc => doc.filename.replace(/\.md$/, '') === props.currentFile) || null
})

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const openDocument = (doc) => {
  emit('open-file', doc)
}

const deleteCurrentDocument = async () => {
  const doc = currentDoc.value
  if (!doc || !confirm(`确定要删除 "${doc.title}" 吗？`)) return
  const result = await deleteDoc(doc.id)
  if (result.success) {
    await fetchDocuments()
    emit('delete-file', doc)
  }
}
</script>

<style scoped>
.sidebar-right {
  width: 320px;
  background: rgba(255, 255, 255, var(--panel-opacity));
  border-left: 1px solid var(--border);
  padding: 12px;
  transition: width 0.25s ease, padding 0.25s ease;
  overflow-y: auto;
  backdrop-filter: blur(8px);
}

[data-theme="dark"] .sidebar-right {
  background: rgba(42, 42, 42, var(--panel-opacity));
}

.sidebar-right.collapsed {
  width: 0;
  padding: 0;
  border-left: none;
  overflow: hidden;
  min-width: 0;
}

.panel {
  margin-bottom: 18px;
}

.panel h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.panel input {
  width: 100%;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.document-list {
  border: 1px solid var(--border);
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.8);
}

[data-theme="dark"] .document-list {
  background: rgba(30, 30, 30, 0.8);
}

.document-item {
  padding: 10px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
}

.document-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.document-item.active {
  background-color: rgba(59, 130, 246, 0.1);
  font-weight: bold;
}

.document-item:last-child {
  border-bottom: none;
}

.document-info {
  flex: 1;
  overflow: hidden;
}

.document-title {
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text);
  opacity: 0.7;
}

.button-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 12px;
}

.button-group button {
  margin: 0;
}

.delete-current-btn {
  grid-column: 1 / -1;
}

.delete-current-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading,
.empty-list {
  padding: 20px;
  text-align: center;
  color: var(--text);
  opacity: 0.7;
}

/* AI 续写面板 */
.ai-panel .ai-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  cursor: pointer;
}

.ai-toggle-label {
  font-size: 13px;
  color: var(--text);
}

.ai-panel input[type="checkbox"] {
  width: auto;
  margin: 0;
  cursor: pointer;
}

.api-key-row {
  margin-top: 8px;
}

.api-key-label {
  display: block;
  font-size: 12px;
  color: var(--text);
  opacity: 0.85;
  margin-bottom: 4px;
}

.api-key-input {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 0;
}
</style>
