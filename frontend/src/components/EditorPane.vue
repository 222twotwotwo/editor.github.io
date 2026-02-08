<template>
  <div class="editor-container">
    <textarea 
      id="editor" 
      v-model="editorContent"
      @input="handleInput"
      placeholder="在这里编写 Markdown..."
    ></textarea>
    <div 
      id="preview" 
      v-html="previewContent"
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
  background: rgba(255, 255, 255, var(--panel-opacity));
  overflow-y: auto;
  backdrop-filter: blur(8px);
  font-size: 14px;
  line-height: 1.6;
}

[data-theme="dark"] #preview {
  background: rgba(42, 42, 42, var(--panel-opacity));
}

#preview pre.hljs {
  margin: 12px 0;
  padding: 16px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.8) !important;
}

#preview pre.hljs code {
  line-height: 1.5;
}
</style>