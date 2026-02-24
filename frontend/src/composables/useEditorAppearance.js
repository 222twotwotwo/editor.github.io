import { ref, computed } from 'vue'

const STORAGE_KEY = 'editorAppearance'

const DEFAULT_APPEARANCE = {
  fontSize: 16,
  lineHeight: 1.8,
  fontWeight: 400,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  letterSpacing: 0,
  padding: 24
}

const globalAppearance = ref({ ...DEFAULT_APPEARANCE })

export function useEditorAppearance() {
  const loadAppearance = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        globalAppearance.value = { ...DEFAULT_APPEARANCE, ...parsed }
      }
    } catch (e) {
      console.error('Failed to load appearance:', e)
    }
  }

  const saveAppearance = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalAppearance.value))
  }

  const updateGlobalAppearance = (key, value) => {
    if (key in globalAppearance.value) {
      globalAppearance.value[key] = value
      saveAppearance()
    }
  }

  const resetGlobalAppearance = () => {
    globalAppearance.value = { ...DEFAULT_APPEARANCE }
    saveAppearance()
  }

  const getGlobalAppearance = () => {
    return { ...globalAppearance.value }
  }

  loadAppearance()

  return {
    globalAppearance: computed(() => ({ ...globalAppearance.value })),
    DEFAULT_APPEARANCE,
    updateGlobalAppearance,
    resetGlobalAppearance,
    getGlobalAppearance
  }
}
