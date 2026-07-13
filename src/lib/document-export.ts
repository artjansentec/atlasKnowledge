import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  InternalHyperlink,
  LeaderType,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  Tab,
  TextRun,
  WidthType,
  Bookmark,
  PageReference,
  TabStopType,
  convertInchesToTwip,
  type FileChild,
} from 'docx'
import { formatDateBR } from './date'
import {
  formatCitationText,
  parseInlineMarkdown,
  parseMarkdown,
  type MarkdownBlock,
  type MarkdownListItem,
} from './markdown'
import type { DocumentExportPayload, DocumentExportSection } from './document-export-types'
import {
  ABNT_BLACK,
  ABNT_FONT,
  ABNT_FONT_SIZE,
  ABNT_LINE_SPACING,
  ABNT_TITLE_FONT_SIZE,
  buildTocEntries,
  formatSectionTitle,
  getExportFileName,
  sectionBookmarkId,
  titleCase,
} from './document-export-shared'

export type { DocumentExportPayload, DocumentExportSection }

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function blackText(
  text: string,
  options: {
    bold?: boolean
    italics?: boolean
    strike?: boolean
    size?: number
  } = {},
) {
  return new TextRun({
    text,
    font: ABNT_FONT,
    size: options.size ?? ABNT_FONT_SIZE,
    bold: options.bold,
    italics: options.italics,
    strike: options.strike,
    color: ABNT_BLACK,
  })
}

function coverMetadataLine(label: string, value: string) {
  const displayValue = value.trim() || '—'

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 160, line: ABNT_LINE_SPACING },
    children: [blackText(`${label}: `, { bold: true }), blackText(displayValue)],
  })
}

function buildCoverParagraphs(payload: DocumentExportPayload) {
  const devResponsibles = payload.devResponsibles.filter(Boolean).join(', ') || '—'

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 720, after: 480, line: ABNT_LINE_SPACING },
      children: [blackText(payload.projectName, { bold: true, size: ABNT_TITLE_FONT_SIZE })],
    }),
    coverMetadataLine('Responsável', payload.responsible),
    coverMetadataLine('Desenvolvedor responsável', devResponsibles),
    coverMetadataLine('Cliente', payload.client ?? '—'),
    coverMetadataLine('Data de criação', formatDateBR(payload.createdAt)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 240, line: ABNT_LINE_SPACING },
      children: [blackText(payload.viewLabel, { italics: true })],
    }),
    new Paragraph({
      children: [new PageBreak()],
    }),
  ]
}

function buildSummaryParagraphs(payload: DocumentExportPayload): FileChild[] {
  const tocEntries = buildTocEntries(payload.sections)

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 480, line: ABNT_LINE_SPACING },
      children: [blackText('SUMÁRIO', { bold: true })],
    }),
    ...tocEntries.map(
      (entry) =>
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: convertInchesToTwip(6.1),
              leader: LeaderType.DOT,
            },
          ],
          indent: { left: convertInchesToTwip(0.15 + entry.depth * 0.35) },
          spacing: { after: 120, line: ABNT_LINE_SPACING },
          children: [
            new InternalHyperlink({
              anchor: entry.id,
              children: [blackText(formatSectionTitle(entry.title, entry.depth))],
            }),
            new TextRun({ children: [new Tab()], color: ABNT_BLACK, font: ABNT_FONT, size: ABNT_FONT_SIZE }),
            new PageReference(entry.id),
          ],
        }),
    ),
    new Paragraph({
      children: [new PageBreak()],
    }),
  ]
}

function sectionHeadingParagraph(title: string, depth: number, bookmarkId: string) {
  const text = formatSectionTitle(title, depth)
  const normalizedDepth = Math.min(depth, 2)

  return new Paragraph({
    outlineLevel: Math.min(depth, 8),
    spacing: { before: normalizedDepth === 0 ? 480 : 320, after: 200, line: ABNT_LINE_SPACING },
    alignment: AlignmentType.LEFT,
    children: [
      new Bookmark({
        id: bookmarkId,
        children: [
          blackText(text, {
            bold: true,
            italics: normalizedDepth >= 2,
          }),
        ],
      }),
    ],
  })
}

