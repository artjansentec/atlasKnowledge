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

export type UserRole = 'admin' | 'user'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isCurrentUserAdmin: () => boolean
  canManageProject: (project: Project) => boolean
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
      setUser(me)
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
    setUser(data.user)
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

  const canManageProject = useCallback(
    (project: Project) => isCurrentUserAdmin() || project.responsible === user?.name,
    [isCurrentUserAdmin, user],
  )

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isCurrentUserAdmin,
      canManageProject,
    }),
    [user, loading, login, logout, isCurrentUserAdmin, canManageProject],
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
