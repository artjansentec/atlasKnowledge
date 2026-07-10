import {
  AlignmentType,
  Document,
  Footer,
  InternalHyperlink,
  LeaderType,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Tab,
  TextRun,
  Bookmark,
  PageReference,
  TabStopType,
  convertInchesToTwip,
  type FileChild,
} from 'docx'
import { formatDateBR } from './date'
import { formatCitationText, parseMarkdown, type MarkdownBlock } from './markdown'
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
    size?: number
  } = {},
) {
  return new TextRun({
    text,
    font: ABNT_FONT,
    size: options.size ?? ABNT_FONT_SIZE,
    bold: options.bold,
    italics: options.italics,
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

function markdownHeadingParagraph(level: 1 | 2 | 3, text: string, sectionDepth: number) {
  const content = formatCitationText(text)

  return new Paragraph({
    outlineLevel: Math.min(sectionDepth + level, 8),
    spacing: { before: level === 1 ? 360 : 280, after: 160, line: ABNT_LINE_SPACING },
    alignment: AlignmentType.LEFT,
    children: [
      blackText(level === 1 ? content.toUpperCase() : titleCase(content), {
        bold: true,
        italics: level === 3,
      }),
    ],
  })
}

function markdownParagraph(text: string) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 200, line: ABNT_LINE_SPACING },
    children: [blackText(formatCitationText(text))],
  })
}

function markdownQuote(text: string) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: convertInchesToTwip(0.5) },
    spacing: { after: 200, line: ABNT_LINE_SPACING },
    children: [blackText(formatCitationText(text), { italics: true })],
  })
}

function markdownList(items: string[]) {
  return items.map(
    (item) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120, line: ABNT_LINE_SPACING },
        numbering: { reference: 'abnt-bullets', level: 0 },
        children: [blackText(formatCitationText(item))],
      }),
  )
}

function blocksToDocxParagraphs(blocks: MarkdownBlock[], sectionDepth: number) {
  const paragraphs: Paragraph[] = []

  for (const block of blocks) {
    if (block.type === 'heading') {
      paragraphs.push(markdownHeadingParagraph(block.level, block.text, sectionDepth))
      continue
    }

    if (block.type === 'quote') {
      paragraphs.push(markdownQuote(block.text))
      continue
    }

    if (block.type === 'list') {
      paragraphs.push(...markdownList(block.items))
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
