import html2pdf from 'html2pdf.js'

export const exportHTML = (htmlContent) => {
  const blob = new Blob([htmlContent], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'export.html'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const exportMD = (markdownContent, currentFile) => {
  const fileName = currentFile ? `${currentFile}.md` : 'export.md'
  const blob = new Blob([markdownContent], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const exportPDF = () => {
  const preview = document.getElementById('preview')
  if (preview) {
    html2pdf().from(preview).save()
  }
}