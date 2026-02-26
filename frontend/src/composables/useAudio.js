import { ref, onMounted } from 'vue'

// 全局单例：保证所有使用 useAudio 的组件共享同一套音效开关与解锁状态，
// 这样 TopBar 的开关会同步到 AI 续写、桌宠等处的音效
const soundEnabled = ref(localStorage.getItem('soundEnabled') === '1')
const audioUnlocked = ref(false)
const editPlaying = ref(false)
const petPlaying = ref(false)
let editAudio, exportAudio, petAudio
let audioInitialized = false

function initAudio() {
  if (audioInitialized) return
  audioInitialized = true
  editAudio = new Audio('/audio/edit.mp3')
  exportAudio = new Audio('/audio/export.mp3')
  petAudio = new Audio('/audio/pet.mp3')
  editAudio.volume = 0.4
  exportAudio.volume = 0.6
  petAudio.volume = 0.4
  editAudio.addEventListener('ended', () => { editPlaying.value = false })
  petAudio.addEventListener('ended', () => { petPlaying.value = false })
  document.addEventListener('click', () => {
    if (!audioUnlocked.value && editAudio) {
      editAudio.play().then(() => {
        editAudio.pause()
        editAudio.currentTime = 0
        audioUnlocked.value = true
      }).catch(() => {})
    }
  }, { once: true })
}

export function useAudio() {
  onMounted(() => {
    initAudio()
  })

  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
    localStorage.setItem('soundEnabled', soundEnabled.value ? '1' : '0')
  }

  const playEditSound = () => {
    if (!audioInitialized) initAudio()
    if (!audioUnlocked.value || !soundEnabled.value || editPlaying.value) return
    
    editPlaying.value = true
    editAudio.currentTime = 0
    
    const playPromise = editAudio.play()
    
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        editPlaying.value = false
      })
    }
  }

  const playExportSound = () => {
    if (!audioInitialized) initAudio()
    if (!audioUnlocked.value || !soundEnabled.value) return
    
    exportAudio.currentTime = 0
    
    const playPromise = exportAudio.play()
    
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        console.log('导出音效播放失败')
      })
    }
  }

  const playPetSound = () => {
    if (!audioInitialized) initAudio()
    if (!audioUnlocked.value || !soundEnabled.value || petPlaying.value) return
    
    petPlaying.value = true
    petAudio.currentTime = 0
    
    const playPromise = petAudio.play()
    
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        petPlaying.value = false
      })
    }
  }

  const playSound = (src) => {
    if (!audioInitialized) initAudio()
    if (!audioUnlocked.value || !soundEnabled.value) return false
    
    try {
      // 创建临时音频对象
      const audio = new Audio(src)
      audio.volume = 0.5
      
      // 播放并返回Promise
      return audio.play().then(() => {
        return true
      }).catch((error) => {
        console.warn('音频播放失败:', error)
        return false
      })
    } catch (error) {
      console.error('音频创建失败:', error)
      return Promise.resolve(false)
    }
  }

  return {
    soundEnabled,
    toggleSound,
    playEditSound,
    playExportSound,
    playPetSound,
    playSound
  }
}
