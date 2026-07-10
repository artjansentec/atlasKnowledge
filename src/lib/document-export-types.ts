import type { Section } from './projects'

export type DocumentExportSection = {
  title: string
  depth: number
  content: string
}

export type DocumentExportPayload = {
  projectName: string
  viewLabel: string
  responsible: string
  devResponsibles: string[]
  client?: string
  createdAt: string
  sections: DocumentExportSection[]
}

export function buildExportSections(
  sections: Section[],
  savedDrafts: Record<string, string>,
  flatten: (sections: Section[]) => { section: Section; depth: number }[],
): DocumentExportSection[] {
  return flatten(sections).map(({ section, depth }) => ({
    title: section.title,
    depth,
    content: savedDrafts[section.id] ?? section.content,
  }))
}
