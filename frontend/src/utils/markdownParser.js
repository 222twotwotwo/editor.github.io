import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import taskLists from 'markdown-it-task-lists'
import footnote from 'markdown-it-footnote'
import sub from 'markdown-it-sub'
import sup from 'markdown-it-sup'
import mark from 'markdown-it-mark'
import container from 'markdown-it-container'

// 初始化 markdown-it，支持更完整的 Markdown 语法
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true, // 单换行转为 <br>，兼容 GFM
  highlight: (str, lang) => {
    let codeHtml
    if (lang && hljs.getLanguage(lang)) {
      try {
        codeHtml = hljs.highlight(str, { language: lang }).value
      } catch (__) {
        codeHtml = md.utils.escapeHtml(str)
      }
    } else {
      codeHtml = md.utils.escapeHtml(str)
    }
    return `<div class="code-block-wrapper"><button type="button" class="copy-code-btn" title="复制代码">复制</button><pre class="hljs"><code>${codeHtml}</code></pre></div>`
  }
})

// 任务列表（GFM）：- [ ] 与 - [x]
md.use(taskLists, { label: true, enable: true })

// 脚注：[^1] 与 [^1]: 内容
md.use(footnote)

// 下标：H~2~O
md.use(sub)

// 上标：x^2^
md.use(sup)

// 高亮：==高亮文字==
md.use(mark)

// 自定义容器：::: warning / tip / danger / info
const containerNames = ['warning', 'tip', 'danger', 'info', 'note']
containerNames.forEach(name => {
  md.use(container, name, {
    validate: (params) => params.trim() === name || params.trim().startsWith(name + ' '),
    render: (tokens, idx) => {
      const token = tokens[idx]
      if (token.nesting === 1) {
        const title = token.info.trim().slice(name.length).trim()
        const titleHtml = title ? `<p class="container-title">${md.utils.escapeHtml(title)}</p>` : ''
        return `<div class="custom-block block-${name}">${titleHtml}\n`
      }
      return '</div>\n'
    }
  })
})

export const markdownToHtml = (markdown) => {
  return md.render(markdown || '')
}

export default md
