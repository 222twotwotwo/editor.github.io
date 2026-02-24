<template>
  <Teleport to="body">
    <Transition name="modal-overlay">
      <div v-if="visible" class="modal-overlay" @click.self="handleOverlayClick">
        <Transition name="modal-content">
          <div v-if="visible" class="modal" :class="{ 'no-padding': noPadding }" @click.stop>
            <div v-if="title" class="modal-header">
              <h3 class="modal-title">{{ title }}</h3>
              <button v-if="closable" class="modal-close" @click="handleClose">×</button>
            </div>
            <div class="modal-body">
              <slot></slot>
            </div>
            <div v-if="$slots.footer || showDefaultFooter" class="modal-footer">
              <slot name="footer">
                <button v-if="showCancel" class="btn btn-cancel" @click="handleCancel">
                  {{ cancelText }}
                </button>
                <button class="btn btn-confirm" @click="handleConfirm">
                  {{ confirmText }}
                </button>
              </slot>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  closable: {
    type: Boolean,
    default: true
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  },
  noPadding: {
    type: Boolean,
    default: false
  },
  showDefaultFooter: {
    type: Boolean,
    default: false
  },
  showCancel: {
    type: Boolean,
    default: true
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  confirmText: {
    type: String,
    default: '确定'
  }
})

const emit = defineEmits(['update:modelValue', 'close', 'confirm', 'cancel'])

const visible = ref(props.modelValue)

onMounted(() => {
  visible.value = props.modelValue
})

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleClose = () => {
  visible.value = false
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    handleClose()
  }
}

const handleConfirm = () => {
  emit('confirm')
  handleClose()
}

const handleCancel = () => {
  emit('cancel')
  handleClose()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
}

.modal-overlay.modal-overlay-enter-active,
.modal-overlay.modal-overlay-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-overlay.modal-overlay-enter-from,
.modal-overlay.modal-overlay-leave-to {
  opacity: 0;
}

.modal {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
  min-width: 360px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

[data-theme="dark"] .modal {
  background: rgba(31, 41, 55, 0.98);
  border-color: rgba(255, 255, 255, 0.12);
}

.modal-content-enter-active,
.modal-content-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-content-enter-from,
.modal-content-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

[data-theme="dark"] .modal-header {
  border-color: rgba(255, 255, 255, 0.08);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

[data-theme="dark"] .modal-title {
  color: #f9fafb;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  color: #6b7280;
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

[data-theme="dark"] .modal-close {
  background: rgba(255, 255, 255, 0.08);
  color: #9ca3af;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #1f2937;
}

[data-theme="dark"] .modal-close:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #f9fafb;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 22px;
  color: #374151;
  line-height: 1.6;
}

[data-theme="dark"] .modal-body {
  color: #d1d5db;
}

.modal.no-padding .modal-body {
  padding: 0;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 22px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

[data-theme="dark"] .modal-footer {
  border-color: rgba(255, 255, 255, 0.08);
}

.btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel {
  background: rgba(0, 0, 0, 0.05);
  color: #374151;
}

[data-theme="dark"] .btn-cancel {
  background: rgba(255, 255, 255, 0.08);
  color: #d1d5db;
}

.btn-cancel:hover {
  background: rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] .btn-cancel:hover {
  background: rgba(255, 255, 255, 0.12);
}

.btn-confirm {
  background: #3b82f6;
  color: white;
}

.btn-confirm:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
}

.btn-confirm:active {
  transform: translateY(0);
}
</style>