function inlineRuns(
  text: string,
  options: { bold?: boolean; italics?: boolean; strike?: boolean; size?: number } = {},
) {
  return flattenInlineRuns(parseInlineMarkdown(text), options)
}

function flattenInlineRuns(
  segments: ReturnType<typeof parseInlineMarkdown>,
  options: { bold?: boolean; italics?: boolean; strike?: boolean; size?: number } = {},
): TextRun[] {
  return segments.flatMap((segment) => {
    if (segment.type === 'text') {
      return [blackText(segment.text, options)]
    }

    if (segment.type === 'code') {
      return [
        new TextRun({
          text: segment.text,
          font: 'Courier New',
          size: (options.size ?? ABNT_FONT_SIZE) - 2,
          color: ABNT_BLACK,
        }),
      ]
    }

    if (segment.type === 'citation') {
      const label =
        segment.kind === 'arquivo'
          ? `[Arquivo: ${segment.key}]`
          : `[Seção: ${segment.key}]`
      return [blackText(label, options)]
    }

    if (segment.type === 'link') {
      const plain = flattenInlineTextLabel(segment.children)
      const display = plain && plain !== segment.href ? `${plain} (${segment.href})` : segment.href
      return [blackText(display, { ...options, italics: true })]
    }

    if (segment.type === 'bold') {
      return flattenInlineRuns(segment.children, { ...options, bold: true })
    }

    if (segment.type === 'italic') {
      return flattenInlineRuns(segment.children, { ...options, italics: true })
    }

    if (segment.type === 'boldItalic') {
      return flattenInlineRuns(segment.children, { ...options, bold: true, italics: true })
    }

    if (segment.type === 'strike') {
      return flattenInlineRuns(segment.children, { ...options, strike: true })
    }

    return []
  })
}

function flattenInlineTextLabel(segments: ReturnType<typeof parseInlineMarkdown>): string {
  return segments
    .map((segment) => {
      if (segment.type === 'text' || segment.type === 'code') return segment.text
      if (segment.type === 'citation') {
        return segment.kind === 'arquivo'
          ? `[Arquivo: ${segment.key}]`
          : `[Seção: ${segment.key}]`
      }
      if (segment.type === 'link') return flattenInlineTextLabel(segment.children)
      return flattenInlineTextLabel(segment.children)
    })
    .join('')
}

function markdownHeadingParagraph(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  text: string,
  sectionDepth: number,
) {
  const content = formatCitationText(text)

  return new Paragraph({
    outlineLevel: Math.min(sectionDepth + level, 8),
    spacing: { before: level === 1 ? 360 : 280, after: 160, line: ABNT_LINE_SPACING },
    alignment: AlignmentType.LEFT,
    children: [
      blackText(level === 1 ? content.toUpperCase() : titleCase(content), {
        bold: true,
        italics: level >= 3,
      }),
    ],
  })
}

function markdownParagraph(text: string) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 200, line: ABNT_LINE_SPACING },
    children: inlineRuns(text),
  })
}

function markdownQuote(lines: string[]) {
  return lines
    .filter((line) => line.trim())
    .map(
      (line) =>
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: convertInchesToTwip(0.5) },
          spacing: { after: 120, line: ABNT_LINE_SPACING },
          children: inlineRuns(line, { italics: true }),
        }),
    )
}

