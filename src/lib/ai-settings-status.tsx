import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  AI_SETTINGS_UPDATED_EVENT,
  fetchAiCredentialSnapshot,
  requestOpenAiSettings,
  type AiCredentialGap,
} from './ai-settings-api'

export { OPEN_AI_SETTINGS_EVENT } from './ai-settings-api'

type AiSettingsStatusContextValue = {
  loading: boolean
  configured: boolean | null
  blocked: boolean
  gap: AiCredentialGap
  provider: string
  refresh: () => Promise<void>
  openSettings: () => void
}

const AiSettingsStatusContext = createContext<AiSettingsStatusContextValue | null>(null)

export function AiSettingsStatusProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [gap, setGap] = useState<AiCredentialGap>(null)
  const [provider, setProvider] = useState('')

  const refresh = useCallback(async () => {
    const snapshot = await fetchAiCredentialSnapshot()
    setConfigured(snapshot.configured)
    setGap(snapshot.gap)
    setProvider(snapshot.provider)
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true

    void (async () => {
      const snapshot = await fetchAiCredentialSnapshot()
      if (!active) return
      setConfigured(snapshot.configured)
      setGap(snapshot.gap)
      setProvider(snapshot.provider)
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function onUpdated() {
      void refresh()
    }

    window.addEventListener(AI_SETTINGS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(AI_SETTINGS_UPDATED_EVENT, onUpdated)
  }, [refresh])

  const value = useMemo<AiSettingsStatusContextValue>(
    () => ({
      loading,
      configured,
      blocked: configured === false,
      gap,
      provider,
      refresh,
      openSettings: requestOpenAiSettings,
    }),
    [loading, configured, gap, provider, refresh],
  )

  return <AiSettingsStatusContext.Provider value={value}>{children}</AiSettingsStatusContext.Provider>
}

export function useAiSettingsStatus() {
  const context = useContext(AiSettingsStatusContext)
  if (!context) {
    throw new Error('useAiSettingsStatus deve ser usado dentro de AiSettingsStatusProvider')
  }
  return context
}
