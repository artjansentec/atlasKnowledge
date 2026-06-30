import { type ReactNode } from 'react'
import { type ProjectAttachment, getAttachmentFileType } from '../lib/projects'
import './markdown-view.css'

type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[] }

export function MarkdownView({
  content,
  attachments = [],
  onOpenAttachment,
}: {
  content: string
  attachments?: ProjectAttachment[]
  onOpenAttachment?: (attachment: ProjectAttachment) => void
}) {
  const blocks = parseMarkdown(content)

  return (
    <div className="markdown-view">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Heading = `h${block.level}` as 'h1' | 'h2' | 'h3'
          return <Heading key={index}>{renderInlineContent(block.text, attachments, onOpenAttachment)}</Heading>
        }

        if (block.type === 'quote') {
          return <blockquote key={index}>{renderInlineContent(block.text, attachments, onOpenAttachment)}</blockquote>
        }

        if (block.type === 'list') {
          return (
            <ul key={index}>
              {block.items.map((item) => (
                <li key={item}>{renderInlineContent(item, attachments, onOpenAttachment)}</li>
              ))}
            </ul>
          )
        }

        return <p key={index}>{renderInlineContent(block.text, attachments, onOpenAttachment)}</p>
      })}
    </div>
  )
}

function renderInlineContent(
  text: string,
  attachments: ProjectAttachment[],
  onOpenAttachment?: (attachment: ProjectAttachment) => void,
) {
  const parts: ReactNode[] = []
  const citationPattern = /\[\[arquivo:([^\]]+)]]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = citationPattern.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))

    const attachmentKey = match[1].trim()
    const attachment = attachments.find((item) => item.id === attachmentKey || item.name === attachmentKey)

    if (attachment) {
      parts.push(
        <button
          key={`${attachment.id}-${match.index}`}
          type="button"
          className="markdown-file-reference"
          title={`${attachment.name} · ${getAttachmentFileType(attachment).toUpperCase()} · ${attachment.size ?? '—'}`}
          onClick={() => onOpenAttachment?.(attachment)}
        >
          <span className="markdown-file-reference__name">{attachment.name}</span>
        </button>,
      )
    } else {
      parts.push(match[0])
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))

  return parts
}

function parseMarkdown(content: string): MarkdownBlock[] {
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
