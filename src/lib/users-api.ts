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

function normalizeRole(role: string | null | undefined): UserRole {
  if (role === 'admin') return 'admin'
  if (role === 'desenvolvedor') return 'desenvolvedor'
  return 'consultor'
}

function normalizeUser(user: Partial<AuthUser> | null | undefined, fallbackId = ''): ManagedUser {
  return {
    id: user?.id ?? fallbackId,
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: normalizeRole(user?.role),
  }
}

export async function listManagedUsers() {
  const data = await apiRequest<Array<Partial<AuthUser>>>('/users')
  return (Array.isArray(data) ? data : [])
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
    id,
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
