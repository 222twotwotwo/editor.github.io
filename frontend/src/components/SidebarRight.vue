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
          v-for="doc in sortedDocuments"
          :key="doc.id"
          class="document-item"
          :class="{ active: currentFile && doc.filename && currentFile === doc.filename.replace(/\.md$/, '') }"
          @click="openDocument(doc)"
          @contextmenu="openTagPicker($event, doc)"
        >
          <div class="document-info">
            <div class="document-title">{{ doc.title }}</div>
            <div class="document-meta">
              <span>{{ formatFileSize(doc.file_size) }}</span>
              <span>{{ formatDate(doc.updated_at) }}</span>
            </div>
            <div v-if="docTagsMap[doc.id] && docTagsMap[doc.id].length" class="doc-tag-dots">
              <span
                v-for="tag in docTagsMap[doc.id]"
                :key="tag.id"
                class="doc-tag-dot"
                :style="{ background: tag.color }"
                :title="tag.name"
              ></span>
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
          @change="(e) => {
            toggleAiEnabled()
            if (e.target.checked) playEditSound()
          }"
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
      <button type="button" class="new-doc-btn" @click="$emit('new-file')">📄 新建MD</button>
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
          @click="openDeleteConfirm"
        >🗑️ 删除当前文档</button>
      </div>
    </section>

    <!-- 标签选择浮层 -->
    <Teleport to="body">
      <div
        v-if="tagPickerVisible"
        class="sr-tag-picker-overlay"
        @click.self="closeTagPicker"
        @contextmenu.prevent="closeTagPicker"
      >
        <div
          class="sr-tag-picker-panel"
          :style="{ left: tagPickerPosition.x + 'px', top: tagPickerPosition.y + 'px' }"
        >
          <div class="sr-tag-picker-header">
            <span>🏷️ 添加标签</span>
            <button class="sr-tag-picker-close" @click="closeTagPicker">×</button>
          </div>
          <div v-if="allTags.length === 0" class="sr-tag-picker-empty">
            暂无标签，请先在标签管理中创建
          </div>
          <div v-else class="sr-tag-picker-list">
            <div
              v-for="tag in allTags"
              :key="tag.id"
              class="sr-tag-picker-item"
              :class="{ active: isTagActive(tag.id) }"
              @click="toggleDocTag(tag)"
            >
              <span class="sr-tag-dot" :style="{ background: tag.color }"></span>
              <span class="sr-tag-name">{{ tag.name }}</span>
              <span v-if="isTagActive(tag.id)" class="sr-tag-check">✓</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认弹窗（与保存提示同款 CustomModal） -->
    <CustomModal
      v-model="deleteModalVisible"
      title="确认删除"
      :show-default-footer="true"
      :show-cancel="true"
      cancel-text="取消"
      confirm-text="确定"
      @confirm="confirmDelete"
    >
      <p>{{ deleteConfirmMessage }}</p>
    </CustomModal>
  </aside>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useDocument } from '../composables/useDocument'
import { useAiContinuationSettings } from '../composables/useAiContinuationSettings'
import { useAudio } from '../composables/useAudio'
import { tagAPI } from '../services/api'
import CustomModal from './CustomModal.vue'

const { aiEnabled, apiKey, setApiKey, toggleAiEnabled } = useAiContinuationSettings()
const { playEditSound } = useAudio()

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
  'update-file-name',
  'new-file'
])

const { documents, sortedDocuments, loading, deleteDocument: deleteDoc, fetchDocuments } = useDocument()

// 文档标签缓存
const docTagsMap = ref({})
const allTags = ref([])

// 标签选择浮层状态
const tagPickerVisible = ref(false)
const tagPickerPosition = ref({ x: 0, y: 0 })
const tagPickerDoc = ref(null)
const tagPickerDocTags = ref([])

const loadDocTags = async (docId) => {
  try {
    const res = await tagAPI.getDocumentTags(docId)
    let tags = []
    if (res?.data?.list) {
      tags = res.data.list
    } else if (Array.isArray(res?.data)) {
      tags = res.data
    }
    docTagsMap.value = { ...docTagsMap.value, [docId]: tags }
  } catch {
    docTagsMap.value = { ...docTagsMap.value, [docId]: [] }
  }
}

// 分批并发加载标签，每批最多 5 个请求，避免同时发起大量请求
const loadAllDocTags = async () => {
  const docs = sortedDocuments.value
  if (!docs?.length) return
  const BATCH_SIZE = 5
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(d => loadDocTags(d.id)))
  }
}

const loadAllTags = async () => {
  try {
    const res = await tagAPI.list()
    if (res?.data?.list) allTags.value = res.data.list
  } catch (err) {
    console.error('获取标签列表失败', err)
  }
}

