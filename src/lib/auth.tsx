import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiRequest, setAccessToken, setUnauthorizedHandler } from './api'
import type { Project } from './projects'

export type UserRole = 'admin' | 'consultor' | 'desenvolvedor'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
}

// Normaliza roles legados (ex.: 'user') para os perfis atuais.
function normalizeRole(role: string | null | undefined): UserRole {
  if (role === 'admin') return 'admin'
  if (role === 'desenvolvedor') return 'desenvolvedor'
  return 'consultor'
}

function normalizeUser(user: AuthUser): AuthUser {
  return { ...user, role: normalizeRole(user.role) }
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isCurrentUserAdmin: () => boolean
  isDeveloper: () => boolean
  canViewDev: () => boolean
  canManageProject: (project: Project) => boolean
  canManageDevProject: (project: Project) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setUser(null)
  }, [])

  const restoreSession = useCallback(async () => {
    try {
      const me = await apiRequest<AuthUser>('/auth/me')
      setUser(normalizeUser(me))
    } catch {
      clearSession()
    } finally {
      setLoading(false)
    }
  }, [clearSession])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    })
    void restoreSession()
  }, [clearSession, restoreSession])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      withBearerAuth: false,
      body: { email, password },
    })

    setAccessToken(data.accessToken)
    setUser(normalizeUser(data.user))
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch {
      // ignore logout errors
    } finally {
      clearSession()
    }
  }, [clearSession])

  const isCurrentUserAdmin = useCallback(() => user?.role === 'admin', [user])

  const isDeveloper = useCallback(() => user?.role === 'desenvolvedor', [user])

  const canViewDev = useCallback(() => isCurrentUserAdmin() || isDeveloper(), [isCurrentUserAdmin, isDeveloper])

  const canManageProject = useCallback(
    (project: Project) => isCurrentUserAdmin() || project.responsible === user?.name,
    [isCurrentUserAdmin, user],
  )

  const canManageDevProject = useCallback(
    (project: Project) => {
      if (isCurrentUserAdmin()) return true
      if (!user) return false
      const responsibles = project.devResponsibles ?? []
      const responsibleIds = project.devResponsibleIds ?? []
      return responsibles.includes(user.name) || responsibleIds.includes(user.id)
    },
    [isCurrentUserAdmin, user],
  )

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isCurrentUserAdmin,
      isDeveloper,
      canViewDev,
      canManageProject,
      canManageDevProject,
    }),
    [
      user,
      loading,
      login,
      logout,
      isCurrentUserAdmin,
      isDeveloper,
      canViewDev,
      canManageProject,
      canManageDevProject,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}

// Compatibilidade com imports legados
export function useCurrentUser() {
  const { user } = useAuth()
  return user
}

export function useIsCurrentUserAdmin() {
  const { isCurrentUserAdmin } = useAuth()
  return isCurrentUserAdmin()
}
