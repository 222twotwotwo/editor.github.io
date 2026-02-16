<template>
  <div
    class="editor-container"
    @dragover.prevent="onDragOver"
    @drop.prevent="onDrop"
  >
    <template v-if="!aiEnabled">
      <textarea
        ref="editorRef"
        id="editor"
        :value="modelValue"
        @input="emit('update:modelValue', $event.target.value)"
        @scroll="syncPreviewToEditor"
        placeholder="在此输入 Markdown..."
        spellcheck="false"
      />
    </template>
    <template v-else>
      <div
        ref="editorRef"
        id="editor"
        class="editor-contenteditable"
        contenteditable="true"
        spellcheck="false"
        role="textbox"
        aria-multiline="true"
        data-placeholder="在此输入 Markdown... 5秒无操作自动续写，Tab 采纳，Esc 取消"
        @input="onAiInput"
        @keydown="onAiKeyDown"
        @mousedown="onAiMouseDown"
        @paste="onAiPaste"
        @scroll="syncPreviewToEditor"
      />
    </template>
    <div ref="previewRef" id="preview" v-html="previewContent" @scroll="syncEditorToPreview"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useAiContinuationSettings } from '../composables/useAiContinuationSettings'
import { documentAPI } from '../services/api'

const props = defineProps({
  modelValue: { type: String, default: '' },
  previewContent: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const { aiEnabled, apiKey, aiApiLoading } = useAiContinuationSettings()

const editorRef = ref(null)
const previewRef = ref(null)
const syncingFromEditor = ref(false)
const syncingFromPreview = ref(false)

// ----- AI 续写状态 -----
let hasSuggestion = false
let fullSuggestion = ''
let baseText = ''
let isArticleCompleted = false
let forceContinueNext = false
let abortController = null
let idleTimer = null
let countdownInterval = null
let countdown = 5
let isTimerActive = false
let ignoreCursorMove = false
let lastPlainText = ''

function getPlainText() {
  const editor = editorRef.value
  if (!editor || !editor.childNodes) return ''
  let text = ''
  let isOnFreshLine = true

  function parseChildNodes(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      // 排除 AI 续写建议区域
      if (node.nodeType === Node.ELEMENT_NODE && node.closest?.('.ai-suggestion')) {
        continue
      }

      if (node.nodeName === 'BR') {
        text += '\n'
        isOnFreshLine = true
        continue
      }
      // contenteditable 中 div/p 等块元素表示换行，需在非新行时补 \n
      if ((node.nodeName === 'DIV' || node.nodeName === 'P') && !isOnFreshLine) {
        text += '\n'
      }
      if (node.nodeName === 'DIV' || node.nodeName === 'P') {
        isOnFreshLine = false
      }

      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        text += node.textContent
        isOnFreshLine = false
      }
      if (node.childNodes?.length) {
        parseChildNodes(node.childNodes)
      }
    }
  }

  parseChildNodes(editor.childNodes)
  return text
}

function removeSuggestionSpan() {
  const editor = editorRef.value
  if (!editor) return
  editor.querySelectorAll('.ai-suggestion').forEach(span => span.remove())
  hasSuggestion = false
}

function abortPendingRequest() {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
}

function stopTimerCompletely() {
  if (idleTimer) clearTimeout(idleTimer)
  if (countdownInterval) clearInterval(countdownInterval)
  isTimerActive = false
}

function startTimer() {
  if (!aiEnabled.value) {
    stopTimerCompletely()
    return
  }
  if (idleTimer) clearTimeout(idleTimer)
  if (countdownInterval) clearInterval(countdownInterval)
  countdown = 5
  isTimerActive = true
  idleTimer = setTimeout(() => {
    if (isTimerActive && aiEnabled.value) {
      generateAISuggestion()
    }
  }, 5000)
}

function triggerUserAction() {
  if (isArticleCompleted) {
    isArticleCompleted = false
    forceContinueNext = true
  }
  abortPendingRequest()
  stopTimerCompletely()
  if (aiEnabled.value) {
    startTimer()
  }
}

function isCursorMoveKey(key) {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(key)
}

