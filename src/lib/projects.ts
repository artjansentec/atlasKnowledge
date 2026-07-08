export type ProjectStatus = 'active' | 'paused' | 'done' | 'cancelled'
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

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getAttachmentFileType(attachment: {
  name: string
  type?: string
  mimeType?: string
}) {
  if (attachment.type) return attachment.type

  const extension = attachment.name.split('.').pop()?.toLowerCase()
  if (extension) return extension

  if (attachment.mimeType?.includes('/')) {
    return attachment.mimeType.split('/')[1]?.split('+')[0] ?? 'file'
  }

  return 'file'
}

export function normalizeAttachment(
  partial: Partial<ProjectAttachment> & { id: string; name: string; fileId?: string },
  file?: File,
): ProjectAttachment {
  return {
    id: partial.id,
    backendFileId: partial.backendFileId ?? partial.fileId,
    name: partial.name,
    type: getAttachmentFileType(partial),
    mimeType: partial.mimeType ?? file?.type,
    size: partial.size ?? (file ? formatFileSize(file.size) : '—'),
    uploadedAt: partial.uploadedAt ?? new Date().toISOString().slice(0, 10),
    url: partial.url,
  }
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
  devResponsibles: string[]
  devResponsibleIds?: string[]
  attachments: ProjectAttachment[]
  devAttachments: ProjectAttachment[]
  lessons: ProjectLesson[]
  sections: Section[]
  devSections: Section[]
  history: ProjectHistory[]
}

export const statusLabels: Record<ProjectStatus, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  done: 'Concluído',
  cancelled: 'Cancelado',
}

export type ProjectStatusMeta = {
  code: ProjectStatus
  label: string
  color: string
  background: string
  sortOrder: number
}

// Fallback usado enquanto a rota GET /project-statuses nao respondeu ou falhou.
export const defaultProjectStatuses: ProjectStatusMeta[] = [
  { code: 'active', label: 'Ativo', color: '#1d7c2a', background: '#dcfce7', sortOrder: 1 },
  { code: 'paused', label: 'Pausado', color: '#b45309', background: '#fef3c7', sortOrder: 2 },
  { code: 'done', label: 'Concluído', color: '#14532d', background: '#86efac', sortOrder: 3 },
  { code: 'cancelled', label: 'Cancelado', color: '#4b5563', background: '#e5e7eb', sortOrder: 4 },
]

export function getStatusMetaFrom(
  statuses: ProjectStatusMeta[],
  code: ProjectStatus,
): ProjectStatusMeta {
  return (
    statuses.find((status) => status.code === code) ??
    defaultProjectStatuses.find((status) => status.code === code) ?? {
      code,
      label: statusLabels[code] ?? code,
      color: '#4b5563',
      background: '#e5e7eb',
      sortOrder: 99,
    }
  )
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