function markdownList(items: MarkdownListItem[], ordered: boolean) {
  return items.map((item, index) => {
    const taskPrefix =
      item.checked === undefined ? '' : item.checked ? '[x] ' : '[ ] '
    const numberPrefix = ordered ? `${index + 1}. ` : ''
    const useBullets = !ordered && item.checked === undefined

    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 120, line: ABNT_LINE_SPACING },
      indent: {
        left: convertInchesToTwip((ordered ? 0.35 : 0) + item.level * 0.25),
      },
      ...(useBullets ? { numbering: { reference: 'abnt-bullets', level: 0 } } : {}),
      children: [
        ...(numberPrefix || taskPrefix ? [blackText(`${numberPrefix}${taskPrefix}`)] : []),
        ...inlineRuns(item.text),
      ],
    })
  })
}

function markdownTable(headers: string[], rows: string[][]) {
  const border = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: '000000',
  }
  const borders = { top: border, bottom: border, left: border, right: border }

  const headerRow = new TableRow({
    children: headers.map(
      (header) =>
        new TableCell({
          borders,
          width: { size: Math.floor(9000 / Math.max(headers.length, 1)), type: WidthType.DXA },
          children: [
            new Paragraph({
              children: inlineRuns(header, { bold: true }),
            }),
          ],
        }),
    ),
  })

  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        children: headers.map((_, cellIndex) => {
          const cell = row[cellIndex] ?? ''
          return new TableCell({
            borders,
            width: { size: Math.floor(9000 / Math.max(headers.length, 1)), type: WidthType.DXA },
            children: [new Paragraph({ children: inlineRuns(cell) })],
          })
        }),
      }),
  )

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [headerRow, ...bodyRows],
  })
}

function markdownCode(code: string) {
  return code.split('\n').map(
    (line) =>
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 40, line: ABNT_LINE_SPACING },
        indent: { left: convertInchesToTwip(0.25) },
        children: [
          new TextRun({
            text: line || ' ',
            font: 'Courier New',
            size: ABNT_FONT_SIZE - 2,
            color: ABNT_BLACK,
          }),
        ],
      }),
  )
}

function markdownHr() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 },
    },
    children: [],
  })
}

function blocksToDocxParagraphs(blocks: MarkdownBlock[], sectionDepth: number) {
  const paragraphs: FileChild[] = []

  for (const block of blocks) {
    if (block.type === 'heading') {
      paragraphs.push(markdownHeadingParagraph(block.level, block.text, sectionDepth))
      continue
    }

    if (block.type === 'quote') {
      paragraphs.push(...markdownQuote(block.lines))
      continue
    }

    if (block.type === 'list') {
      paragraphs.push(...markdownList(block.items, block.ordered))
      continue
    }

    if (block.type === 'table') {
      paragraphs.push(markdownTable(block.headers, block.rows))
      continue
    }

    if (block.type === 'code') {
      paragraphs.push(...markdownCode(block.code))
      continue
    }

    if (block.type === 'hr') {
      paragraphs.push(markdownHr())
      continue
    }

    paragraphs.push(markdownParagraph(block.text))
  }

  return paragraphs
}

function buildPageFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120 },
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            font: ABNT_FONT,
            size: ABNT_FONT_SIZE,
            color: ABNT_BLACK,
          }),
        ],
      }),
    ],
  })
}

export async function exportDocumentAsWord(payload: DocumentExportPayload) {
  const children: FileChild[] = [...buildCoverParagraphs(payload), ...buildSummaryParagraphs(payload)]

  payload.sections.forEach((section, index) => {
    children.push(sectionHeadingParagraph(section.title, section.depth, sectionBookmarkId(index)))
    children.push(...blocksToDocxParagraphs(parseMarkdown(section.content), section.depth))
  })

  const document = new Document({
    numbering: {
      config: [
        {
          reference: 'abnt-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.18) },
                },
                run: {
                  font: ABNT_FONT,
                  size: ABNT_FONT_SIZE,
                  color: ABNT_BLACK,
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        footers: {
          default: buildPageFooter(),
        },
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1.18),
              right: convertInchesToTwip(0.79),
              bottom: convertInchesToTwip(0.98),
              left: convertInchesToTwip(1.18),
            },
          },
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(document)
  downloadBlob(blob, getExportFileName(payload, 'docx'))
}
