import { apiRequest } from './api'
import { normalizeAttachment, type Project, type ProjectLesson, type ProjectStatus, type Section } from './projects'

export type UserListItem = {
  id: string
  name: string
  email: string
}

export type ProjectListItem = {
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
}

export type DashboardPeriod = {
  from: string
  to: string
}

export type DashboardSummary = {
  projectCount: number
  activeProjectCount: number
  documentCount: number
  lessonCount: number
  updateCount: number
  recentUpdates: Array<{
    id: string
    at: string
    author: string
    action: string
    target: string
    projectSlug: string
    projectName: string
  }>
  recentProjects: ProjectListItem[]
}

export type SearchResultItem = {
  id: string
  type: 'project' | 'section' | 'lesson' | 'update'
  title: string
  snippet: string
  meta: string
  href: string
  projectSlug: string
  projectName: string
}

export type SearchResponse = {
  projects: SearchResultItem[]
  sections: SearchResultItem[]
  lessons: SearchResultItem[]
  updates: SearchResultItem[]
}

export type CreateProjectPayload = {
  name: string
  slug?: string
  description: string
  status?: ProjectStatus
  responsibleUserId: string
  client?: string
  tags: string[]
  tech: string[]
  sectionTitle?: string
  sectionContent?: string
}

export type UpdateProjectPayload = Partial<{
  name: string
  description: string
  status: ProjectStatus
  responsibleUserId: string
  client: string
  tags: string[]
  tech: string[]
}>

export type SectionReorderItem = {
  id: string
  parentId: string | null
  sortOrder: number
}

export async function listUsers() {
  return apiRequest<UserListItem[]>('/users')
}

function normalizeDashboardUpdate(
  update: Partial<DashboardSummary['recentUpdates'][number]> | null | undefined,
) {
  return {
    id: update?.id ?? '',
    at: update?.at ?? (update as { createdAt?: string } | undefined)?.createdAt ?? '',
    author: update?.author ?? '',
    action: update?.action ?? '',
    target: update?.target ?? '',
    projectSlug: update?.projectSlug ?? '',
    projectName: update?.projectName ?? '',
  }
}

export function normalizeDashboardSummary(
  raw: Partial<DashboardSummary> | null | undefined,
): DashboardSummary {
  const recentUpdates = (raw?.recentUpdates ?? []).map(normalizeDashboardUpdate)
  const recentProjects = raw?.recentProjects ?? []

  let updateCount = raw?.updateCount
  if (typeof updateCount !== 'number') {
    updateCount = recentUpdates.length
  } else if (updateCount === 0 && recentUpdates.length > 0) {
    updateCount = recentUpdates.length
  }

  return {
    projectCount: raw?.projectCount ?? 0,
    activeProjectCount: raw?.activeProjectCount ?? 0,
    documentCount: raw?.documentCount ?? 0,
    lessonCount: raw?.lessonCount ?? 0,
    updateCount,
    recentUpdates,
    recentProjects,
  }
}

export async function getDashboardSummary(period?: DashboardPeriod) {
  const params = new URLSearchParams()
  if (period) {
    params.set('from', period.from)
    params.set('to', period.to)
  }
  const query = params.toString()
  const raw = await apiRequest<Partial<DashboardSummary>>(`/dashboard/summary${query ? `?${query}` : ''}`)
  return normalizeDashboardSummary(raw)
}

export async function searchGlobal(query: string) {
  const params = new URLSearchParams({ q: query })
  return apiRequest<SearchResponse>(`/search?${params}`)
}

export function normalizeSearchResponse(response: Partial<SearchResponse> | null | undefined): SearchResponse {
  const withType = (items: SearchResultItem[] | null | undefined, type: SearchResultItem['type']) =>
    (items ?? []).map((item) => ({ ...item, type: item.type ?? type }))

  return {
    projects: withType(response?.projects, 'project'),
    sections: withType(response?.sections, 'section'),
    lessons: withType(response?.lessons, 'lesson'),
    updates: withType(response?.updates, 'update'),
  }
}

export function flattenSearchResults(response: SearchResponse): SearchResultItem[] {
  const normalized = normalizeSearchResponse(response)
  return [
    ...normalized.projects,
    ...normalized.sections,
    ...normalized.lessons,
    ...normalized.updates,
  ]
}

export function getSearchCounts(response: SearchResponse) {
  const normalized = normalizeSearchResponse(response)
  return {
    all:
      normalized.projects.length +
      normalized.sections.length +
      normalized.lessons.length +
      normalized.updates.length,
    project: normalized.projects.length,
    section: normalized.sections.length,
    lesson: normalized.lessons.length,
    update: normalized.updates.length,
  }
}

