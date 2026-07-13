import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

const API_VERSION_SUFFIX = '/api/v1'

function normalizeApiBase(raw?: string): string {
  const value = (raw?.trim() || 'http://localhost:8080').replace(/\/+$/, '')
  if (/\/api\/v\d+$/.test(value)) return value
  return `${value}${API_VERSION_SUFFIX}`
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL)
const API_ORIGIN = new URL(API_BASE).origin

declare module 'axios' {
  export interface AxiosRequestConfig {
    withBearerAuth?: boolean
    skipRefresh?: boolean
    _retry?: boolean
  }
}

export class ApiError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type ApiErrorBody = {
  success?: boolean
  error?: { code?: string; message?: string }
}

let accessToken: string | null = sessionStorage.getItem('atlas:accessToken')
let refreshPromise: Promise<string | null> | null = null
let onUnauthorized: (() => void) | null = null

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
})

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
  if (token) sessionStorage.setItem('atlas:accessToken', token)
  else sessionStorage.removeItem('atlas:accessToken')
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

export function resolveApiUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/api/')) return `${API_ORIGIN}${path}`
  const normalized = path.startsWith('/') ? path.slice(1) : path
  return `${API_BASE.replace(/\/$/, '')}/${normalized}`
}

function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0
    const body = error.response?.data as ApiErrorBody | undefined
    const code = body?.error?.code ?? 'UNKNOWN'
    const message = body?.error?.message ?? error.message ?? 'Erro na requisição'
    return new ApiError(status, code, message)
  }

  return new ApiError(0, 'UNKNOWN', 'Erro na requisição')
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const { data } = await apiClient.post<{ accessToken: string }>('/auth/refresh', null, {
          withBearerAuth: false,
          skipRefresh: true,
        })
        setAccessToken(data.accessToken)
        return data.accessToken
      } catch {
        return null
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}

apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  const useBearerAuth = config.withBearerAuth !== false

  if (useBearerAuth && accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config

    if (
      error.response?.status === 401 &&
      originalRequest &&
      originalRequest.withBearerAuth !== false &&
      !originalRequest.skipRefresh &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true
      const newToken = await refreshAccessToken()

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      }

      setAccessToken(null)
      onUnauthorized?.()
    }

    return Promise.reject(toApiError(error))
  },
)

export type ApiRequestOptions = Omit<AxiosRequestConfig, 'url' | 'baseURL'> & {
  withBearerAuth?: boolean
  skipRefresh?: boolean
  body?: unknown
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { withBearerAuth = true, skipRefresh = false, method = 'GET', body, data, ...rest } = options
  const payload = data ?? body

  const response = await apiClient.request<T>({
    url: path,
    method,
    data: payload,
    withBearerAuth,
    skipRefresh,
    ...rest,
  })

  if (response.status === 204) return undefined as T
  return response.data
}

export async function fetchAuthenticatedBlob(fileUrl: string): Promise<Blob> {
  try {
    const response = await apiClient.get<Blob>(resolveApiUrl(fileUrl), {
      responseType: 'blob',
      headers: {
        Accept: '*/*',
      },
    })
    return response.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw toApiError(error)
  }
}
