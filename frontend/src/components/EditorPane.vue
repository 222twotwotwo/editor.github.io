<template>
  <div class="editor-container">
    <textarea 
      ref="editorRef"
      id="editor" 
      v-model="editorContent"
      @input="handleInput"
      @scroll="syncPreviewToEditor"
      placeholder="在这里编写 Markdown..."
    ></textarea>
    <div 
      ref="previewRef"
      id="preview" 
      v-html="previewContent"
      @click="onPreviewClick"
    ></div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: String,
  previewContent: String
})

const emit = defineEmits(['update:modelValue'])

const editorContent = ref(props.modelValue)

watch(() => props.modelValue, (newValue) => {
  editorContent.value = newValue
})

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}

const editorRef = ref(null)
const previewRef = ref(null)

// 编辑区滚动时，按比例同步预览区滚动（预览区无滚动条，仅跟随编辑区）
function syncPreviewToEditor () {
  const editor = editorRef.value
  const preview = previewRef.value
  if (!editor || !preview) return
  const editorMax = editor.scrollHeight - editor.clientHeight
  const previewMax = preview.scrollHeight - preview.clientHeight
  if (editorMax <= 0 || previewMax <= 0) return
  const ratio = editor.scrollTop / editorMax
  preview.scrollTop = ratio * previewMax
}

// 预览区点击：代码块复制按钮
function onPreviewClick (e) {
  const btn = e.target.closest('.copy-code-btn')
  if (!btn) return
  const wrapper = btn.closest('.code-block-wrapper')
  if (!wrapper) return
  const codeEl = wrapper.querySelector('pre.hljs code')
  if (!codeEl) return
  const text = codeEl.textContent || ''
  const label = btn.textContent
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '已复制'
    btn.classList.add('copied')
    setTimeout(() => {
      btn.textContent = label
      btn.classList.remove('copied')
    }, 1500)
  }).catch(() => {
    btn.textContent = '复制失败'
    setTimeout(() => { btn.textContent = label }, 1500)
  })
}
</script>

<style scoped>
.editor-container {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  height: 100%;
}

#editor {
  padding: 12px;
  font-family: monospace;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: rgba(255, 255, 255, var(--panel-opacity));
  color: var(--text);
  backdrop-filter: blur(8px);
  resize: none;
  font-size: 14px;
  line-height: 1.5;
}

[data-theme="dark"] #editor {
  background: rgba(42, 42, 42, var(--panel-opacity));
}

#preview {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: rgba(255, 255, 255, var(--panel-opacity));
  overflow-y: auto;
  overflow-x: hidden;
  backdrop-filter: blur(8px);
  font-size: 14px;
  line-height: 1.6;
  /* 隐藏滚动条，滚动由编辑区拖动时同步 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}
#preview::-webkit-scrollbar {
  display: none;
}

[data-theme="dark"] #preview {
  background: rgba(42, 42, 42, var(--panel-opacity));
}

#preview pre.hljs code {
  line-height: 1.5;
}
</style>