import { jsPDF } from 'jspdf'
import { formatDateBR } from './date'
import { formatCitationText, parseMarkdown, type MarkdownBlock } from './markdown'
import type { DocumentExportPayload } from './document-export-types'
import {
  buildTocEntries,
  formatSectionTitle,
  getExportFileName,
  titleCase,
  type TocEntry,
} from './document-export-shared'

const MARGIN_LEFT = 30
const MARGIN_RIGHT = 20
const MARGIN_TOP = 30
const MARGIN_BOTTOM = 22
const FOOTER_Y_OFFSET = 12
const FONT_SIZE = 12
const LINE_HEIGHT_MM = 6.35

type PdfWriter = {
  pdf: jsPDF
  y: number
  contentWidth: number
  pageHeight: number
  pageWidth: number
}

function createWriter() {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  pdf.setTextColor(0, 0, 0)
  pdf.setFont('times', 'normal')
  pdf.setFontSize(FONT_SIZE)

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  return {
    pdf,
    y: MARGIN_TOP,
    contentWidth: pageWidth - MARGIN_LEFT - MARGIN_RIGHT,
    pageHeight,
    pageWidth,
  }
}

function contentBottom(writer: PdfWriter) {
  return writer.pageHeight - MARGIN_BOTTOM
}

function ensureSpace(writer: PdfWriter, height: number) {
  if (writer.y + height <= contentBottom(writer)) return

  writer.pdf.addPage()
  writer.y = MARGIN_TOP
}

function writeJustifiedLine(writer: PdfWriter, line: string, x: number, width: number, y: number, justify: boolean) {
  const trimmed = line.trim()

  if (!justify || !trimmed.includes(' ')) {
    writer.pdf.text(line, x, y, { maxWidth: width })
    return
  }

  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length <= 1) {
    writer.pdf.text(trimmed, x, y)
    return
  }

  const wordWidths = words.map((word) => writer.pdf.getTextWidth(word))
  const totalWordsWidth = wordWidths.reduce((sum, value) => sum + value, 0)
  const spaceWidth = (width - totalWordsWidth) / (words.length - 1)
  let cursorX = x

  words.forEach((word, index) => {
    writer.pdf.text(word, cursorX, y)
    cursorX += wordWidths[index]! + spaceWidth
  })
}

function writeLines(
  writer: PdfWriter,
  lines: string[],
  options: {
    fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic'
    indent?: number
    spacingBefore?: number
    spacingAfter?: number
    align?: 'left' | 'center' | 'justify'
  } = {},
) {
  const {
    fontStyle = 'normal',
    indent = 0,
    spacingBefore = 0,
    spacingAfter = 2,
    align = 'left',
  } = options

  if (!lines.length) return

  ensureSpace(writer, spacingBefore + lines.length * LINE_HEIGHT_MM + spacingAfter)
  writer.y += spacingBefore
  writer.pdf.setFont('times', fontStyle)
  writer.pdf.setTextColor(0, 0, 0)

  const x = MARGIN_LEFT + indent
  const width = writer.contentWidth - indent

  for (let index = 0; index < lines.length; index += 1) {
    ensureSpace(writer, LINE_HEIGHT_MM)
    const isLastLine = index === lines.length - 1

    if (align === 'justify') {
      writeJustifiedLine(writer, lines[index]!, x, width, writer.y, !isLastLine)
    } else if (align === 'center') {
      writer.pdf.text(lines[index]!, writer.pageWidth / 2, writer.y, { align: 'center' })
    } else {
      writer.pdf.text(lines[index]!, x, writer.y, { maxWidth: width, align })
    }

    writer.y += LINE_HEIGHT_MM
  }

  writer.y += spacingAfter
  writer.pdf.setFont('times', 'normal')
}

function writeWrappedText(
  writer: PdfWriter,
  text: string,
  options: Parameters<typeof writeLines>[2] = {},
) {
  const indent = options.indent ?? 0
  const lines = writer.pdf.splitTextToSize(text, writer.contentWidth - indent)
  writeLines(writer, lines, options)
}

function writeCenteredText(
  writer: PdfWriter,
  text: string,
  options: { fontStyle?: 'normal' | 'bold' | 'italic'; spacingBefore?: number; spacingAfter?: number } = {},
) {
  writeWrappedText(writer, text, {
    fontStyle: options.fontStyle ?? 'normal',
    spacingBefore: options.spacingBefore ?? 0,
    spacingAfter: options.spacingAfter ?? 2,
    align: 'center',
  })
}

function writeCover(writer: PdfWriter, payload: DocumentExportPayload) {
  const devResponsibles = payload.devResponsibles.filter(Boolean).join(', ') || '—'

  writeCenteredText(writer, payload.projectName, {
    fontStyle: 'bold',
    spacingBefore: 40,
    spacingAfter: 12,
  })
  writeCenteredText(writer, `Responsável: ${payload.responsible || '—'}`, { spacingAfter: 4 })
  writeCenteredText(writer, `Desenvolvedor responsável: ${devResponsibles}`, { spacingAfter: 4 })
  writeCenteredText(writer, `Cliente: ${payload.client?.trim() || '—'}`, { spacingAfter: 4 })
  writeCenteredText(writer, `Data de criação: ${formatDateBR(payload.createdAt)}`, { spacingAfter: 10 })
  writeCenteredText(writer, payload.viewLabel, { fontStyle: 'italic', spacingAfter: 0 })
}

