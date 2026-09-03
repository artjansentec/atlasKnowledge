import { useEffect, useId, useState, type FormEvent } from 'react'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { ApiError } from '../lib/api'
import {
  AI_PROVIDER_OPTIONS,
  CUSTOM_MODEL_VALUE,
  getAiSettings,
  getProviderMeta,
  isCustomModelSelected,
  resolveModelSelectValue,
  updateAiSettings,
  type AiSettings,
} from '../lib/ai-settings-api'
import { showToast } from './app-alerts'
import { AtlasSelect } from './atlas-select'
import './ai-settings-modal.css'

const emptySettings = (): AiSettings => ({
  provider: 'openai',
  model: getProviderMeta('openai').models[0],
  apiKey: '',
  baseUrl: '',
})

type AiSettingsModalProps = {
  onClose: () => void
}

export function AiSettingsModal({ onClose }: AiSettingsModalProps) {
  const titleId = useId()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<AiSettings>(emptySettings)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const current = await getAiSettings()
        if (!cancelled) setForm(current)
      } catch (err) {
        if (cancelled) return
        if (!(err instanceof ApiError && err.status === 404)) {
          setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as configurações.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, saving])

  function close() {
    if (saving) return
    onClose()
  }

  function changeProvider(provider: string) {
    const meta = getProviderMeta(provider)
    setForm((prev) => ({
      ...prev,
      provider,
      model: meta.models[0] ?? '',
      baseUrl: provider === 'ollama' && !prev.baseUrl ? 'http://localhost:11434' : prev.baseUrl,
    }))
  }

  function changeModelSelect(value: string) {
    if (value === CUSTOM_MODEL_VALUE) {
      setForm((prev) => {
        const presets = getProviderMeta(prev.provider).models
        return {
          ...prev,
          model: presets.includes(prev.model) ? '' : prev.model,
        }
      })
      return
    }
    setForm((prev) => ({ ...prev, model: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const meta = getProviderMeta(form.provider)
    const model = form.model.trim()
    const apiKey = form.apiKey.trim()
    const baseUrl = form.baseUrl.trim()

    if (!model) {
      setError('Informe o model.')
      return
    }
    if (meta.apiKeyRequired && !apiKey) {
      setError('Informe a API key para este provider.')
      return
    }
    if (meta.baseUrlRequired && !baseUrl) {
      setError('Informe a base URL do resource Azure.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await updateAiSettings({
        provider: form.provider,
        model,
        apiKey,
        baseUrl,
      })
      showToast('Configurações de IA salvas', 'success')
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar as configurações.')
    } finally {
      setSaving(false)
    }
  }

  const providerMeta = getProviderMeta(form.provider)

  return (
    <div className="ai-settings-modal" onClick={close}>
      <div
        className="ai-settings-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ai-settings-modal__header">
          <div>
            <h3 id={titleId}>Configurações de IA</h3>
            <p>Define provider, model e credenciais usados pelo Mnemos via Atlas.</p>
          </div>
          <button
            type="button"
            className="ai-settings-modal__close"
            onClick={close}
            aria-label="Fechar configurações"
            disabled={saving}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <p className="ai-settings-modal__loading">Carregando configurações...</p>
        ) : (
          <form className="ai-settings-modal__form" onSubmit={(event) => void handleSubmit(event)}>
            {error ? (
              <div className="ai-settings-modal__error" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : null}

            <label className="ai-settings-modal__field">
              <span>
                Provider <span className="ai-settings-modal__required">*</span>
              </span>
              <AtlasSelect value={form.provider} onChange={changeProvider} options={AI_PROVIDER_OPTIONS} />
            </label>

            <label className="ai-settings-modal__field">
              <span>
                Model <span className="ai-settings-modal__required">*</span>
              </span>
              <AtlasSelect
                value={resolveModelSelectValue(form.provider, form.model)}
                onChange={changeModelSelect}
                options={[
                  ...providerMeta.models.map((model) => ({
                    value: model,
                    label: model,
                  })),
                  { value: CUSTOM_MODEL_VALUE, label: 'Personalizado…' },
                ]}
              />
            </label>

            {isCustomModelSelected(form.provider, form.model) || form.provider === 'azure' ? (
              <label className="ai-settings-modal__field">
                <span>
                  {form.provider === 'azure' ? 'Nome do deployment' : 'Model personalizado'}
                  <span className="ai-settings-modal__required"> *</span>
                </span>
                <input
                  value={form.model}
                  onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
                  placeholder={
                    form.provider === 'azure' ? 'Ex.: gpt-5.6-luna (nome do deployment)' : 'Ex.: gpt-5.6-luna'
                  }
                  autoComplete="off"
                  required
                />
              </label>
            ) : null}

            <label className="ai-settings-modal__field">
              <span>
                API key
                {providerMeta.apiKeyRequired ? (
                  <span className="ai-settings-modal__required"> *</span>
                ) : (
                  ' (opcional)'
                )}
              </span>
              <input
                type="password"
                value={form.apiKey}
                onChange={(event) => setForm((prev) => ({ ...prev, apiKey: event.target.value }))}
                placeholder={form.provider === 'ollama' ? 'Pode ficar vazio' : 'sk-...'}
                autoComplete="off"
              />
            </label>

            <label className="ai-settings-modal__field">
              <span>
                Base URL
                {providerMeta.baseUrlRequired ? (
                  <span className="ai-settings-modal__required"> *</span>
                ) : (
                  ' (opcional)'
                )}
              </span>
              <input
                value={form.baseUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, baseUrl: event.target.value }))}
                placeholder={providerMeta.baseUrlPlaceholder}
                autoComplete="off"
              />
            </label>

            {providerMeta.hint ? <p className="ai-settings-modal__hint">{providerMeta.hint}</p> : null}

            <div className="ai-settings-modal__actions">
              <button type="button" className="ai-settings-modal__secondary" onClick={close} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="ai-settings-modal__primary" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={14} className="ai-settings-modal__spin" aria-hidden="true" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
