import { AlertTriangle, KeyRound, Settings } from 'lucide-react'
import { useAuth } from '../lib/auth'
import type { AiCredentialGap } from '../lib/ai-settings-api'
import { useAiSettingsStatus } from '../lib/ai-settings-status'
import './ai-credential-banner.css'

const GAP_COPY: Record<Exclude<AiCredentialGap, null>, string> = {
  apiKey:
    'A chave de acesso (API key) da IA não foi configurada. Este módulo não vai funcionar até que um administrador informe a credencial.',
  baseUrl:
    'A URL base do provedor de IA não foi configurada. Este módulo não vai funcionar até que um administrador complete as Configurações de IA.',
  model:
    'O modelo de IA não foi configurado. Este módulo não vai funcionar até que um administrador complete as Configurações de IA.',
  settings:
    'Uma credencial (chave de acesso ou API key) da IA não foi configurada. Este módulo não vai funcionar até que um administrador informe a chave nas Configurações de IA.',
}

type AiCredentialBannerProps = {
  compact?: boolean
}

export function AiCredentialBanner({ compact = false }: AiCredentialBannerProps) {
  const { blocked, gap, openSettings } = useAiSettingsStatus()
  const { isCurrentUserAdmin } = useAuth()

  if (!blocked) return null

  const message = GAP_COPY[gap ?? 'settings']
  const canConfigure = isCurrentUserAdmin()

  return (
    <div
      className={`ai-credential-banner${compact ? ' ai-credential-banner--compact' : ''}`}
      role="alert"
    >
      <div className="ai-credential-banner__icon" aria-hidden="true">
        {compact ? <AlertTriangle size={16} /> : <KeyRound size={18} />}
      </div>
      <div className="ai-credential-banner__body">
        <strong>Credencial de IA não configurada</strong>
        <p>{message}</p>
      </div>
      {canConfigure ? (
        <button type="button" className="ai-credential-banner__action" onClick={openSettings}>
          <Settings size={14} aria-hidden="true" />
          Configurar agora
        </button>
      ) : null}
    </div>
  )
}
