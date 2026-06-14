import { mockBackend } from './mock-backend'

export type ProjectStatus = 'active' | 'paused' | 'done'
export type ProjectLessonType = 'problem' | 'attention' | 'future' | 'success'

export const lessonTypeOptions: { value: ProjectLessonType; label: string; description: string }[] = [
  {
    value: 'problem',
    label: 'Problema encontrado',
    description: 'Algo que causou atrito e pode ser evitado no futuro.',
  },
  {
    value: 'attention',
    label: 'Ponto de atenção',
    description: 'Risco ou dependência que precisa ser acompanhado antes de virar problema.',
  },
  {
    value: 'future',
    label: 'Ideia futura',
    description: 'Oportunidade ou caminho para evoluir o produto depois.',
  },
  {
    value: 'success',
    label: 'Decisão positiva',
    description: 'Escolha que ajudou o projeto a ter sucesso.',
  },
]

export const lessonTypeLabels = Object.fromEntries(
  lessonTypeOptions.map((option) => [option.value, option.label]),
) as Record<ProjectLessonType, string>

export type Section = {
  id: string
  title: string
  content: string
  children?: Section[]
}

export type ProjectAttachment = {
  id: string
  backendFileId?: string
  name: string
  type: string
  mimeType?: string
  size: string
  uploadedAt: string
  url?: string
}

export type ProjectLesson = {
  id: string
  type: ProjectLessonType
  title: string
  description: string
  recommendation: string
  createdAt: string
  tags?: string[]
}

export type ProjectHistory = {
  id: string
  at: string
  author: string
  action: string
  target: string
}

export type Project = {
  id: string
  slug: string
  name: string
  description: string
  status: ProjectStatus
  responsible: string
  readers?: string[]
  client?: string
  createdAt: string
  updatedAt: string
  tags: string[]
  tech?: string[]
  attachments: ProjectAttachment[]
  lessons: ProjectLesson[]
  sections: Section[]
  history: ProjectHistory[]
}

export const projects = mockBackend.listProjects()

export const statusLabels: Record<ProjectStatus, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  done: 'Concluído',
}

export function getProject(slug: string | undefined) {
  return mockBackend.getProjectBySlug(slug)
}

export function flattenSections(sections: Section[], depth = 0): { section: Section; depth: number }[] {
  return sections.flatMap((section) => [
    { section, depth },
    ...(section.children ? flattenSections(section.children, depth + 1) : []),
  ])
}

export function getSectionTitles(sections: Section[]) {
  return flattenSections(sections).map(({ section }) => section.title)
}

export function getProjectUpdates() {
  return mockBackend.listProjectUpdates()
}
