import { apiRequest, ApiError } from './api'
import type {
  ExecutionDetail,
  ExecutionListFilter,
  ExecutionListResponse,
} from '../types/observability'

function buildQuery(filter: ExecutionListFilter = {}): string {
  const params = new URLSearchParams()
  if (filter.limit != null && filter.limit > 0) params.set('limit', String(filter.limit))
  if (filter.operation?.trim()) params.set('operation', filter.operation.trim())
  if (filter.provider?.trim()) params.set('provider', filter.provider.trim())
  if (filter.project_id?.trim()) params.set('project_id', filter.project_id.trim())
  if (filter.status?.trim()) params.set('status', filter.status.trim())
  if (filter.model?.trim()) params.set('model', filter.model.trim())
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function listExecutions(filter: ExecutionListFilter = {}): Promise<ExecutionListResponse> {
  const data = await apiRequest<ExecutionListResponse>(`/observability/executions${buildQuery(filter)}`)
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    count: typeof data?.count === 'number' ? data.count : (data?.items?.length ?? 0),
  }
}

export async function getExecution(id: string): Promise<ExecutionDetail> {
  const detail = await apiRequest<ExecutionDetail>(`/observability/executions/${encodeURIComponent(id)}`)
  return {
    ...detail,
    stages: Array.isArray(detail.stages) ? detail.stages : [],
    documents: Array.isArray(detail.documents) ? detail.documents : [],
    costs: Array.isArray(detail.costs) ? detail.costs : [],
    errors: Array.isArray(detail.errors) ? detail.errors : [],
  }
}

export function observabilityErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Você não tem permissão para ver essas execuções.'
    if (error.status === 404) return 'Execução não encontrada.'
    if (error.status === 502) return 'O serviço de observabilidade está indisponível no momento.'
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Falha ao carregar observabilidade da IA.'
}
