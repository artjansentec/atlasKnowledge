import { type ReactNode } from 'react'
import { type ProjectAttachment, getAttachmentFileType } from '../lib/projects'
import { parseMarkdown } from '../lib/markdown'
import './markdown-view.css'

export type MarkdownSectionRef = { id: string; title: string }

export function MarkdownView({
  content,
  attachments = [],
  onOpenAttachment,
  sections = [],
  onOpenSection,
}: {
  content: string
  attachments?: ProjectAttachment[]
  onOpenAttachment?: (attachment: ProjectAttachment) => void
  sections?: MarkdownSectionRef[]
  onOpenSection?: (sectionId: string) => void
}) {
  const blocks = parseMarkdown(content)
  const render = (text: string) =>
    renderInlineContent(text, attachments, onOpenAttachment, sections, onOpenSection)

  return (
    <div className="markdown-view">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Heading = `h${block.level}` as 'h1' | 'h2' | 'h3'
          return <Heading key={index}>{render(block.text)}</Heading>
        }

        if (block.type === 'quote') {
          return <blockquote key={index}>{render(block.text)}</blockquote>
        }

        if (block.type === 'list') {
          return (
            <ul key={index}>
              {block.items.map((item) => (
                <li key={item}>{render(item)}</li>
              ))}
            </ul>
          )
        }

        return <p key={index}>{render(block.text)}</p>
      })}
    </div>
  )
}

function renderInlineContent(
  text: string,
  attachments: ProjectAttachment[],
  onOpenAttachment: ((attachment: ProjectAttachment) => void) | undefined,
  sections: MarkdownSectionRef[],
  onOpenSection: ((sectionId: string) => void) | undefined,
) {
  const parts: ReactNode[] = []
  const citationPattern = /\[\[(arquivo|secao):([^\]]+)]]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = citationPattern.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))

    const kind = match[1]
    const key = match[2].trim()

    if (kind === 'secao') {
      const section = sections.find((item) => item.id === key || item.title === key)
      if (section) {
        parts.push(
          <button
            key={`section-${section.id}-${match.index}`}
            type="button"
            className="markdown-section-reference"
            title={`Ir para a seção do projeto: ${section.title}`}
            onClick={() => onOpenSection?.(section.id)}
          >
            <span className="markdown-section-reference__name">{section.title}</span>
          </button>,
        )
      } else {
        parts.push(match[0])
      }
    } else {
      const attachment = attachments.find((item) => item.id === key || item.name === key)
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
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))

  return parts
}
