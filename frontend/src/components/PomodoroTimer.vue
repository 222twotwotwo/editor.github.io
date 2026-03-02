<template>
  <div class="pomodoro-timer">
    <div class="timer-display" :class="{ 'is-running': isRunning, 'is-break': isBreakMode }">
      <div class="mode-badge" :class="isBreakMode ? 'break' : 'work'">
        {{ isBreakMode ? '☕ 休息中' : '💼 工作中' }}
      </div>
      <div class="time">{{ formatTime(timeLeft) }}</div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>
    <div class="timer-controls">
      <button class="control-btn start-btn" @click="toggleTimer" :class="{ 'is-running': isRunning }">
        {{ isRunning ? '⏸ 暂停' : '▶ 开始' }}
      </button>
      <button class="control-btn reset-btn" @click="resetTimer" :disabled="isRunning">🔄 重置</button>
      <button class="control-btn mode-btn" @click="toggleMode">
        {{ isBreakMode ? '💼 去工作' : '☕ 去休息' }}
      </button>
    </div>
    <div class="timer-settings">
      <div class="setting-item">
        <label>工作时长</label>
        <div class="input-group">
          <input type="number" v-model.number="workMinutes" min="1" max="60" :disabled="isRunning">
          <span>分钟</span>
        </div>
      </div>
      <div class="setting-item">
        <label>休息时长</label>
        <div class="input-group">
          <input type="number" v-model.number="breakMinutes" min="1" max="30" :disabled="isRunning">
          <span>分钟</span>
        </div>
      </div>
    </div>
    <div class="pomodoro-stats">
      <span>🍅 今日完成: <strong>{{ completedPomodoros }}</strong> 个番茄</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const emit = defineEmits(['complete'])

const workMinutes = ref(25)
const breakMinutes = ref(5)
const timeLeft = ref(25 * 60)
const isRunning = ref(false)
const isBreakMode = ref(false)
const completedPomodoros = ref(0)
let timer = ref(null)

const totalSeconds = computed(() => {
  return (isBreakMode.value ? breakMinutes.value : workMinutes.value) * 60
})

const progressPercent = computed(() => {
  const total = totalSeconds.value
  if (total === 0) return 0
  return Math.round(((total - timeLeft.value) / total) * 100)
})

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const toggleTimer = () => {
  if (isRunning.value) {
    stopTimer()
  } else {
    startTimer()
  }
}

const startTimer = () => {
  isRunning.value = true
  timer.value = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      completeTimer()
    }
  }, 1000)
}

const stopTimer = () => {
  isRunning.value = false
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
}

const completeTimer = () => {
  stopTimer()
  if (!isBreakMode.value) {
    completedPomodoros.value++
    emit('complete')
  }
  isBreakMode.value = !isBreakMode.value
  resetTimer()
}

const resetTimer = () => {
  stopTimer()
  timeLeft.value = (isBreakMode.value ? breakMinutes.value : workMinutes.value) * 60
}

const toggleMode = () => {
  isBreakMode.value = !isBreakMode.value
  resetTimer()
}

watch([workMinutes, breakMinutes, isBreakMode], () => {
  if (!isRunning.value) {
    resetTimer()
  }
})

const loadStats = () => {
  const saved = localStorage.getItem('pomodoroStats')
  if (saved) {
    const data = JSON.parse(saved)
    if (data.date === new Date().toDateString()) {
      completedPomodoros.value = data.count || 0
    }
    workMinutes.value = data.workMinutes || 25
    breakMinutes.value = data.breakMinutes || 5
  }
}

const saveStats = () => {
  localStorage.setItem('pomodoroStats', JSON.stringify({
    date: new Date().toDateString(),
    count: completedPomodoros.value,
    workMinutes: workMinutes.value,
    breakMinutes: breakMinutes.value
  }))
}

watch(completedPomodoros, saveStats)
watch(workMinutes, saveStats)
watch(breakMinutes, saveStats)

onMounted(() => {
  loadStats()
})

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped>
.pomodoro-timer {
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 16px;
  user-select: none;
  border: 1px solid var(--border-color);
}

.timer-display {
  text-align: center;
  padding: 24px 24px 20px;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  border-radius: 20px;
  margin-bottom: 20px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.timer-display::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.06) 100%);
  pointer-events: none;
}

.timer-display.is-running {
  box-shadow: 0 0 40px rgba(59, 130, 246, 0.4), 
              0 0 80px rgba(59, 130, 246, 0.2),
              inset 0 0 20px rgba(59, 130, 246, 0.1);
  transform: scale(1.02);
}

.timer-display.is-break {
  box-shadow: 0 0 40px rgba(34, 197, 94, 0.4),
              0 0 80px rgba(34, 197, 94, 0.2),
              inset 0 0 20px rgba(34, 197, 94, 0.1);
}

.timer-display.is-break.is-running {
  transform: scale(1.02);
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
}

.mode-badge.work {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.mode-badge.break {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.time {
  font-size: 56px;
  font-weight: 800;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  letter-spacing: 2px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
  line-height: 1;
  margin-bottom: 16px;
}

.progress-bar {
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-hover));
  border-radius: 2px;
  transition: width 1s linear;
}

.timer-display.is-break .progress-fill {
  background: linear-gradient(90deg, #22c55e, #16a34a);
}

.timer-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.control-btn {
  flex: 1;
  padding: 11px 12px;
  border: none;
  border-radius: 12px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border-color);
}

.control-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.control-btn:active:not(:disabled) {
  transform: translateY(0);
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.start-btn {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  flex: 1.5;
}

.start-btn:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
  color: white;
  border-color: transparent;
}

.start-btn.is-running {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
}

.start-btn.is-running:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.35);
}

.timer-settings {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.setting-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-primary);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.setting-item label {
  font-weight: 600;
  color: var(--text-primary);
}

.setting-item .input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-item input {
  flex: 1;
  padding: 8px 10px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  transition: all 0.2s;
}

.setting-item input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.pomodoro-stats {
  text-align: center;
  padding: 14px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.pomodoro-stats span {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

[data-theme="dark"] .timer-display.is-running {
  box-shadow: 0 0 50px rgba(59, 130, 246, 0.5), 
              0 0 100px rgba(59, 130, 246, 0.25),
              inset 0 0 30px rgba(59, 130, 246, 0.15);
}

[data-theme="dark"] .timer-display.is-break.is-running {
  box-shadow: 0 0 50px rgba(34, 197, 94, 0.5),
              0 0 100px rgba(34, 197, 94, 0.25),
              inset 0 0 30px rgba(34, 197, 94, 0.15);
}

[data-theme="dark"] .time {
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .setting-item {
  background: rgba(255, 255, 255, 0.03);
}

[data-theme="dark"] .setting-item input {
  background: rgba(255, 255, 255, 0.05);
}

[data-theme="dark"] .mode-badge.work {
  background: rgba(59, 130, 246, 0.2);
}

[data-theme="dark"] .mode-badge.break {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  border-color: rgba(34, 197, 94, 0.4);
}
</style>
