import { ref, watch } from 'vue'

const STORAGE_KEY = 'editorAppearance'

const DEFAULT_SETTINGS = {
  fontSize: 16,
  lineHeight: 1.8,
  fontWeight: 400,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  letterSpacing: 0,
  padding: 24
}

const settings = ref({ ...DEFAULT_SETTINGS })
let isInitialized = false

export function useEditorAppearance() {
  const loadSettings = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        settings.value = { ...DEFAULT_SETTINGS, ...parsed }
      } catch (e) {
        console.error('Failed to load editor appearance settings:', e)
      }
    }
  }

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
  }

  const updateSetting = (key, value) => {
    if (key in settings.value) {
      settings.value[key] = value
    }
  }

  const resetSettings = () => {
    settings.value = { ...DEFAULT_SETTINGS }
  }

  if (!isInitialized) {
    isInitialized = true
    loadSettings()
    watch(settings, () => {
      saveSettings()
    }, { deep: true })
  }

  const applyStyle = (element) => {
    if (!element) return
    element.style.fontSize = `${settings.value.fontSize}px`
    element.style.lineHeight = settings.value.lineHeight
    element.style.fontWeight = settings.value.fontWeight
    element.style.fontFamily = settings.value.fontFamily
    element.style.letterSpacing = `${settings.value.letterSpacing}px`
    element.style.padding = `${settings.value.padding}px`
  }

  return {
    settings,
    loadSettings,
    updateSetting,
    resetSettings,
    applyStyle
  }
}
