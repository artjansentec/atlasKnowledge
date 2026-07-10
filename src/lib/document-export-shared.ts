import type { DocumentExportPayload, DocumentExportSection } from './document-export-types'

export const ABNT_FONT = 'Times New Roman'
export const ABNT_FONT_SIZE = 24
export const ABNT_TITLE_FONT_SIZE = 28
export const ABNT_LINE_SPACING = 360
export const ABNT_BLACK = '000000'

export type TocEntry = {
  id: string
  title: string
  depth: number
  page?: number
}

export function sanitizeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function formatSectionTitle(title: string, depth: number) {
  const normalizedDepth = Math.min(depth, 2)
  if (normalizedDepth === 0) return title.toUpperCase()
  return titleCase(title)
}

export function sectionBookmarkId(index: number) {
  return `secao-${index + 1}`
}

export function buildTocEntries(sections: DocumentExportSection[]): TocEntry[] {
  return sections.map((section, index) => ({
    id: sectionBookmarkId(index),
    title: section.title,
    depth: section.depth,
  }))
}

export function getExportFileName(payload: DocumentExportPayload, extension: 'pdf' | 'docx') {
  return `${sanitizeFileName(payload.projectName)}-${sanitizeFileName(payload.viewLabel)}.${extension}`
}
