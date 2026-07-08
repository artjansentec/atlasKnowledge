import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { listProjectStatuses } from './projects-api'
import {
  defaultProjectStatuses,
  getStatusMetaFrom,
  type ProjectStatus,
  type ProjectStatusMeta,
} from './projects'

type ProjectStatusContextValue = {
  statuses: ProjectStatusMeta[]
  loading: boolean
  getStatusMeta: (code: ProjectStatus) => ProjectStatusMeta
}

const ProjectStatusContext = createContext<ProjectStatusContextValue | null>(null)

function sortByOrder(statuses: ProjectStatusMeta[]) {
  return [...statuses].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function ProjectStatusProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<ProjectStatusMeta[]>(defaultProjectStatuses)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const data = await listProjectStatuses()
        if (active && Array.isArray(data) && data.length > 0) {
          setStatuses(sortByOrder(data))
        }
      } catch {
        // Mantem o fallback (defaultProjectStatuses) se a rota falhar.
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const value = useMemo<ProjectStatusContextValue>(
    () => ({
      statuses,
      loading,
      getStatusMeta: (code) => getStatusMetaFrom(statuses, code),
    }),
    [statuses, loading],
  )

  return <ProjectStatusContext.Provider value={value}>{children}</ProjectStatusContext.Provider>
}

export function useProjectStatuses() {
  const context = useContext(ProjectStatusContext)
  if (!context) throw new Error('useProjectStatuses deve ser usado dentro de ProjectStatusProvider')
  return context
}
