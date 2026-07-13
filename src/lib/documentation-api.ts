import { apiRequest, ApiError } from './api'

export type DocumentationJobStatus = 'processing' | 'completed' | 'failed'

export type DocumentationJobResponse = {
  job_id?: string
  status: DocumentationJobStatus | string
  progress?: number
  current_step?: string
  error?: string
  message?: string
}

export type ActiveDocumentationJob = {
  job_id: string
  status: string
  progress: number
  current_step: string
  project_id: string
  project_slug: string
  project_name: string
  file_count: number
  created_by: string
  user_name: string
  started_at?: string
  created_at: string
}

export type DocumentationSection = {
  id: string
  title: string
  content: string
}

export type ProjectDocumentation = {
  sections: DocumentationSection[]
  raw?: unknown
}

export type GenerateDocumentationInput = {
  projectName: string
  description?: string
  files: File[]
  language?: string
  docTypes?: string[]
}

const POLL_INTERVAL_MS = 1800
const POLL_TIMEOUT_MS = 30 * 60 * 1000

export async function generateDocumentation(slug: string, input: GenerateDocumentationInput) {
  const formData = new FormData()
  formData.append('project_name', input.projectName)
  if (input.description) formData.append('description', input.description)
  if (input.language) formData.append('language', input.language)
  if (input.docTypes?.length) {
    for (const type of input.docTypes) {
      formData.append('doc_types', type)
    }
  }
  for (const file of input.files) {
    formData.append('files[]', file)
  }

  return apiRequest<DocumentationJobResponse>(`/projects/${slug}/documentation/generate`, {
    method: 'POST',
    body: formData,
  })
}

export async function listActiveDocumentationJobs(projectSlug?: string) {
  const query = projectSlug ? `?project=${encodeURIComponent(projectSlug)}` : ''
  return apiRequest<ActiveDocumentationJob[]>(`/documentation/jobs${query}`)
}

export async function getDocumentationJob(jobId: string) {
  return apiRequest<DocumentationJobResponse>(`/documentation/jobs/${jobId}`)
}

export async function cancelDocumentationJob(jobId: string) {
  return apiRequest<DocumentationJobResponse>(`/documentation/jobs/${jobId}/cancel`, {
    method: 'POST',
  })
}

export async function getProjectDocumentation(slug: string) {
  const raw = await apiRequest<unknown>(`/projects/${slug}/documentation`)
  return normalizeProjectDocumentation(raw)
}

export function normalizeProjectDocumentation(raw: unknown): ProjectDocumentation {
  if (!raw || typeof raw !== 'object') {
    return { sections: [], raw }
  }

  const data = raw as Record<string, unknown>

  if (Array.isArray(data.sections)) {
    return { sections: normalizeSectionList(data.sections), raw }
  }

  if (Array.isArray(data.documents)) {
    return { sections: normalizeSectionList(data.documents), raw }
  }

  if (Array.isArray(data.items)) {
    return { sections: normalizeSectionList(data.items), raw }
  }

  if (typeof data.content === 'string' && data.content.trim()) {
    return {
      sections: [
        {
          id: 's-overview',
          title: typeof data.title === 'string' ? data.title : 'Documentação',
          content: data.content,
        },
      ],
      raw,
    }
  }

  if (typeof data.markdown === 'string' && data.markdown.trim()) {
    return {
      sections: [
        {
          id: 's-overview',
          title: typeof data.title === 'string' ? data.title : 'Documentação',
          content: data.markdown,
        },
      ],
      raw,
    }
  }

  if (Array.isArray(raw)) {
    return { sections: normalizeSectionList(raw), raw }
  }

  return { sections: [], raw }
}

function normalizeSectionList(items: unknown[]): DocumentationSection[] {
  return items
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const section = item as Record<string, unknown>
      const title =
        (typeof section.title === 'string' && section.title) ||
        (typeof section.name === 'string' && section.name) ||
        `Seção ${index + 1}`
      const content =
        (typeof section.content === 'string' && section.content) ||
        (typeof section.markdown === 'string' && section.markdown) ||
        (typeof section.body === 'string' && section.body) ||
        ''
      const id =
        (typeof section.id === 'string' && section.id) ||
        `s-${index + 1}-${slugify(title).slice(0, 24) || 'section'}`

      return { id, title, content }
    })
    .filter((section): section is DocumentationSection => Boolean(section))
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function pollDocumentationJob(
  jobId: string,
  options?: {
    intervalMs?: number
    timeoutMs?: number
    signal?: AbortSignal
    onTick?: (status: DocumentationJobResponse, elapsedMs: number) => void
  },
): Promise<DocumentationJobResponse> {
  const intervalMs = options?.intervalMs ?? POLL_INTERVAL_MS
  const timeoutMs = options?.timeoutMs ?? POLL_TIMEOUT_MS
  const startedAt = Date.now()

  while (true) {
    if (options?.signal?.aborted) {
      throw new ApiError(0, 'ABORTED', 'Polling cancelado')
    }

    const status = await getDocumentationJob(jobId)
    const elapsedMs = Date.now() - startedAt
    options?.onTick?.(status, elapsedMs)

    const normalized = String(status.status).toLowerCase()
    if (normalized === 'completed' || normalized === 'done' || normalized === 'success') {
      return { ...status, status: 'completed' }
    }
    if (normalized === 'failed' || normalized === 'error') {
      throw new ApiError(
        0,
        'JOB_FAILED',
        status.error || status.message || 'Falha ao gerar documentação',
      )
    }

    if (elapsedMs >= timeoutMs) {
      throw new ApiError(0, 'JOB_TIMEOUT', 'Tempo limite excedido ao gerar documentação')
    }

    await sleep(intervalMs, options?.signal)
  }
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiError(0, 'ABORTED', 'Polling cancelado'))
      return
    }

    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      window.clearTimeout(timer)
      reject(new ApiError(0, 'ABORTED', 'Polling cancelado'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
