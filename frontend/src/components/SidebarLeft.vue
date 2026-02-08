<template>
  <aside class="sidebar" :class="{ collapsed }">
    <section class="panel">
      <h3>📦 GitHub 仓库</h3>
      <input :value="repoOwner" @input="$emit('update-repo-owner', $event.target.value)" placeholder="用户名">
      <input :value="repoName" @input="$emit('update-repo-name', $event.target.value)" placeholder="仓库名">
      <input :value="filePath" @input="$emit('update-file-path', $event.target.value)" placeholder="路径，如 docs/test.md">
      <input :value="token" @input="$emit('update-token', $event.target.value)" placeholder="Token" type="password">
      <button @click="$emit('upload-github')">⬆️ 上传 Markdown</button>
    </section>

    <section class="panel">
      <h3>📊 上传指标</h3>
      <p id="todayCount">今日上传：{{ todayCount }} 次</p>
      <canvas ref="chartCanvas" height="140"></canvas>
    </section>

    <section class="panel">
      <h3>🎨 代码高亮颜色</h3>
      <div id="colorSettings">
        <div v-for="element in syntaxElements" :key="element.id" class="color-setting">
          <label :for="`${element.id}Color`">{{ element.name }}</label>
          <div class="color-input-group">
            <input 
              type="color" 
              :id="`${element.id}Color`" 
              :value="getColor(element.id)"
              @input="updateColor(element.id, $event.target.value)"
            >
            <input 
              type="text" 
              :id="`${element.id}ColorHex`" 
              :value="getColor(element.id)"
              @input="updateColorHex(element.id, $event.target.value)"
            >
          </div>
        </div>
      </div>
      <button @click="$emit('reset-colors')">重置默认颜色</button>
    </section>
  </aside>
</template>

<script setup>
import { ref, onMounted, onUpdated } from 'vue'
import Chart from 'chart.js/auto'

const props = defineProps({
  collapsed: Boolean,
  repoOwner: String,
  repoName: String,
  filePath: String,
  token: String,
  todayCount: Number,
  uploadChartData: Object,
  currentTheme: String
})

defineEmits([
  'upload-github',
  'update-repo-owner',
  'update-repo-name',
  'update-file-path',
  'update-token',
  'reset-colors'
])

const chartCanvas = ref(null)
let chart = null

const syntaxElements = [
  { id: 'keyword', name: '关键字' },
  { id: 'variable', name: '变量名' },
  { id: 'string', name: '字符串' },
  { id: 'number', name: '数字' },
  { id: 'comment', name: '注释' },
  { id: 'function', name: '函数名' },
  { id: 'class', name: '类名' },
  { id: 'meta', name: '元数据' },
  { id: 'built_in', name: '内置类型' },
  { id: 'punctuation', name: '标点符号' },
  { id: 'operator', name: '运算符' }
]

const defaultColors = {
  light: {
    keyword: '#6ABFFA',
    variable: '#C898FA',
    string: '#F0A898',
    number: '#88E888',
    comment: '#78C878',
    function: '#F8D878',
    class: '#98D8F8',
    meta: '#FF9878',
    built_in: '#88C8F8',
    punctuation: '#B8B8D8',
    operator: '#D8D8F8'
  },
  dark: {
    keyword: '#61AFEF',
    variable: '#A7D8FF',
    string: '#E59866',
    number: '#98C379',
    comment: '#72B865',
    function: '#E5E58A',
    class: '#56D9B9',
    meta: '#FF9878',
    built_in: '#88C8F8',
    punctuation: '#B8B8D8',
    operator: '#D8D8F8'
  }
}

// 初始化图表
onMounted(() => {
  if (props.uploadChartData && chartCanvas.value) {
    initChart()
  }
})

onUpdated(() => {
  if (props.uploadChartData && chartCanvas.value && !chart) {
    initChart()
  } else if (chart && props.uploadChartData) {
    updateChart()
  }
})

