
import { onMounted } from 'vue'

export function useHighlightColors() {
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

  const resetHighlightColors = () => {
    if (confirm('确定要重置为默认颜色吗？')) {
      localStorage.removeItem('customHighlightColors')
      applyColorSettings()
    }
  }

  const getUserColors = () => {
    const saved = localStorage.getItem('customHighlightColors')
    return saved ? JSON.parse(saved) : { light: {}, dark: {} }
  }

  const applyColorSettings = () => {
    const userColors = getUserColors()
    const theme = document.documentElement.getAttribute('data-theme') || 'dark'

    // 移除已存在的自定义样式
    const existingStyle = document.getElementById('customHighlightStyles')
    if (existingStyle) {
      existingStyle.remove()
    }

    // 创建新的样式元素
    const style = document.createElement('style')
    style.id = 'customHighlightStyles'

    let css = ''
    syntaxElements.forEach(element => {
      const color = userColors[theme]?.[element.id] || defaultColors[theme][element.id]

      // 为函数名生成多个可能的CSS选择器
      if (element.id === 'function') {
        css += `[data-theme="${theme}"] .hljs-function { color: ${color} !important; }\n`
        css += `[data-theme="${theme}"] .hljs-title.function_ { color: ${color} !important; }\n`
        css += `[data-theme="${theme}"] .hljs-title { color: ${color} !important; }\n`
        css += `[data-theme="${theme}"] .hljs-name { color: ${color} !important; }\n`
      }
      // 为标点符号生成多个可能的CSS选择器
      else if (element.id === 'punctuation') {
        css += `[data-theme="${theme}"] .hljs-punctuation { color: ${color} !important; }\n`
        css += `[data-theme="${theme}"] .hljs-operator { color: ${color} !important; }\n`
        css += `[data-theme="${theme}"] .hljs-symbol { color: ${color} !important; }\n`
      }
      // 为变量名生成多个可能的CSS选择器
      else if (element.id === 'variable') {
        css += `[data-theme="${theme}"] .hljs-variable { color: ${color} !important; }\n`
        css += `[data-theme="${theme}"] .hljs-variable.language_ { color: ${color} !important; }\n`
        css += `[data-theme="${theme}"] .hljs-params { color: ${color} !important; }\n`
        css += `[data-theme="${theme}"] .hljs-attr { color: ${color} !important; }\n`
      }
      // 为类名生成多个可能的CSS选择器
      else if (element.id === 'class') {
        css += `[data-theme="${theme}"] .hljs-class { color: ${color} !important; }\n`
        css += `[data-theme="${theme}"] .hljs-title.class_ { color: ${color} !important; }\n`
        css += `[data-theme="${theme}"] .hljs-type { color: ${color} !important; }\n`
        css += `[data-theme="${theme}"] .hljs-built_in { color: ${color} !important; }\n`
        css += `[data-theme="${theme}"] .hljs-selector-class { color: ${color} !important; }\n`
      }
      // 为其他元素生成CSS选择器
      else {
        css += `[data-theme="${theme}"] .hljs-${element.id} { color: ${color} !important; }\n`
      }
    })

    style.textContent = css
    document.head.appendChild(style)
  }

  onMounted(() => {
    applyColorSettings()
  })

  return {
    resetHighlightColors,
    applyColorSettings
  }
}