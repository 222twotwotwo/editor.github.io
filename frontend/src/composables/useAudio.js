
import { ref, onMounted } from 'vue'

export function useAudio() {
  const soundEnabled = ref(localStorage.getItem('soundEnabled') === '1')
  const audioUnlocked = ref(false)
  
  // 添加播放状态跟踪
  const editPlaying = ref(false)
  const petPlaying = ref(false)
  
  // 使用单个Audio实例（和原项目一致）
  let editAudio, exportAudio, petAudio

  onMounted(() => {
    editAudio = new Audio('/audio/edit.mp3')
    exportAudio = new Audio('/audio/export.mp3')
    petAudio = new Audio('/audio/pet.mp3')
    
    editAudio.volume = 0.4
    exportAudio.volume = 0.6
    petAudio.volume = 0.4  // 宠物音效使用较低音量
    
    // 监听编辑音效播放结束
    editAudio.addEventListener('ended', () => {
      editPlaying.value = false
    })
    
    // 监听宠物音效播放结束
    petAudio.addEventListener('ended', () => {
      petPlaying.value = false
    })

    // 解锁音频
    document.addEventListener('click', () => {
      if (!audioUnlocked.value) {
        editAudio.play().then(() => {
          editAudio.pause()
          editAudio.currentTime = 0
          audioUnlocked.value = true
        }).catch(() => {})
      }
    }, { once: true })
  })

  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
    localStorage.setItem('soundEnabled', soundEnabled.value ? '1' : '0')
  }

  const playEditSound = () => {
    // 和原项目一致：音频未解锁、音效关闭、正在播放时跳过
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
    // 和原项目一致：音频未解锁、音效关闭时跳过，不检查播放状态
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
    // 和编辑音效类似：音频未解锁、音效关闭、正在播放时跳过
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
    // 通用的音频播放函数，支持任意音频文件
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
