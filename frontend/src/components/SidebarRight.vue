<template>
  <aside class="sidebar-right" :class="{ collapsed }">
    <section class="panel">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3>📂 文件管理</h3>
        <div>
          <button @click="$emit('toggle-sidebar')" title="隐藏侧边栏">⊗</button>
        </div>
      </div>
      <div class="file-list">
        <div v-if="!files || Object.keys(files).length === 0" class="empty-file-list">
          无文件
        </div>
        <FileItem
          v-for="filename in Object.keys(files)"
          :key="filename"
          :filename="filename"
          :active="currentFile === filename"
          @click="$emit('open-file', filename)"
          @delete="$emit('delete-file', filename)"
        />
      </div>
    </section>
    
    <section class="panel">
      <h3>文件操作</h3>
      <input 
        :value="fileNameInput" 
        @input="$emit('update-file-name', $event.target.value)"
        placeholder="文件名（不含.md）"
      >
      <button @click="$emit('save-file')">💾 保存文件</button>
      <button @click="$emit('delete-file', currentFile)">🗑️ 删除当前文件</button>
      <button @click="$emit('import-file')">📂 导入文件</button>
    </section>
  </aside>
</template>

<script setup>
import FileItem from './FileItem.vue'

const props = defineProps({
  collapsed: Boolean,
  files: Object,
  currentFile: String,
  fileNameInput: String
})

defineEmits([
  'toggle-sidebar',
  'new-file',
  'open-file',
  'save-file',
  'delete-file',
  'import-file',
  'update-file-name'
])

const handleNewFile = () => {
  let defaultName = '新文件'
  let count = 1
  
  while (props.files[defaultName]) {
    defaultName = `新文件${count}`
    count++
  }
  
  // 直接修改文件系统状态
  props.files[defaultName] = ''
  // 保存到localStorage
  localStorage.setItem('markdownStudioFiles', JSON.stringify(props.files))
  
  // 触发打开新文件
  emit('open-file', defaultName)
  emit('update-file-name', defaultName)
}
</script>

<style scoped>
.sidebar-right {
  width: 280px;
  background: rgba(255, 255, 255, var(--panel-opacity));
  border-left: 1px solid var(--border);
  padding: 12px;
  transition: width .25s ease, padding .25s ease;
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
}

.panel {
  margin-bottom: 18px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
}

[data-theme="dark"] .panel {
  background: rgba(42, 42, 42, 0.9);
}

.panel h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.panel input,
.panel button {
  width: 100%;
  margin-bottom: 6px;
}

.file-list {
  border: 1px solid var(--border);
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.8);
}

[data-theme="dark"] .file-list {
  background: rgba(30, 30, 30, 0.8);
}

.empty-file-list {
  padding: 12px;
  text-align: center;
  color: #888;
}
</style>