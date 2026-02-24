<template>
  <aside class="sidebar" :class="{ collapsed }">
    <section class="panel">
      <h3>📊 数据库上传记录</h3>
      <p id="todayCount">今日上传：{{ todayCount }} 次</p>
      <p>总文档数：{{ totalCount }} 个</p>
      <p>存储空间：{{ formatFileSize(totalSize) }}</p>
      <canvas ref="chartCanvas" height="140"></canvas>
    </section>

    <section class="panel appearance-panel">
      <h3>📝 编辑器外观</h3>
      <div class="appearance-mode-switch">
        <span class="switch-label">应用范围：</span>
        <div class="switch-buttons">
          <button
            type="button"
            class="switch-btn"
            :class="{ active: !useGlobalOnly }"
            @click="useGlobalOnly = false"
          >
            当前窗口
          </button>
          <button
            type="button"
            class="switch-btn"
            :class="{ active: useGlobalOnly }"
            @click="useGlobalOnly = true"
          >
            全局
          </button>
        </div>
      </div>
      <div class="setting-group">
        <label>字号: {{ appearanceSettings.fontSize }}px</label>
        <input
          type="range"
          min="12"
          max="32"
          :value="appearanceSettings.fontSize"
          @input="updateAppearance('fontSize', Number($event.target.value))"
        >
      </div>
      <div class="setting-group">
        <label>行高: {{ appearanceSettings.lineHeight.toFixed(1) }}</label>
        <input
          type="range"
          min="1.2"
          max="3"
          step="0.1"
          :value="appearanceSettings.lineHeight"
          @input="updateAppearance('lineHeight', Number($event.target.value))"
        >
      </div>
      <div class="setting-group">
        <label>字重: {{ appearanceSettings.fontWeight }}</label>
        <input
          type="range"
          min="300"
          max="700"
          step="100"
          :value="appearanceSettings.fontWeight"
          @input="updateAppearance('fontWeight', Number($event.target.value))"
        >
      </div>
      <div class="setting-group">
        <label>内边距: {{ appearanceSettings.padding }}px</label>
        <input
          type="range"
          min="8"
          max="64"
          :value="appearanceSettings.padding"
          @input="updateAppearance('padding', Number($event.target.value))"
        >
      </div>
      <button type="button" class="reset-appearance-btn" @click="resetAppearance">
        重置为默认
      </button>
    </section>

    <section class="panel highlight-panel">
      <h3>🎨 代码高亮颜色</h3>
      <div class="color-list">
        <div
          v-for="el in syntaxElements"
          :key="el.id"
          class="color-row"
        >
          <label :for="'color-' + el.id">{{ el.name }}</label>
          <input
            :id="'color-' + el.id"
            type="color"
            :value="getCurrentColor(el.id)"
            @input="onColorChange(el.id, $event.target.value)"
          >
        </div>
      </div>
      <button type="button" class="reset-colors-btn" @click="handleResetColors">
        重置为默认
      </button>
    </section>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Chart from 'chart.js/auto'
import { useDocument } from '../composables/useDocument'
import { useHighlightColors } from '../composables/useHighlightColors'
import { useTheme } from '../composables/useTheme'
import { useEditorAppearance } from '../composables/useEditorAppearance'

const props = defineProps({
  collapsed: Boolean,
  activeWindowAppearance: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits([
  'reset-colors',
  'update-appearance',
  'reset-appearance'
])

const { globalAppearance, updateGlobalAppearance, resetGlobalAppearance, DEFAULT_APPEARANCE } = useEditorAppearance()
const useGlobalOnly = ref(false)

const appearanceSettings = computed(() => {
  if (useGlobalOnly.value) {
    return globalAppearance.value
  }
  return {
    ...DEFAULT_APPEARANCE,
    ...props.activeWindowAppearance
  }
})

const updateAppearance = (key, value) => {
  if (useGlobalOnly.value) {
    updateGlobalAppearance(key, value)
  } else {
    emit('update-appearance', key, value)
  }
}

const resetAppearance = () => {
  if (useGlobalOnly.value) {
    resetGlobalAppearance()
  } else {
    emit('reset-appearance')
  }
}

const { theme } = useTheme()
const {
  syntaxElements,
  defaultColors,
  getUserColors,
  setColor,
  resetHighlightColors
} = useHighlightColors()

const colorVersion = ref(0)

const getCurrentColor = (elementId) => {
  colorVersion.value // 依赖以在颜色变更后刷新
  const userColors = getUserColors()
  const t = theme.value || 'dark'
  return userColors[t]?.[elementId] || defaultColors[t]?.[elementId] || '#cccccc'
}

const onColorChange = (elementId, hex) => {
  const t = theme.value || 'dark'
  setColor(t, elementId, hex)
  colorVersion.value++
}

const handleResetColors = () => {
  resetHighlightColors()
  colorVersion.value++
  emit('reset-colors')
}

const { uploadStats, getUploadChartData } = useDocument()
const chartCanvas = ref(null)
let chart = null

const todayCount = computed(() => uploadStats.value.todayCount ?? 0)
const totalCount = computed(() => uploadStats.value.totalCount ?? 0)
const totalSize = computed(() => uploadStats.value.totalSize ?? 0)

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onMounted(() => initChart())
watch(uploadStats, () => { if (chart) updateChart() }, { deep: true })

function initChart() {
  if (!chartCanvas.value) return
  
  const chartData = getUploadChartData()
  
  chart = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels: chartData.labels || [],
      datasets: [{
        label: '数据库上传次数',
        data: chartData.data || [],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  })
}

function updateChart() {
  if (!chart) return
  
  const chartData = getUploadChartData()
  chart.data.labels = chartData.labels || []
  chart.data.datasets[0].data = chartData.data || []
  chart.update()
}
</script>

<style scoped>
.appearance-mode-switch {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.appearance-mode-switch .switch-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
}

.appearance-mode-switch .switch-buttons {
  display: flex;
  gap: 6px;
}

.appearance-mode-switch .switch-btn {
  flex: 1;
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s;
}

.appearance-mode-switch .switch-btn:hover {
  background: rgba(59, 130, 246, 0.08);
}

.appearance-mode-switch .switch-btn.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
  color: #3b82f6;
}

.appearance-panel .setting-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.appearance-panel .setting-group label {
  font-size: 12px;
  color: var(--text);
  font-weight: 500;
}

.appearance-panel .setting-group input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.1);
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

[data-theme="dark"] .appearance-panel .setting-group input[type="range"] {
  background: rgba(255, 255, 255, 0.1);
}

.appearance-panel .setting-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  transition: transform 0.15s;
}

.appearance-panel .setting-group input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.reset-appearance-btn {
  width: 100%;
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  cursor: pointer;
  transition: all 0.15s;
}

.reset-appearance-btn:hover {
  background: rgba(59, 130, 246, 0.2);
}

.highlight-panel .color-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.color-row label {
  font-size: 12px;
  color: var(--text);
  flex-shrink: 0;
}

.color-row input[type="color"] {
  width: 28px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}

.color-row input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.color-row input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}

.reset-colors-btn {
  width: 100%;
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  cursor: pointer;
}

.reset-colors-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .reset-colors-btn {
  background: rgba(255, 255, 255, 0.05);
}

[data-theme="dark"] .reset-colors-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>