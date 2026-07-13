import { type ReactNode } from 'react'
import { type ProjectAttachment, getAttachmentFileType } from '../lib/projects'
import {
  parseInlineMarkdown,
  parseMarkdown,
  type InlineSegment,
  type MarkdownListItem,
} from '../lib/markdown'
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
          const Heading = `h${Math.min(block.level, 6)}` as
            | 'h1'
            | 'h2'
            | 'h3'
            | 'h4'
            | 'h5'
            | 'h6'
          return <Heading key={index}>{render(block.text)}</Heading>
        }

        if (block.type === 'quote') {
          return (
            <blockquote key={index}>
              {block.lines.map((line, lineIndex) =>
                line ? <p key={lineIndex}>{render(line)}</p> : <br key={lineIndex} />,
              )}
            </blockquote>
          )
        }

        if (block.type === 'list') {
          return (
            <MarkdownList
              key={index}
              ordered={block.ordered}
              items={block.items}
              render={render}
            />
          )
        }

        if (block.type === 'table') {
          return (
            <div key={index} className="markdown-view__table-wrap">
              <table className="markdown-view__table">
                <thead>
                  <tr>
                    {block.headers.map((header) => (
                      <th key={header}>{render(header)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{render(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        if (block.type === 'code') {
          return (
            <pre key={index} className="markdown-view__code-block">
              {block.language ? (
                <span className="markdown-view__code-lang">{block.language}</span>
              ) : null}
              <code data-language={block.language || undefined}>{block.code}</code>
            </pre>
          )
        }

        if (block.type === 'hr') {
          return <hr key={index} className="markdown-view__hr" />
        }

        return <p key={index}>{render(block.text)}</p>
      })}
    </div>
  )
}

function MarkdownList({
  ordered,
  items,
  render,
}: {
  ordered: boolean
  items: MarkdownListItem[]
  render: (text: string) => ReactNode
}) {
  const ListTag = ordered ? 'ol' : 'ul'
  const hasTasks = items.some((item) => item.checked !== undefined)

  return (
    <ListTag className={`markdown-view__list${hasTasks ? ' markdown-view__list--tasks' : ''}`}>
      {items.map((item, index) => (
        <li
          key={`${item.level}-${item.text}-${index}`}
          className={`markdown-view__list-item${item.checked !== undefined ? ' markdown-view__list-item--task' : ''}${item.checked ? ' is-checked' : ''}`}
          style={{ marginLeft: item.level * 1.25 + 'rem' }}
        >
          {item.checked !== undefined ? (
            <span className="markdown-view__task-marker" aria-hidden="true">
              {item.checked ? '☑' : '☐'}
            </span>
          ) : null}
          <span className="markdown-view__list-text">{render(item.text)}</span>
        </li>
      ))}
    </ListTag>
  )
}

function renderSegments(
  segments: InlineSegment[],
  attachments: ProjectAttachment[],
  onOpenAttachment: ((attachment: ProjectAttachment) => void) | undefined,
  sections: MarkdownSectionRef[],
  onOpenSection: ((sectionId: string) => void) | undefined,
  keyPrefix = '',
): ReactNode[] {
  return segments.map((segment, index) => {
    const key = `${keyPrefix}${index}`
    const nested = (children: InlineSegment[]) =>
      renderSegments(children, attachments, onOpenAttachment, sections, onOpenSection, `${key}-`)

    if (segment.type === 'text') {
      return <span key={key}>{segment.text}</span>
    }

    if (segment.type === 'bold') {
      return <strong key={key}>{nested(segment.children)}</strong>
    }

    if (segment.type === 'italic') {
      return <em key={key}>{nested(segment.children)}</em>
    }

    if (segment.type === 'boldItalic') {
      return (
        <strong key={key}>
          <em>{nested(segment.children)}</em>
        </strong>
      )
    }

    if (segment.type === 'strike') {
      return <del key={key}>{nested(segment.children)}</del>
    }

    if (segment.type === 'code') {
      return (
        <code key={key} className="markdown-view__inline-code">
          {segment.text}
        </code>
      )
    }

    if (segment.type === 'link') {
      return (
        <a
          key={key}
          className="markdown-view__link"
          href={segment.href}
          target="_blank"
          rel="noreferrer noopener"
        >
          {nested(segment.children)}
        </a>
      )
    }

    if (segment.type === 'citation' && segment.kind === 'secao') {
      const section = sections.find((item) => item.id === segment.key || item.title === segment.key)
      if (section) {
        return (
          <button
            key={`section-${section.id}-${key}`}
            type="button"
            className="markdown-section-reference"
            title={`Ir para a seção do projeto: ${section.title}`}
            onClick={() => onOpenSection?.(section.id)}
          >
            <span className="markdown-section-reference__name">{section.title}</span>
          </button>
        )
      }
      return <span key={key}>{`[[secao:${segment.key}]]`}</span>
    }

    if (segment.type === 'citation' && segment.kind === 'arquivo') {
      const attachment = attachments.find(
        (item) => item.id === segment.key || item.name === segment.key,
      )
      if (attachment) {
        return (
          <button
            key={`${attachment.id}-${key}`}
            type="button"
            className="markdown-file-reference"
            title={`${attachment.name} · ${getAttachmentFileType(attachment).toUpperCase()} · ${attachment.size ?? '—'}`}
            onClick={() => onOpenAttachment?.(attachment)}
          >
            <span className="markdown-file-reference__name">{attachment.name}</span>
          </button>
        )
      }
      return <span key={key}>{`[[arquivo:${segment.key}]]`}</span>
    }

    return <span key={key} />
  })
}

function renderInlineContent(
  text: string,
  attachments: ProjectAttachment[],
  onOpenAttachment: ((attachment: ProjectAttachment) => void) | undefined,
  sections: MarkdownSectionRef[],
  onOpenSection: ((sectionId: string) => void) | undefined,
) {
  return renderSegments(parseInlineMarkdown(text), attachments, onOpenAttachment, sections, onOpenSection)
}
