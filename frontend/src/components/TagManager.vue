<template>
  <div class="tag-manager">
    <div class="tag-header">
      <h3>标签管理</h3>
      <button class="add-tag-btn" @click="openAddModal">
        ➕ 新建标签
      </button>
    </div>
    
    <div class="tags-list" v-if="tags.length > 0">
      <div 
        v-for="tag in tags" 
        :key="tag.id" 
        class="tag-item"
      >
        <div class="tag-info">
          <span class="tag-color-preview" :style="{ background: tag.color }"></span>
          <span class="tag-name">{{ tag.name }}</span>
        </div>
        <div class="tag-actions">
          <button class="tag-action-btn edit" @click="editTag(tag)">✏️</button>
          <button class="tag-action-btn delete" @click="confirmDeleteTag(tag)">🗑️</button>
        </div>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <p>还没有标签，点击上方按钮创建一个吧！</p>
    </div>

    <!-- 新建/编辑标签弹窗 -->
    <CustomModal 
      v-model="modalVisible"
      :title="isEditing ? '编辑标签' : '新建标签'"
      :show-default-footer="true"
      :prevent-close="true"
      confirm-text="保存"
      @confirm="saveTag"
    >
      <div class="tag-form">
        <div class="form-group">
          <label>标签名称 <span class="required">*</span></label>
          <input
            type="text"
            v-model="tagForm.name"
            placeholder="输入标签名称"
            maxlength="50"
            :class="{ 'input-error': nameError }"
            @input="nameError = false"
          >
          <span v-if="nameError" class="error-msg">请输入标签名称</span>
        </div>
        <div class="form-group">
          <label>标签颜色</label>
          <div class="color-picker">
            <input type="color" v-model="tagForm.color">
            <span class="color-preview" :style="{ background: tagForm.color }"></span>
          </div>
        </div>
      </div>
    </CustomModal>

    <!-- 删除确认弹窗 -->
    <CustomModal
      v-model="deleteModalVisible"
      title="删除标签"
      :show-default-footer="true"
      confirm-text="确认删除"
      @confirm="doDeleteTag"
    >
      <p class="delete-confirm-text">确定要删除标签「<strong>{{ deletingTag?.name }}</strong>」吗？已关联该标签的文档/任务将自动解除关联。</p>
    </CustomModal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { tagAPI } from '../services/api'
import { useToast } from '../composables/useToast'
import CustomModal from './CustomModal.vue'

const { success, error, warning } = useToast()

const emit = defineEmits(['tags-updated'])

const tags = ref([])
const modalVisible = ref(false)
const isEditing = ref(false)
const editingTagId = ref(null)
const nameError = ref(false)
const deleteModalVisible = ref(false)
const deletingTag = ref(null)

const tagForm = ref({
  name: '',
  color: '#3b82f6'
})

const fetchTags = async () => {
  try {
    const res = await tagAPI.list()
    if (res && res.success !== false && res.data?.list) {
      tags.value = res.data.list
    }
  } catch (err) {
    error('获取标签列表失败，请检查网络连接')
  }
}

const openAddModal = () => {
  tagForm.value = { name: '', color: '#3b82f6' }
  nameError.value = false
  isEditing.value = false
  modalVisible.value = true
}

const editTag = (tag) => {
  editingTagId.value = tag.id
  tagForm.value = { name: tag.name, color: tag.color }
  nameError.value = false
  isEditing.value = true
  modalVisible.value = true
}

const saveTag = async () => {
  if (!tagForm.value.name.trim()) {
    nameError.value = true
    warning('请输入标签名称')
    return
  }

  try {
    if (isEditing.value) {
      await tagAPI.update(editingTagId.value, tagForm.value)
      success('标签已更新')
    } else {
      await tagAPI.create(tagForm.value)
      success('标签已创建')
    }
    await fetchTags()
    emit('tags-updated')
    modalVisible.value = false
    resetForm()
  } catch (err) {
    error(isEditing.value ? '更新标签失败，请重试' : '创建标签失败，请重试')
  }
}

const confirmDeleteTag = (tag) => {
  deletingTag.value = tag
  deleteModalVisible.value = true
}

const doDeleteTag = async () => {
  if (!deletingTag.value) return
  const tag = deletingTag.value
  try {
    await tagAPI.delete(tag.id)
    success(`标签「${tag.name}」已删除`)
    await fetchTags()
    emit('tags-updated')
  } catch (err) {
    error('删除标签失败，请重试')
  } finally {
    deletingTag.value = null
  }
}

const resetForm = () => {
  isEditing.value = false
  editingTagId.value = null
  nameError.value = false
  tagForm.value = { name: '', color: '#3b82f6' }
}

onMounted(() => {
  fetchTags()
})
</script>

<style scoped>
.tag-manager {
  padding: 20px;
}

.tag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tag-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 700;
}

.add-tag-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.add-tag-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tag-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.tag-item:hover {
  background: var(--bg-primary);
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.tag-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.tag-color-preview {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.tag-name {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 15px;
}

.tag-actions {
  display: flex;
  gap: 6px;
}

.tag-action-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
}

.tag-action-btn:hover {
  background: var(--bg-secondary);
  transform: scale(1.05);
}

.tag-action-btn.edit:hover {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
}

.tag-action-btn.delete:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state p {
  font-size: 15px;
  font-weight: 500;
}

.tag-form {
  padding: 8px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 10px;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 14px;
}

.required {
  color: #ef4444;
  margin-left: 2px;
}

.error-msg {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
}

.delete-confirm-text {
  margin: 0;
  font-size: 15px;
  color: var(--text-primary);
  line-height: 1.6;
}

.delete-confirm-text strong {
  color: #ef4444;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 15px;
  box-sizing: border-box;
  transition: all 0.2s;
}

.form-group input[type="text"]:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-group input.input-error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 14px;
}

.color-picker input[type="color"] {
  width: 56px;
  height: 44px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.color-preview {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 2px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] .tag-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

[data-theme="dark"] .form-group input[type="text"] {
  background: rgba(255, 255, 255, 0.03);
}
</style>
