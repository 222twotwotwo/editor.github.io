
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

  const setColor = (theme, elementId, color) => {
    const userColors = getUserColors()
    if (!userColors[theme]) userColors[theme] = {}
    userColors[theme][elementId] = color
    localStorage.setItem('customHighlightColors', JSON.stringify(userColors))
    applyColorSettings()
  }

  // highlight.js 完整类名映射：每个语义项对应其可能出现的所有 hljs 类（保证自定义颜色完全覆盖）
  const hljsClassMap = {
    keyword: ['.hljs-keyword', '.hljs-meta .hljs-keyword'],
    variable: ['.hljs-variable', '.hljs-variable.language_', '.hljs-variable.constant_', '.hljs-params', '.hljs-attr', '.hljs-property', '.hljs-template-variable'],
    string: ['.hljs-string', '.hljs-subst'],
    number: ['.hljs-number', '.hljs-literal'],
    comment: ['.hljs-comment', '.hljs-doctag'],
    function: ['.hljs-function', '.hljs-title.function_', '.hljs-title.function_.invoke__', '.hljs-title', '.hljs-name'],
    class: ['.hljs-class', '.hljs-title.class_', '.hljs-title.class_.inherited__', '.hljs-type', '.hljs-selector-class'],
    meta: ['.hljs-meta', '.hljs-meta.prompt_', '.hljs-section'],
    built_in: ['.hljs-built_in'],
    punctuation: ['.hljs-punctuation'],
    operator: ['.hljs-operator', '.hljs-symbol']
  }

  const applyColorSettings = () => {
    const userColors = getUserColors()

    const existingStyle = document.getElementById('customHighlightStyles')
    if (existingStyle) existingStyle.remove()

    const style = document.createElement('style')
    style.id = 'customHighlightStyles'

    const scopes = ['#preview', '.markdown-body']
    let css = ''

    // 同时为 light / dark 两种主题生成样式，避免切换主题后自定义颜色失效
    ;['light', 'dark'].forEach(theme => {
      syntaxElements.forEach(element => {
        const color = userColors[theme]?.[element.id] ?? defaultColors[theme][element.id]
        const selectors = hljsClassMap[element.id] || [`.hljs-${element.id}`]
        selectors.forEach(sel => {
          const fullSelectors = scopes.map(s => `[data-theme="${theme}"] ${s} ${sel.trim()}`).join(', ')
          css += `${fullSelectors} { color: ${color} !important; }\n`
        })
      })
    })

    style.textContent = css
    document.head.appendChild(style)
  }

  onMounted(() => {
    applyColorSettings()
  })

  return {
    syntaxElements,
    defaultColors,
    getUserColors,
    setColor,
    resetHighlightColors,
    applyColorSettings
  }
}