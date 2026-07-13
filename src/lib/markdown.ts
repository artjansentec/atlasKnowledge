export type MarkdownListItem = {
  text: string
  level: number
  checked?: boolean
}

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; lines: string[] }
  | { type: 'list'; ordered: boolean; items: MarkdownListItem[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'code'; language: string; code: string }
  | { type: 'hr' }

export type InlineSegment =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: InlineSegment[] }
  | { type: 'italic'; children: InlineSegment[] }
  | { type: 'boldItalic'; children: InlineSegment[] }
  | { type: 'strike'; children: InlineSegment[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: InlineSegment[] }
  | { type: 'citation'; kind: 'arquivo' | 'secao'; key: string }

function takeUntil(source: string, start: number, delimiter: string): number {
  const index = source.indexOf(delimiter, start)
  return index === -1 ? -1 : index
}

function parseDelimited(
  source: string,
  start: number,
  open: string,
  close: string,
): { end: number; inner: string } | null {
  if (!source.startsWith(open, start)) return null
  const innerStart = start + open.length
  const closeAt = takeUntil(source, innerStart, close)
  if (closeAt === -1 || closeAt === innerStart) return null
  return { end: closeAt + close.length, inner: source.slice(innerStart, closeAt) }
}

export function parseInlineMarkdown(content: string, depth = 0): InlineSegment[] {
  if (!content) return [{ type: 'text', text: '' }]
  if (depth > 6) return [{ type: 'text', text: content }]

  const segments: InlineSegment[] = []
  let index = 0

  const pushText = (text: string) => {
    if (!text) return
    const last = segments[segments.length - 1]
    if (last?.type === 'text') last.text += text
    else segments.push({ type: 'text', text })
  }

  while (index < content.length) {
    const rest = content.slice(index)

    if (rest.startsWith('`')) {
      const closeAt = takeUntil(content, index + 1, '`')
      if (closeAt !== -1 && closeAt > index + 1) {
        segments.push({ type: 'code', text: content.slice(index + 1, closeAt) })
        index = closeAt + 1
        continue
      }
    }

    if (rest.startsWith('[[arquivo:') || rest.startsWith('[[secao:')) {
      const closeAt = takeUntil(content, index + 2, ']]')
      if (closeAt !== -1) {
        const body = content.slice(index + 2, closeAt)
        const colon = body.indexOf(':')
        if (colon !== -1) {
          const kind = body.slice(0, colon)
          const key = body.slice(colon + 1).trim()
          if ((kind === 'arquivo' || kind === 'secao') && key) {
            segments.push({ type: 'citation', kind, key })
            index = closeAt + 2
            continue
          }
        }
      }
    }

    if (rest.startsWith('[')) {
      const labelClose = takeUntil(content, index + 1, ']')
      if (labelClose !== -1 && content[labelClose + 1] === '(') {
        const hrefClose = takeUntil(content, labelClose + 2, ')')
        if (hrefClose !== -1) {
          const label = content.slice(index + 1, labelClose)
          const href = content.slice(labelClose + 2, hrefClose).trim()
          if (label && href && !/\s/.test(href)) {
            segments.push({
              type: 'link',
              href,
              children: parseInlineMarkdown(label, depth + 1),
            })
            index = hrefClose + 1
            continue
          }
        }
      }
    }

    const autoLink = rest.match(/^https?:\/\/[^\s<]+/)
    if (autoLink) {
      const raw = autoLink[0]
      const href = raw.replace(/[),.;:!?]+$/, '')
      segments.push({
        type: 'link',
        href,
        children: [{ type: 'text', text: href }],
      })
      index += href.length
      continue
    }

    const triple =
      parseDelimited(content, index, '***', '***') ??
      parseDelimited(content, index, '___', '___')
    if (triple) {
      segments.push({
        type: 'boldItalic',
        children: parseInlineMarkdown(triple.inner, depth + 1),
      })
      index = triple.end
      continue
    }

    const strike = parseDelimited(content, index, '~~', '~~')
    if (strike) {
      segments.push({
        type: 'strike',
        children: parseInlineMarkdown(strike.inner, depth + 1),
      })
      index = strike.end
      continue
    }

    const bold =
      parseDelimited(content, index, '**', '**') ?? parseDelimited(content, index, '__', '__')
    if (bold) {
      segments.push({
        type: 'bold',
        children: parseInlineMarkdown(bold.inner, depth + 1),
      })
      index = bold.end
      continue
    }

    if (rest.startsWith('*') && !rest.startsWith('**')) {
      const italic = parseDelimited(content, index, '*', '*')
      if (italic && !italic.inner.includes('\n')) {
        segments.push({
          type: 'italic',
          children: parseInlineMarkdown(italic.inner, depth + 1),
        })
        index = italic.end
        continue
      }
    }

    pushText(content[index])
    index += 1
  }

  return segments.length ? segments : [{ type: 'text', text: content }]
}