function acceptSuggestion() {
  const editor = editorRef.value
  if (!editor) return
  const span = editor.querySelector('.ai-suggestion')
  if (!span) {
    hasSuggestion = false
    return
  }

  if (span.dataset.error !== undefined) {
    const errorText = span.dataset.error || ''
    const correctText = span.dataset.correct || ''
    if (errorText && correctText) {
      const currentText = getPlainText()
      const index = currentText.indexOf(errorText)
      if (index !== -1) {
        const newText = currentText.slice(0, index) + correctText + currentText.slice(index + errorText.length)
        editor.textContent = newText
        const sel = window.getSelection()
        const range = document.createRange()
        const textNode = editor.firstChild
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const pos = Math.min(index + correctText.length, textNode.length)
          range.setStart(textNode, pos)
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
    }
  hasSuggestion = false
  fullSuggestion = ''
  baseText = getPlainText()
  lastPlainText = baseText
  emit('update:modelValue', baseText)
  triggerUserAction()
  return
}

  const suggestion = span.textContent || ''
  const textNode = document.createTextNode(suggestion)
  span.parentNode.insertBefore(textNode, span)
  span.remove()
  ignoreCursorMove = true
  try {
    const range = document.createRange()
    range.setStartAfter(textNode)
    range.collapse(true)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  } finally {
    ignoreCursorMove = false
  }
  hasSuggestion = false
  fullSuggestion = ''
  baseText = getPlainText()
  lastPlainText = baseText
  emit('update:modelValue', baseText)
  triggerUserAction()
}

function cancelSuggestion(manual = true) {
  removeSuggestionSpan()
  fullSuggestion = ''
  baseText = getPlainText()
  lastPlainText = baseText
  emit('update:modelValue', baseText)
  if (manual) triggerUserAction()
}

function insertSuggestion(suggestionText) {
  const editor = editorRef.value
  if (!editor) return false
  removeSuggestionSpan()

  if (suggestionText === '[DEEPSEEK_COMPLETE]') {
    if (forceContinueNext) return false
    isArticleCompleted = true
    stopTimerCompletely()
    return true
  }

  const replaceRegex = /\[REPLACE\]([\s\S]*?)\[\/REPLACE\]([\s\S]*)/
  const match = suggestionText.match(replaceRegex)
  if (match) {
    const errorText = match[1].trim()
    const correctText = match[2].trimEnd()
    if (!errorText || !correctText) return false

    const span = document.createElement('span')
    span.className = 'ai-suggestion ai-suggestion-correction'
    span.textContent = correctText
    span.setAttribute('contenteditable', 'false')
    span.dataset.error = errorText
    span.dataset.correct = correctText

    const sel = window.getSelection()
    if (!sel.rangeCount) return false
    const range = sel.getRangeAt(0)
    if (!editor.contains(range.commonAncestorContainer)) return false
    range.collapse(true)
    ignoreCursorMove = true
    try {
      range.insertNode(span)
      range.setStartBefore(span)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    } finally {
      ignoreCursorMove = false
    }
    hasSuggestion = true
    fullSuggestion = ''
    baseText = getPlainText()
    return true
  }

  const suggestion = suggestionText.trimEnd()
  if (!suggestion) return false

  const sel = window.getSelection()
  if (!sel.rangeCount) return false
  const range = sel.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) return false
  range.collapse(true)

  const span = document.createElement('span')
  span.className = 'ai-suggestion'
  span.textContent = suggestion
  span.setAttribute('contenteditable', 'false')

  ignoreCursorMove = true
  try {
    range.insertNode(span)
    range.setStartBefore(span)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  } finally {
    ignoreCursorMove = false
  }
  hasSuggestion = true
  fullSuggestion = suggestion
  baseText = getPlainText()
  return true
}

