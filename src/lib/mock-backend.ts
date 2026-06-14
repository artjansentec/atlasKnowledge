import { mockBackendFiles } from '../../mock/backend-files'
import { mockProjects } from '../../mock/projects'
import type { Project } from './projects'

export type BackendFileRecord = {
  id: string
  name: string
  type: string
  mimeType: string
  size: string
  uploadedAt: string
  url: string
}

export const backendFiles = mockBackendFiles satisfies Record<string, BackendFileRecord>

export const mockBackend = {
  listProjects() {
    return mockProjects
  },

  getProjectBySlug(slug: string | undefined) {
    return mockProjects.find((project) => project.slug === slug)
  },

  listProjectUpdates() {
    return mockProjects
      .flatMap((project) => project.history.map((history) => ({ ...history, project })))
      .sort((a, b) => b.at.localeCompare(a.at))
  },
} satisfies {
  listProjects: () => Project[]
  getProjectBySlug: (slug: string | undefined) => Project | undefined
  listProjectUpdates: () => Array<Project['history'][number] & { project: Project }>
}
