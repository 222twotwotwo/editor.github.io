import { ref } from 'vue'

const toasts = ref([])
let toastIdCounter = 0

export function useToast() {
  const addToast = (message, type = 'info', duration = 3500) => {
    const id = ++toastIdCounter
    toasts.value.push({
      id,
      message,
      type,
      leaving: false
    })

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    return id
  }

  const removeToast = (id) => {
    const toast = toasts.value.find(t => t.id === id)
    if (toast) {
      toast.leaving = true
      setTimeout(() => {
        const index = toasts.value.findIndex(t => t.id === id)
        if (index !== -1) {
          toasts.value.splice(index, 1)
        }
      }, 300)
    }
  }

  const clearAll = () => {
    toasts.value.forEach(t => {
      t.leaving = true
    })
    setTimeout(() => {
      toasts.value = []
    }, 300)
  }

  const success = (msg, duration) => addToast(msg, 'success', duration)
  const error = (msg, duration) => addToast(msg, 'error', duration)
  const warning = (msg, duration) => addToast(msg, 'warning', duration)
  const info = (msg, duration) => addToast(msg, 'info', duration)

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info
  }
}
