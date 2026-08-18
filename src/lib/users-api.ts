import { apiRequest } from './api'
import type { AuthUser, UserRole } from './auth'

export type ManagedUser = {
  id: string
  name: string
  email: string
  role: UserRole
}

export type CreateUserInput = {
  name: string
  email: string
  password: string
  role: UserRole
}

export type UpdateUserInput = {
  name: string
  email: string
  role: UserRole
  password?: string
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

function parseUserRole(role: string | null | undefined): UserRole | null {
  const value = role?.trim().toLowerCase()
  if (value === 'admin') return 'admin'
  if (value === 'desenvolvedor') return 'desenvolvedor'
  if (value === 'consultor' || value === 'user') return 'consultor'
  return null
}

function normalizeUser(
  user: Partial<AuthUser> | null | undefined,
  fallback: Partial<ManagedUser> = {},
): ManagedUser {
  return {
    id: user?.id ?? fallback.id ?? '',
    name: user?.name ?? fallback.name ?? '',
    email: user?.email ?? fallback.email ?? '',
    role: parseUserRole(user?.role) ?? fallback.role ?? 'consultor',
  }
}

function asUserArray(data: unknown): Array<Partial<AuthUser>> {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    for (const key of ['data', 'users', 'items']) {
      if (Array.isArray(record[key])) return record[key] as Array<Partial<AuthUser>>
    }
  }
  return []
}

export async function listManagedUsers() {
  const data = await apiRequest<unknown>('/users')
  return asUserArray(data)
    .map((user) => normalizeUser(user))
    .filter((user) => user.id)
}

export async function createUser(input: CreateUserInput) {
  const data = await apiRequest<Partial<AuthUser>>('/users', {
    method: 'POST',
    body: {
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
    },
  })

  return normalizeUser(data)
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const data = await apiRequest<Partial<AuthUser> | undefined>(`/users/${id}`, {
    method: 'PATCH',
    body: {
      name: input.name,
      email: input.email,
      role: input.role,
      ...(input.password ? { password: input.password } : {}),
    },
  })

  return normalizeUser(
    {
      id,
      name: data?.name ?? input.name,
      email: data?.email ?? input.email,
      role: data?.role ?? input.role,
    },
    { id, name: input.name, email: input.email, role: input.role },
  )
}

export async function deleteUser(id: string) {
  await apiRequest(`/users/${id}`, { method: 'DELETE' })
}

export async function changePassword(input: ChangePasswordInput) {
  await apiRequest('/auth/password', {
    method: 'PATCH',
    body: {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    },
  })
}