const isTagActive = (tagId) => tagPickerDocTags.value.some(t => t.id === tagId)

const openTagPicker = async (e, doc) => {
  e.preventDefault()
  e.stopPropagation()
  if (allTags.value.length === 0) await loadAllTags()
  tagPickerDoc.value = doc
  tagPickerDocTags.value = [...(docTagsMap.value[doc.id] || [])]
  const panelWidth = 220
  const panelHeight = 300
  const x = e.clientX + panelWidth > window.innerWidth
    ? e.clientX - panelWidth
    : e.clientX
  const y = e.clientY + panelHeight > window.innerHeight
    ? e.clientY - panelHeight
    : e.clientY
  tagPickerPosition.value = { x, y }
  tagPickerVisible.value = true
}

const toggleDocTag = async (tag) => {
  if (!tagPickerDoc.value) return
  const docId = tagPickerDoc.value.id
  const active = isTagActive(tag.id)
  try {
    if (active) {
      await tagAPI.removeDocumentTag(docId, tag.id)
      tagPickerDocTags.value = tagPickerDocTags.value.filter(t => t.id !== tag.id)
    } else {
      await tagAPI.addDocumentTag(docId, tag.id)
      tagPickerDocTags.value = [...tagPickerDocTags.value, tag]
    }
    docTagsMap.value = { ...docTagsMap.value, [docId]: [...tagPickerDocTags.value] }
  } catch (err) {
    console.error('操作文档标签失败', err)
  }
}

const closeTagPicker = () => {
  tagPickerVisible.value = false
  tagPickerDoc.value = null
  tagPickerDocTags.value = []
}

const currentDoc = computed(() => {
  if (!props.currentFile || !documents.value?.length) return null
  return documents.value.find(doc => doc.filename && doc.filename.replace(/\.md$/, '') === props.currentFile) || null
})

const formatFileSize = (bytes) => {
  if (bytes == null || isNaN(bytes) || bytes < 0) return '-'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('zh-CN')
}

const openDocument = (doc) => {
  emit('open-file', doc)
}

const deleteModalVisible = ref(false)
const docToDelete = ref(null)

const deleteConfirmMessage = computed(() => {
  const doc = docToDelete.value
  return doc ? `确定要删除「${doc.title}」吗？` : ''
})

const openDeleteConfirm = () => {
  const doc = currentDoc.value
  if (!doc) return
  docToDelete.value = doc
  deleteModalVisible.value = true
}

const confirmDelete = async () => {
  const doc = docToDelete.value
  docToDelete.value = null
  if (!doc) return
  const result = await deleteDoc(doc.id)
  if (result.success) {
    await fetchDocuments()
    emit('delete-file', doc)
  }
}

onMounted(async () => {
  await loadAllTags()
  await loadAllDocTags()
})
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

.new-doc-btn {
  width: 100%;
  margin-bottom: 12px;
  padding: 8px 12px;
  cursor: pointer;
  background: var(--primary, #3b82f6);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  transition: opacity 0.2s;
}

.new-doc-btn:hover {
  opacity: 0.9;
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

.doc-tag-dots {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.doc-tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}


</style>

<style>
.sr-tag-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.sr-tag-picker-panel {
  position: fixed;
  min-width: 200px;
  max-width: 260px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  overflow: hidden;
  z-index: 10000;
}

[data-theme="dark"] .sr-tag-picker-panel {
  background: #2a2a2a;
  border-color: #444;
}

.sr-tag-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px 7px;
  font-size: 13px;
  font-weight: 600;
  color: #222;
  border-bottom: 1px solid #eee;
}

[data-theme="dark"] .sr-tag-picker-header {
  color: #eee;
  border-bottom-color: #444;
}

.sr-tag-picker-close {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  color: #888;
  line-height: 1;
  padding: 0 2px;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.sr-tag-picker-close:hover {
  opacity: 1;
}

.sr-tag-picker-empty {
  padding: 18px 12px;
  font-size: 12px;
  color: #888;
  text-align: center;
}

.sr-tag-picker-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 6px;
}

.sr-tag-picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #222;
  transition: background 0.13s;
}

[data-theme="dark"] .sr-tag-picker-item {
  color: #eee;
}

.sr-tag-picker-item:hover {
  background: rgba(0,0,0,0.06);
}

[data-theme="dark"] .sr-tag-picker-item:hover {
  background: rgba(255,255,255,0.08);
}

.sr-tag-picker-item.active {
  background: rgba(59,130,246,0.1);
}

.sr-tag-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.sr-tag-name {
  flex: 1;
}

.sr-tag-check {
  color: #3b82f6;
  font-weight: 700;
  font-size: 14px;
}
</style>
