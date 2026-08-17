import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  filterByDateRange,
  isErrorStatus,
  rangeFromPreset,
} from './observability-aggregations'
import {
  getExecution,
  listExecutions,
  observabilityErrorMessage,
} from './observability-api'
import type {
  Execution,
  ExecutionDetail,
  ObservabilityDateRange,
  ObservabilityPeriodPreset,
} from '../types/observability'

type ObservabilityContextValue = {
  executions: Execution[]
  allExecutions: Execution[]
  count: number
  loading: boolean
  error: string | null
  preset: ObservabilityPeriodPreset
  range: ObservabilityDateRange
  setPreset: (preset: Exclude<ObservabilityPeriodPreset, 'custom'>) => void
  setCustomRange: (range: ObservabilityDateRange) => void
  refresh: () => Promise<void>
  getDetail: (id: string) => Promise<ExecutionDetail>
  loadErrorDetails: () => Promise<ExecutionDetail[]>
  errorDetails: ExecutionDetail[]
  errorDetailsLoading: boolean
}

const ObservabilityContext = createContext<ObservabilityContextValue | null>(null)

const LIST_LIMIT = 200
const ERROR_DETAIL_LIMIT = 40

export function ObservabilityProvider({ children }: { children: ReactNode }) {
  const [allExecutions, setAllExecutions] = useState<Execution[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPresetState] = useState<ObservabilityPeriodPreset>('7d')
  const [range, setRange] = useState<ObservabilityDateRange>(() => rangeFromPreset('7d'))
  const [errorDetails, setErrorDetails] = useState<ExecutionDetail[]>([])
  const [errorDetailsLoading, setErrorDetailsLoading] = useState(false)
  const detailCacheRef = useRef(new Map<string, ExecutionDetail>())

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listExecutions({ limit: LIST_LIMIT })
      setAllExecutions(data.items)
      setCount(data.count)
      detailCacheRef.current = new Map()
      setErrorDetails([])
    } catch (err) {
      setAllExecutions([])
      setCount(0)
      setError(observabilityErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const executions = useMemo(() => filterByDateRange(allExecutions, range), [allExecutions, range])

  useEffect(() => {
    setErrorDetails([])
  }, [range.from, range.to])

  const setPreset = useCallback((next: Exclude<ObservabilityPeriodPreset, 'custom'>) => {
    setPresetState(next)
    setRange(rangeFromPreset(next))
  }, [])

  const setCustomRange = useCallback((next: ObservabilityDateRange) => {
    setPresetState('custom')
    setRange(next)
  }, [])

  const getDetail = useCallback(async (id: string) => {
    const cached = detailCacheRef.current.get(id)
    if (cached) return cached
    const detail = await getExecution(id)
    detailCacheRef.current.set(id, detail)
    return detail
  }, [])

  const loadErrorDetails = useCallback(async () => {
    const failed = executions.filter((e) => isErrorStatus(e.status)).slice(0, ERROR_DETAIL_LIMIT)
    if (failed.length === 0) {
      setErrorDetails([])
      return []
    }

    setErrorDetailsLoading(true)
    try {
      const results = await Promise.allSettled(failed.map((e) => getDetail(e.id)))
      const details = results
        .filter((r): r is PromiseFulfilledResult<ExecutionDetail> => r.status === 'fulfilled')
        .map((r) => r.value)
      setErrorDetails(details)
      return details
    } finally {
      setErrorDetailsLoading(false)
    }
  }, [executions, getDetail])

  const value = useMemo(
    () => ({
      executions,
      allExecutions,
      count,
      loading,
      error,
      preset,
      range,
      setPreset,
      setCustomRange,
      refresh,
      getDetail,
      loadErrorDetails,
      errorDetails,
      errorDetailsLoading,
    }),
    [
      executions,
      allExecutions,
      count,
      loading,
      error,
      preset,
      range,
      setPreset,
      setCustomRange,
      refresh,
      getDetail,
      loadErrorDetails,
      errorDetails,
      errorDetailsLoading,
    ],
  )

  return <ObservabilityContext.Provider value={value}>{children}</ObservabilityContext.Provider>
}

export function useObservability() {
  const ctx = useContext(ObservabilityContext)
  if (!ctx) throw new Error('useObservability deve ser usado dentro de ObservabilityProvider')
  return ctx
}