function initChart() {
  if (!chartCanvas.value) return
  
  chart = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels: props.uploadChartData.labels || [],
      datasets: [{
        data: props.uploadChartData.data || [],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
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
  if (!chart || !props.uploadChartData) return
  
  chart.data.labels = props.uploadChartData.labels || []
  chart.data.datasets[0].data = props.uploadChartData.data || []
  chart.update()
}

function getColor(elementId) {
  const saved = localStorage.getItem('customHighlightColors')
  const userColors = saved ? JSON.parse(saved) : { light: {}, dark: {} }
  const theme = props.currentTheme || 'dark'
  return userColors[theme]?.[elementId] || defaultColors[theme][elementId]
}

function updateColor(elementId, color) {
  const theme = props.currentTheme || 'dark'
  const saved = localStorage.getItem('customHighlightColors')
  const userColors = saved ? JSON.parse(saved) : { light: {}, dark: {} }
  
  if (!userColors[theme]) {
    userColors[theme] = {}
  }
  
  userColors[theme][elementId] = color
  localStorage.setItem('customHighlightColors', JSON.stringify(userColors))
  applyColorSettings(theme, userColors[theme])
  
  // 更新对应的hex输入框
  const hexInput = document.getElementById(`${elementId}ColorHex`)
  if (hexInput) {
    hexInput.value = color
  }
}

function updateColorHex(elementId, hex) {
  if (/^#[0-9A-F]{6}$/i.test(hex)) {
    updateColor(elementId, hex)
  }
}

function applyColorSettings(theme, colors) {
  let css = ''
  
  syntaxElements.forEach(element => {
    const color = colors[element.id] || defaultColors[theme][element.id]
    
    if (element.id === 'function') {
      css += `[data-theme="${theme}"] .hljs-function { color: ${color} !important; }\n`
      css += `[data-theme="${theme}"] .hljs-title.function_ { color: ${color} !important; }\n`
      css += `[data-theme="${theme}"] .hljs-title { color: ${color} !important; }\n`
      css += `[data-theme="${theme}"] .hljs-name { color: ${color} !important; }\n`
    } else if (element.id === 'punctuation') {
      css += `[data-theme="${theme}"] .hljs-punctuation { color: ${color} !important; }\n`
      css += `[data-theme="${theme}"] .hljs-operator { color: ${color} !important; }\n`
      css += `[data-theme="${theme}"] .hljs-symbol { color: ${color} !important; }\n`
    } else if (element.id === 'variable') {
      css += `[data-theme="${theme}"] .hljs-variable { color: ${color} !important; }\n`
      css += `[data-theme="${theme}"] .hljs-variable.language_ { color: ${color} !important; }\n`
      css += `[data-theme="${theme}"] .hljs-params { color: ${color} !important; }\n`
      css += `[data-theme="${theme}"] .hljs-attr { color: ${color} !important; }\n`
    } else if (element.id === 'class') {
      css += `[data-theme="${theme}"] .hljs-class { color: ${color} !important; }\n`
      css += `[data-theme="${theme}"] .hljs-title.class_ { color: ${color} !important; }\n`
      css += `[data-theme="${theme}"] .hljs-type { color: ${color} !important; }\n`
      css += `[data-theme="${theme}"] .hljs-built_in { color: ${color} !important; }\n`
      css += `[data-theme="${theme}"] .hljs-selector-class { color: ${color} !important; }\n`
    } else {
      css += `[data-theme="${theme}"] .hljs-${element.id} { color: ${color} !important; }\n`
    }
  })
  
  // 移除已存在的样式
  const existingStyle = document.getElementById('customHighlightStyles')
  if (existingStyle) {
    existingStyle.remove()
  }
  
  // 创建新样式
  const style = document.createElement('style')
  style.id = 'customHighlightStyles'
  style.textContent = css
  document.head.appendChild(style)
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  background: rgba(255, 255, 255, var(--panel-opacity));
  border-right: 1px solid var(--border);
  padding: 12px;
  transition: width .25s ease, padding .25s ease;
  overflow-y: auto;
  backdrop-filter: blur(8px);
}

[data-theme="dark"] .sidebar {
  background: rgba(42, 42, 42, var(--panel-opacity));
}

.sidebar.collapsed {
  width: 0;
  padding: 0;
  border-right: none;
  overflow: hidden;
}

.panel {
  margin-bottom: 18px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
}

[data-theme="dark"] .panel {
  background: rgba(42, 42, 42, 0.9);
}

.panel h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.panel input,
.panel button {
  width: 100%;
  margin-bottom: 6px;
}

.color-setting {
  margin-bottom: 10px;
}

.color-setting label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
}

.color-input-group {
  display: flex;
  gap: 8px;
}

.color-input-group input[type="color"] {
  width: 40px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border);
  cursor: pointer;
}

.color-input-group input[type="text"] {
  flex: 1;
}

#resetColorsBtn {
  margin-top: 10px;
  background: rgba(230, 74, 74, 0.9);
  color: white;
}

[data-theme="dark"] #resetColorsBtn {
  background: rgba(230, 74, 74, 0.7);
}

#resetColorsBtn:hover {
  background: rgba(230, 74, 74, 1);
}
</style>