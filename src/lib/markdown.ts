export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[] }

export function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.split(/\r?\n/)
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  let list: string[] = []

  function flushParagraph() {
    if (!paragraph.length) return
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }

  function flushList() {
    if (!list.length) return
    blocks.push({ type: 'list', items: list })
    list = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    if (line.startsWith('- ')) {
      flushParagraph()
      list.push(line.slice(2))
      continue
    }

    flushList()

    if (line.startsWith('### ')) {
      flushParagraph()
      blocks.push({ type: 'heading', level: 3, text: line.slice(4) })
      continue
    }

    if (line.startsWith('## ')) {
      flushParagraph()
      blocks.push({ type: 'heading', level: 2, text: line.slice(3) })
      continue
    }

    if (line.startsWith('# ')) {
      flushParagraph()
      blocks.push({ type: 'heading', level: 1, text: line.slice(2) })
      continue
    }

    if (line.startsWith('> ')) {
      flushParagraph()
      blocks.push({ type: 'quote', text: line.slice(2) })
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()
  flushList()

  return blocks
}

export function formatCitationText(text: string): string {
  return text.replace(/\[\[(arquivo|secao):([^\]]+)]]/g, (_, kind: string, key: string) => {
    const label = key.trim()
    return kind === 'arquivo' ? `[Arquivo: ${label}]` : `[Seção: ${label}]`
  })
}
