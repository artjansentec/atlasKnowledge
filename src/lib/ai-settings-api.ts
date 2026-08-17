import { apiRequest } from './api'

export const AI_PROVIDERS = ['openai', 'anthropic', 'gemini', 'ollama', 'azure'] as const

export type AiProvider = (typeof AI_PROVIDERS)[number]

export type AiSettings = {
  provider: AiProvider | string
  model: string
  apiKey: string
  baseUrl: string
}

export type AiSettingsUpdateInput = {
  provider: string
  model: string
  apiKey: string
  baseUrl: string
}

export type AiProviderMeta = {
  value: AiProvider
  label: string
  models: string[]
  baseUrlPlaceholder: string
  apiKeyRequired: boolean
  baseUrlRequired: boolean
  hint?: string
}

export const AI_PROVIDER_META: Record<AiProvider, AiProviderMeta> = {
  openai: {
    value: 'openai',
    label: 'OpenAI (ou API compatível)',
    models: ['gpt-5.6-luna', 'gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    baseUrlPlaceholder: 'https://api.openai.com/v1 (opcional)',
    apiKeyRequired: true,
    baseUrlRequired: false,
  },
  anthropic: {
    value: 'anthropic',
    label: 'Claude (Anthropic)',
    models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
    baseUrlPlaceholder: 'https://api.anthropic.com (opcional)',
    apiKeyRequired: true,
    baseUrlRequired: false,
    hint: 'RAG com Anthropic só funciona se o embedder for outro provider; Anthropic não vetoriza.',
  },
  gemini: {
    value: 'gemini',
    label: 'Google Gemini',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
    baseUrlPlaceholder: 'https://generativelanguage.googleapis.com/v1beta (opcional)',
    apiKeyRequired: true,
    baseUrlRequired: false,
  },
  ollama: {
    value: 'ollama',
    label: 'Ollama local',
    models: ['llama3.2', 'mistral'],
    baseUrlPlaceholder: 'http://localhost:11434',
    apiKeyRequired: false,
    baseUrlRequired: false,
  },
  azure: {
    value: 'azure',
    label: 'Azure OpenAI',
    models: ['gpt-5.6-luna', 'gpt-4o-mini', 'gpt-4o'],
    baseUrlPlaceholder: 'https://SEU_RESOURCE.openai.azure.com',
    apiKeyRequired: true,
    baseUrlRequired: true,
    hint: 'Em Azure, o model deve ser o nome do deployment (não o id genérico da OpenAI).',
  },
}

export const AI_PROVIDER_OPTIONS = AI_PROVIDERS.map((value) => ({
  value,
  label: AI_PROVIDER_META[value].label,
}))

const CUSTOM_MODEL_VALUE = '__custom__'

export function isAiProvider(value: string): value is AiProvider {
  return (AI_PROVIDERS as readonly string[]).includes(value)
}

export function getProviderMeta(provider: string): AiProviderMeta {
  return isAiProvider(provider) ? AI_PROVIDER_META[provider] : AI_PROVIDER_META.openai
}

export function resolveModelSelectValue(provider: string, model: string) {
  const models = getProviderMeta(provider).models
  if (model && models.includes(model)) return model
  if (model) return CUSTOM_MODEL_VALUE
  return models[0] ?? CUSTOM_MODEL_VALUE
}

export function isCustomModelSelected(provider: string, model: string) {
  return resolveModelSelectValue(provider, model) === CUSTOM_MODEL_VALUE
}

export { CUSTOM_MODEL_VALUE }

type AiSettingsRaw = {
  provider?: string
  model?: string
  apiKey?: string
  api_key?: string
  baseUrl?: string
  base_url?: string
}

function normalizeAiSettings(raw: AiSettingsRaw | null | undefined): AiSettings {
  const provider = raw?.provider?.trim() || 'openai'
  return {
    provider,
    model: raw?.model?.trim() || getProviderMeta(provider).models[0] || '',
    apiKey: (raw?.apiKey ?? raw?.api_key ?? '').trim(),
    baseUrl: (raw?.baseUrl ?? raw?.base_url ?? '').trim(),
  }
}

export async function getAiSettings() {
  const data = await apiRequest<AiSettingsRaw>('/ai-settings')
  return normalizeAiSettings(data)
}

export async function updateAiSettings(input: AiSettingsUpdateInput) {
  const data = await apiRequest<AiSettingsRaw>('/ai-settings', {
    method: 'PUT',
    body: {
      provider: input.provider,
      model: input.model,
      apiKey: input.apiKey,
      baseUrl: input.baseUrl,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  })
  return normalizeAiSettings(data ?? input)
}