function writeTocEntry(writer: PdfWriter, entry: TocEntry & { page: number }, targetPage: number) {
  const indent = entry.depth * 6
  const title = formatSectionTitle(entry.title, entry.depth)
  const pageLabel = String(entry.page)
  const leftX = MARGIN_LEFT + indent
  const rightX = writer.pageWidth - MARGIN_RIGHT

  ensureSpace(writer, LINE_HEIGHT_MM)
  writer.pdf.setFont('times', 'normal')
  writer.pdf.setTextColor(0, 0, 0)

  const titleWidth = writer.pdf.getTextWidth(title)
  const pageWidth = writer.pdf.getTextWidth(pageLabel)
  writer.pdf.textWithLink(title, leftX, writer.y, { pageNumber: targetPage })

  const dotsStart = leftX + titleWidth + 2
  const dotsEnd = rightX - pageWidth - 2
  if (dotsEnd > dotsStart) {
    const dotWidth = writer.pdf.getTextWidth('.')
    let dotX = dotsStart
    while (dotX < dotsEnd) {
      writer.pdf.text('.', dotX, writer.y)
      dotX += dotWidth
    }
  }

  writer.pdf.text(pageLabel, rightX, writer.y, { align: 'right' })
  writer.y += LINE_HEIGHT_MM
}

function writeSummaryPage(writer: PdfWriter, entries: Array<TocEntry & { page: number }>, targetPages: number[]) {
  writer.y = MARGIN_TOP
  writeCenteredText(writer, 'SUMÁRIO', { fontStyle: 'bold', spacingAfter: 10 })

  entries.forEach((entry, index) => {
    writeTocEntry(writer, entry, targetPages[index] ?? entry.page)
  })
}

function writeSectionTitle(writer: PdfWriter, title: string, depth: number) {
  const text = formatSectionTitle(title, depth)
  const fontStyle = Math.min(depth, 2) >= 2 ? 'bolditalic' : 'bold'

  writeWrappedText(writer, text, {
    fontStyle,
    spacingBefore: depth === 0 ? 8 : 5,
    spacingAfter: 3,
    align: 'left',
  })
}

function writeMarkdownBlocks(writer: PdfWriter, blocks: MarkdownBlock[]) {
  for (const block of blocks) {
    if (block.type === 'heading') {
      const text = formatCitationText(block.text)
      const content = block.level === 1 ? text.toUpperCase() : titleCase(text)
      const fontStyle = block.level === 3 ? 'bolditalic' : 'bold'

      writeWrappedText(writer, content, {
        fontStyle,
        spacingBefore: block.level === 1 ? 6 : 4,
        spacingAfter: 2,
        align: 'left',
      })
      continue
    }

    if (block.type === 'quote') {
      writeWrappedText(writer, formatCitationText(block.text), {
        fontStyle: 'italic',
        indent: 8,
        spacingBefore: 2,
        spacingAfter: 2,
        align: 'justify',
      })
      continue
    }

    if (block.type === 'list') {
      for (const item of block.items) {
        writeWrappedText(writer, `• ${formatCitationText(item)}`, {
          indent: 4,
          spacingAfter: 1,
          align: 'justify',
        })
      }
      writer.y += 2
      continue
    }

    writeWrappedText(writer, formatCitationText(block.text), {
      spacingAfter: 2,
      align: 'justify',
    })
  }
}

function writePageNumbers(writer: PdfWriter) {
  const totalPages = writer.pdf.getNumberOfPages()
  const footerY = writer.pageHeight - FOOTER_Y_OFFSET

  for (let page = 1; page <= totalPages; page += 1) {
    writer.pdf.setPage(page)
    writer.pdf.setFont('times', 'normal')
    writer.pdf.setFontSize(FONT_SIZE)
    writer.pdf.setTextColor(0, 0, 0)
    writer.pdf.text(String(page), writer.pageWidth / 2, footerY, { align: 'center' })
  }
}

export async function exportDocumentAsPdf(payload: DocumentExportPayload) {
  const writer = createWriter()
  const tocEntries = buildTocEntries(payload.sections)

  writeCover(writer, payload)

  writer.pdf.addPage()
  const summaryPageNumber = writer.pdf.getNumberOfPages()

  writer.pdf.addPage()
  writer.y = MARGIN_TOP

  const tocWithPages: Array<TocEntry & { page: number }> = []
  const targetPages: number[] = []

  for (const [index, section] of payload.sections.entries()) {
    const pageNumber = writer.pdf.getNumberOfPages()
    tocWithPages.push({
      ...tocEntries[index]!,
      page: pageNumber,
    })
    targetPages.push(pageNumber)

    writeSectionTitle(writer, section.title, section.depth)
    writeMarkdownBlocks(writer, parseMarkdown(section.content))
  }

  writer.pdf.setPage(summaryPageNumber)
  writeSummaryPage(writer, tocWithPages, targetPages)

  writePageNumbers(writer)

  writer.pdf.save(getExportFileName(payload, 'pdf'))
}
