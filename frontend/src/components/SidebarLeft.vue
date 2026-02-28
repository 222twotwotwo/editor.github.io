<template>
  <aside class="sidebar" :class="{ collapsed }">
    <section class="panel">
      <h3>📊 数据库上传记录</h3>
      <p id="todayCount">今日上传：{{ todayCount }} 次</p>
      <p>总文档数：{{ totalCount }} 个</p>
      <p>存储空间：{{ formatFileSize(totalSize) }}</p>
      <canvas ref="chartCanvas" height="140"></canvas>
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

defineProps({ collapsed: Boolean })

const emit = defineEmits([
  'reset-colors'
])

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