async function generateAISuggestion() {
  if (!aiEnabled.value) return
  if (isArticleCompleted && !forceContinueNext) return
  stopTimerCompletely()
  abortPendingRequest()

  const context = getPlainText().trim()
  if (!context) {
    startTimer()
    forceContinueNext = false
    return
  }

  const key = (apiKey.value || '').trim()
  if (!key) {
    startTimer()
    forceContinueNext = false
    return
  }

  if (hasSuggestion) removeSuggestionSpan()

  let systemPrompt = `你是一个专业的写作助手。请根据用户提供的文本，执行以下任务之一：

1. 如果文本已经完整、无需续写，仅输出 [DEEPSEEK_COMPLETE]。
2. 如果发现文本中有错误、不通顺或用词不当，仅输出修正指令，格式严格为：[REPLACE]错误内容[/REPLACE]正确内容。不要添加任何其他文字。
3. 否则，直接输出连贯的续写内容，不要重复原文，不要添加任何解释、符号或强制空格。续写内容应保留必要的开头缩进/空格，以与原文自然衔接；但不要主动添加额外换行或多余空白。

注意：一次只做一件事，输出只有一行。`

  if (forceContinueNext) {
    systemPrompt += `\n\n[强制续写] 本次请求用户希望无论如何都获得续写内容。即使文本看起来已经完整，也请尽力输出合理的续写，绝对不要返回 [DEEPSEEK_COMPLETE]。`
  }

  abortController = new AbortController()
  const signal = abortController.signal
  const prompt = `文本内容：\n${context}`

  aiApiLoading.value = true
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 80,
        temperature: 0.7,
        top_p: 0.95,
        presence_penalty: 0.3,
        frequency_penalty: 0.3,
        stream: false
      }),
      signal
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    let suggestion = (data.choices?.[0]?.message?.content || '').trimEnd()
    if (!suggestion) {
      startTimer()
      return
    }

    const inserted = insertSuggestion(suggestion)
    if (!inserted && !suggestion.includes('[REPLACE]') && suggestion !== '[DEEPSEEK_COMPLETE]') {
      const editor = editorRef.value
      if (editor) {
        const fallbackSpan = document.createElement('span')
        fallbackSpan.className = 'ai-suggestion'
        fallbackSpan.textContent = suggestion
        fallbackSpan.setAttribute('contenteditable', 'false')
        editor.appendChild(fallbackSpan)
        hasSuggestion = true
        fullSuggestion = suggestion
        baseText = getPlainText()
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      startTimer()
    }
  } finally {
    aiApiLoading.value = false
    forceContinueNext = false
    abortController = null
  }
}

function onAiInput() {
  triggerUserAction()
  const currentText = getPlainText()
  lastPlainText = currentText
  emit('update:modelValue', currentText)

  if (hasSuggestion && fullSuggestion) {
    if (currentText.length >= baseText.length && currentText.startsWith(baseText)) {
      const typed = currentText.slice(baseText.length)
      if (fullSuggestion.startsWith(typed)) {
        const remaining = fullSuggestion.slice(typed.length)
        if (remaining.length > 0) {
          const oldSpan = editorRef.value?.querySelector('.ai-suggestion')
          if (oldSpan) oldSpan.remove()
          const sel = window.getSelection()
          if (sel.rangeCount) {
            const range = sel.getRangeAt(0)
            range.collapse(true)
            const newSpan = document.createElement('span')
            newSpan.className = 'ai-suggestion'
            newSpan.textContent = remaining
            newSpan.setAttribute('contenteditable', 'false')
            ignoreCursorMove = true
            try {
              range.insertNode(newSpan)
              range.setStartBefore(newSpan)
              range.collapse(true)
              sel.removeAllRanges()
              sel.addRange(range)
            } finally {
              ignoreCursorMove = false
            }
            fullSuggestion = remaining
            baseText = currentText
          } else {
            fullSuggestion = remaining
            baseText = currentText
          }
        } else {
          acceptSuggestion()
        }
      } else {
        cancelSuggestion(false)
      }
    } else {
      cancelSuggestion(false)
    }
  }
}

function onAiKeyDown(e) {
  if (e.key === 'Tab' && hasSuggestion) {
    e.preventDefault()
    acceptSuggestion()
    return
  }
  if (e.key === 'Escape' && hasSuggestion) {
    e.preventDefault()
    cancelSuggestion(true)
    return
  }
  if (isCursorMoveKey(e.key) && hasSuggestion) {
    cancelSuggestion(true)
  }
}

function onAiMouseDown(e) {
  if (editorRef.value?.contains(e.target) && hasSuggestion) {
    cancelSuggestion(true)
  }
}

function onAiPaste(e) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
  triggerUserAction()
  const currentText = getPlainText()
  lastPlainText = currentText
  emit('update:modelValue', currentText)
}

// ----- 拖拽上传图片 -----
function onDragOver(e) {
  if (e.dataTransfer?.types?.includes('Files')) e.dataTransfer.dropEffect = 'copy'
}