function flattenInlineText(segments: InlineSegment[]): string {
  return segments
    .map((segment) => {
      if (segment.type === 'text' || segment.type === 'code') return segment.text
      if (segment.type === 'citation') {
        return segment.kind === 'arquivo'
          ? `[Arquivo: ${segment.key}]`
          : `[Seção: ${segment.key}]`
      }
      if (segment.type === 'link') {
        const label = flattenInlineText(segment.children)
        return label === segment.href ? segment.href : `${label} (${segment.href})`
      }
      return flattenInlineText(segment.children)
    })
    .join('')
}

/** Plain text with citation labels; strips inline emphasis markers. */
export function formatCitationText(text: string): string {
  return flattenInlineText(parseInlineMarkdown(text))
}

function leadingIndent(line: string): number {
  const match = line.match(/^[ \t]*/)?.[0] ?? ''
  return match.replace(/\t/g, '  ').length
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line)
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function isHorizontalRule(line: string): boolean {
  return /^-{3,}$/.test(line) || /^\*{3,}$/.test(line) || /^_{3,}$/.test(line)
}

function parseTaskMarker(text: string): { checked?: boolean; text: string } {
  const match = text.match(/^\[([ xX])\]\s+(.+)$/)
  if (!match) return { text }
  return { checked: match[1].toLowerCase() === 'x', text: match[2] }
}

function headingLevel(line: string): 1 | 2 | 3 | 4 | 5 | 6 | null {
  const match = line.match(/^(#{1,6})\s+(.+)$/)
  if (!match) return null
  return match[1].length as 1 | 2 | 3 | 4 | 5 | 6
}

export function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  let list: MarkdownListItem[] | null = null
  let listOrdered = false
  let quoteLines: string[] = []
  let index = 0

  function flushParagraph() {
    if (!paragraph.length) return
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }

  function flushList() {
    if (!list?.length) {
      list = null
      return
    }
    blocks.push({ type: 'list', ordered: listOrdered, items: list })
    list = null
  }

  function flushQuote() {
    if (!quoteLines.length) return
    blocks.push({ type: 'quote', lines: quoteLines })
    quoteLines = []
  }

  function flushAll() {
    flushParagraph()
    flushList()
    flushQuote()
  }

  while (index < lines.length) {
    const rawLine = lines[index]
    const indent = leadingIndent(rawLine)
    const line = rawLine.trim()

    if (!line) {
      if (quoteLines.length) {
        quoteLines.push('')
        index += 1
        continue
      }
      flushAll()
      index += 1
      continue
    }

    if (line.startsWith('```')) {
      flushAll()
      const language = line.slice(3).trim()
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      blocks.push({ type: 'code', language, code: codeLines.join('\n') })
      index += 1
      continue
    }

    if (isHorizontalRule(line)) {
      flushAll()
      blocks.push({ type: 'hr' })
      index += 1
      continue
    }

    if (line.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1].trim())) {
      flushAll()
      const headers = splitTableRow(line)
      index += 2
      const rows: string[][] = []
      while (index < lines.length) {
        const rowLine = lines[index].trim()
        if (!rowLine || !rowLine.includes('|')) break
        rows.push(splitTableRow(rowLine))
        index += 1
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }

    const unorderedMatch = line.match(/^[-*+] (.+)$/)
    if (unorderedMatch) {
      flushParagraph()
      flushQuote()
      const level = Math.min(Math.floor(indent / 2), 3)
      const task = parseTaskMarker(unorderedMatch[1])
      if (!list || listOrdered) {
        flushList()
        list = []
        listOrdered = false
      }
      list.push({ text: task.text, level, checked: task.checked })
      index += 1
      continue
    }

    const orderedMatch = line.match(/^(\d+)\. (.+)$/)
    if (orderedMatch) {
      flushParagraph()
      flushQuote()
      const level = Math.min(Math.floor(indent / 2), 3)
      const task = parseTaskMarker(orderedMatch[2])
      if (!list || !listOrdered) {
        flushList()
        list = []
        listOrdered = true
      }
      list.push({ text: task.text, level, checked: task.checked })
      index += 1
      continue
    }

    flushList()

    if (line.startsWith('>')) {
      flushParagraph()
      quoteLines.push(line.replace(/^>\s?/, ''))
      index += 1
      continue
    }

    flushQuote()

    const level = headingLevel(line)
    if (level) {
      flushParagraph()
      blocks.push({
        type: 'heading',
        level,
        text: line.replace(/^#{1,6}\s+/, ''),
      })
      index += 1
      continue
    }

    paragraph.push(line)
    index += 1
  }

  flushAll()

  return blocks
}