export const emptySearchResponse = (): SearchResponse => ({
  projects: [],
  sections: [],
  lessons: [],
  updates: [],
})

export async function listProjects(filters?: {
  status?: ProjectStatus
  q?: string
  responsible?: string
}) {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.q) params.set('q', filters.q)
  if (filters?.responsible) params.set('responsible', filters.responsible)

  const query = params.toString()
  return apiRequest<ProjectListItem[]>(query ? `/projects?${query}` : '/projects')
}

export async function getProjectBySlug(slug: string) {
  return apiRequest<Project>(`/projects/${slug}`)
}

export async function createProject(payload: CreateProjectPayload) {
  return apiRequest<Project>('/projects', {
    method: 'POST',
    body: payload,
  })
}

export async function updateProject(slug: string, payload: UpdateProjectPayload) {
  return apiRequest<Project>(`/projects/${slug}`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function deleteProject(slug: string) {
  return apiRequest<void>(`/projects/${slug}`, { method: 'DELETE' })
}

export async function updateProjectReaders(slug: string, userIds: string[]) {
  return apiRequest<void>(`/projects/${slug}/readers`, {
    method: 'PUT',
    body: { userIds },
  })
}

export async function createSection(
  slug: string,
  payload: { title: string; content?: string; parentId?: string },
) {
  return apiRequest<Section>(`/projects/${slug}/sections`, {
    method: 'POST',
    body: payload,
  })
}

export async function updateSection(
  slug: string,
  sectionId: string,
  payload: { title?: string; content?: string },
) {
  return apiRequest<Section>(`/projects/${slug}/sections/${sectionId}`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function deleteSection(slug: string, sectionId: string) {
  return apiRequest<void>(`/projects/${slug}/sections/${sectionId}`, { method: 'DELETE' })
}

export async function reorderSections(slug: string, items: SectionReorderItem[]) {
  return apiRequest<void>(`/projects/${slug}/sections/reorder`, {
    method: 'PUT',
    body: { items },
  })
}

export async function createLesson(
  slug: string,
  payload: Omit<ProjectLesson, 'id' | 'createdAt'>,
) {
  return apiRequest<ProjectLesson>(`/projects/${slug}/lessons`, {
    method: 'POST',
    body: payload,
  })
}

export async function updateLesson(
  slug: string,
  lessonId: string,
  payload: Omit<ProjectLesson, 'id' | 'createdAt'>,
) {
  return apiRequest<ProjectLesson>(`/projects/${slug}/lessons/${lessonId}`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function deleteLesson(slug: string, lessonId: string) {
  return apiRequest<void>(`/projects/${slug}/lessons/${lessonId}`, { method: 'DELETE' })
}

export async function uploadAttachment(slug: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const created = await apiRequest<{ id: string; name: string; fileId?: string }>(
    `/projects/${slug}/attachments`,
    {
      method: 'POST',
      body: formData,
    },
  )

  try {
    const project = await getProjectBySlug(slug)
    const attachment = project.attachments.find((item) => item.id === created.id)
    if (attachment) return attachment
  } catch {
    // fallback abaixo
  }

  return normalizeAttachment({ ...created, fileId: created.fileId }, file)
}

export async function deleteAttachment(slug: string, attachmentId: string) {
  return apiRequest<void>(`/projects/${slug}/attachments/${attachmentId}`, { method: 'DELETE' })
}

export function buildSectionReorderItems(sections: Section[], parentId: string | null = null): SectionReorderItem[] {
  const items: SectionReorderItem[] = []

  sections.forEach((section, index) => {
    items.push({ id: section.id, parentId, sortOrder: index })
    if (section.children?.length) {
      items.push(...buildSectionReorderItems(section.children, section.id))
    }
  })

  return items
}

export type LessonWithProject = ProjectLesson & {
  project: Pick<ProjectListItem, 'id' | 'slug' | 'name' | 'description' | 'responsible' | 'updatedAt'>
}

export async function listAllLessons(): Promise<LessonWithProject[]> {
  const projects = await listProjects()
  const details = await Promise.all(projects.map((project) => getProjectBySlug(project.slug)))

  return details.flatMap((project) =>
    project.lessons.map((lesson) => ({
      ...lesson,
      project: {
        id: project.id,
        slug: project.slug,
        name: project.name,
        description: project.description,
        responsible: project.responsible,
        updatedAt: project.updatedAt,
      },
    })),
  )
}

export type ProjectUpdate = DashboardSummary['recentUpdates'][number]

export async function listProjectUpdates(): Promise<ProjectUpdate[]> {
  const summary = await getDashboardSummary()
  return summary.recentUpdates
}
