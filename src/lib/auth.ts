import type { Project } from './projects'

export type UserRole = 'admin' | 'user'

export const currentUser: {
  name: string
  role: UserRole
} = {
  name: 'Marina Alves',
  role: 'user',
}

export function isCurrentUserAdmin() {
  return currentUser.role === 'admin'
}

export function canManageProject(project: Project) {
  return isCurrentUserAdmin() || project.responsible === currentUser.name
}
