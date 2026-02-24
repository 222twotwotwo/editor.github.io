<template>
  <div class="custom-input-wrapper" :class="{ disabled: disabled, error: error }">
    <label v-if="label" class="input-label">{{ label }}</label>
    <input
      ref="inputRef"
      v-bind="$attrs"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      class="custom-input"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @keyup.enter="$emit('enter')"
    />
    <span v-if="error" class="input-error">{{ error }}</span>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'enter'])

const inputRef = ref(null)
const isFocused = ref(false)

const handleInput = (e) => {
  emit('update:modelValue', e.target.value)
}

const handleFocus = (e) => {
  isFocused.value = true
  emit('focus', e)
}

const handleBlur = (e) => {
  isFocused.value = false
  emit('blur', e)
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur()
})
</script>

<style scoped>
.custom-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.custom-input-wrapper.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.input-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

[data-theme="dark"] .input-label {
  color: #d1d5db;
}

.custom-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.5;
  color: #1f2937;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

[data-theme="dark"] .custom-input {
  background: rgba(31, 41, 55, 0.8);
  color: #f9fafb;
  border-color: rgba(255, 255, 255, 0.12);
}

.custom-input::placeholder {
  color: #9ca3af;
}

[data-theme="dark"] .custom-input::placeholder {
  color: #6b7280;
}

.custom-input:hover {
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(255, 255, 255, 0.85);
}

[data-theme="dark"] .custom-input:hover {
  border-color: rgba(96, 165, 250, 0.5);
  background: rgba(45, 55, 72, 0.9);
}

.custom-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
  background: rgba(255, 255, 255, 0.95);
}

[data-theme="dark"] .custom-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.2);
  background: rgba(55, 65, 81, 0.95);
}

.custom-input-wrapper.error .custom-input {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.custom-input-wrapper.error .custom-input:focus {
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15);
}

.input-error {
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
}
</style>
