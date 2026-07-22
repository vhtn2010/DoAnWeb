const SUPPORT_IMAGE_LINE_REGEX = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/
const SUPPORT_FILE_LINE_REGEX = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/
const SUPPORT_INLINE_STYLE_REGEX = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g

function normalizeText(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim()
}

export function getSupportImageAlt(fileName = '') {
  const baseName = String(fileName || '')
    .replace(/\.[A-Za-z0-9]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()

  return baseName || 'Hình đính kèm'
}

export function appendSupportImageMarkdown(message = '', { alt = '', url = '' } = {}) {
  if (!url) {
    return String(message || '')
  }

  const normalizedAlt = String(alt || 'Hình đính kèm').replace(/[\r\n[\]]+/g, ' ').trim()
  const nextImageLine = `![${normalizedAlt || 'Hình đính kèm'}](${url})`
  const normalizedMessage = String(message || '').trimEnd()

  if (!normalizedMessage) {
    return nextImageLine
  }

  return `${normalizedMessage}\n${nextImageLine}`
}

export function appendSupportFileMarkdown(message = '', { label = '', url = '' } = {}) {
  if (!url) {
    return String(message || '')
  }

  const normalizedLabel = String(label || 'Tệp đính kèm')
    .replace(/[\r\n[\]]+/g, ' ')
    .trim()
  const nextFileLine = `[${normalizedLabel || 'Tệp đính kèm'}](${url})`
  const normalizedMessage = String(message || '').trimEnd()

  if (!normalizedMessage) {
    return nextFileLine
  }

  return `${normalizedMessage}\n${nextFileLine}`
}

export function parseSupportMessageBlocks(message = '') {
  const normalizedMessage = normalizeText(message)

  if (!normalizedMessage) {
    return []
  }

  const lines = normalizedMessage.split('\n')
  const blocks = []
  let paragraphLines = []

  function flushParagraph() {
    if (!paragraphLines.length) {
      return
    }

    blocks.push({
      text: paragraphLines.join('\n'),
      type: 'paragraph',
    })
    paragraphLines = []
  }

  lines.forEach((line) => {
    const trimmedLine = line.trim()

    if (!trimmedLine) {
      flushParagraph()
      return
    }

    const imageMatch = trimmedLine.match(SUPPORT_IMAGE_LINE_REGEX)

    if (imageMatch) {
      flushParagraph()
      blocks.push({
        alt: imageMatch[1] || 'Hình đính kèm',
        type: 'image',
        url: imageMatch[2],
      })
      return
    }

    const fileMatch = trimmedLine.match(SUPPORT_FILE_LINE_REGEX)

    if (fileMatch) {
      flushParagraph()
      blocks.push({
        label: fileMatch[1] || 'Tệp đính kèm',
        type: 'file',
        url: fileMatch[2],
      })
      return
    }

    paragraphLines.push(line)
  })

  flushParagraph()

  return blocks
}

export function getSupportMessageImageBlocks(message = '') {
  return parseSupportMessageBlocks(message).filter((block) => block.type === 'image')
}

export function getSupportMessageFileBlocks(message = '') {
  return parseSupportMessageBlocks(message).filter((block) => block.type === 'file')
}

export function parseSupportInlineSegments(text = '') {
  const normalizedText = String(text || '')

  if (!normalizedText) {
    return []
  }

  const segments = []
  let lastIndex = 0

  normalizedText.replace(SUPPORT_INLINE_STYLE_REGEX, (match, _fullMatch, boldText, italicText, offset) => {
    if (offset > lastIndex) {
      segments.push({
        text: normalizedText.slice(lastIndex, offset),
        type: 'text',
      })
    }

    segments.push({
      text: boldText || italicText || '',
      type: boldText ? 'strong' : 'em',
    })

    lastIndex = offset + match.length
    return match
  })

  if (lastIndex < normalizedText.length) {
    segments.push({
      text: normalizedText.slice(lastIndex),
      type: 'text',
    })
  }

  return segments
}