async function onDrop(e) {
  const files = e.dataTransfer?.files
  if (!files?.length) return
  const images = Array.from(files).filter((f) => f.type.startsWith('image/'))
  if (!images.length) return
  const insertText = (text, withNewline = true) => {
    const prefix = withNewline ? '\n\n' : ''
    const suffix = withNewline ? '\n\n' : ''
    const toInsert = prefix + text + suffix
    if (aiEnabled.value) {
      const editor = editorRef.value
      if (editor && document.execCommand) {
        editor.focus()
        document.execCommand('insertText', false, toInsert)
        lastPlainText = getPlainText()
        emit('update:modelValue', lastPlainText)
        triggerUserAction()
      }
    } else {
      const ta = editorRef.value
      if (!ta) return
      const start = ta.selectionStart ?? props.modelValue.length
      const end = ta.selectionEnd ?? start
      const before = (props.modelValue || '').slice(0, start)
      const after = (props.modelValue || '').slice(end)
      const next = before + toInsert + after
      emit('update:modelValue', next)
      nextTick(() => {
        const pos = start + toInsert.length
        ta.setSelectionRange(pos, pos)
        ta.focus()
      })
    }
  }
  for (let i = 0; i < images.length; i++) {
    const file = images[i]
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await documentAPI.uploadImage(formData)
      const content = res?.data?.content ?? res?.content
      if (content) insertText(content, i === 0 && !props.modelValue?.trim() ? false : true)
    } catch (err) {
      console.error('上传图片失败', err)
      if (images.length === 1) alert(err?.message || '上传图片失败，请检查登录与网络')
    }
  }
}

function setEditorContent(text) {
  const editor = editorRef.value
  if (!editor) return
  editor.textContent = text || ''
  baseText = text || ''
}

function syncPreviewToEditor() {
  if (syncingFromPreview.value) return
  const ed = editorRef.value
  const pr = previewRef.value
  if (!ed || !pr) return
  const edMax = ed.scrollHeight - ed.clientHeight
  const prMax = pr.scrollHeight - pr.clientHeight
  if (edMax <= 0 || prMax <= 0) return
  const ratio = ed.scrollTop / edMax
  syncingFromEditor.value = true
  pr.scrollTop = ratio * prMax
  syncingFromEditor.value = false
}

function syncEditorToPreview() {
  if (syncingFromEditor.value) return
  const ed = editorRef.value
  const pr = previewRef.value
  if (!ed || !pr) return
  const edMax = ed.scrollHeight - ed.clientHeight
  const prMax = pr.scrollHeight - pr.clientHeight
  if (edMax <= 0 || prMax <= 0) return
  const ratio = pr.scrollTop / prMax
  syncingFromPreview.value = true
  ed.scrollTop = ratio * edMax
  syncingFromPreview.value = false
}

watch([() => props.modelValue, aiEnabled], ([newVal, enabled]) => {
  if (!enabled) return
  const ed = editorRef.value
  if (!ed) return
  const plain = getPlainText()
  if (plain !== newVal) {
    setEditorContent(newVal || '')
    lastPlainText = newVal || ''
    baseText = lastPlainText
  }
}, { immediate: false })

watch(aiEnabled, (enabled) => {
  if (enabled) {
    nextTick(() => {
      setEditorContent(props.modelValue || '')
      baseText = getPlainText()
      lastPlainText = baseText
      startTimer()
    })
  } else {
    abortPendingRequest()
    stopTimerCompletely()
    emit('update:modelValue', lastPlainText)
  }
}, { immediate: false })

onMounted(() => {
  if (aiEnabled.value && editorRef.value) {
    nextTick(() => {
      setEditorContent(props.modelValue || '')
      baseText = getPlainText()
      startTimer()
    })
  }
})

onUnmounted(() => {
  abortPendingRequest()
  stopTimerCompletely()
  editorRef.value = null
  previewRef.value = null
})
</script>

<style scoped>
.editor-contenteditable {
  white-space: pre-wrap;
  word-wrap: break-word;
  outline: none;
  min-height: 0;
}

.editor-contenteditable:empty::before {
  content: attr(data-placeholder);
  color: var(--text);
  opacity: 0.5;
}

/* 续写建议：半透明 */
:deep(.ai-suggestion) {
  opacity: 0.5;
  user-select: none;
  pointer-events: none;
  display: inline;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 修正建议：半透明浅绿色 */
:deep(.ai-suggestion-correction) {
  opacity: 0.65;
  background: rgba(144, 238, 144, 0.25);
  color: rgba(34, 139, 34, 0.9);
  border-radius: 2px;
  padding: 0 2px;
}

[data-theme="dark"] :deep(.ai-suggestion-correction) {
  background: rgba(60, 179, 113, 0.2);
  color: rgba(144, 238, 144, 0.9);
}
</style>
