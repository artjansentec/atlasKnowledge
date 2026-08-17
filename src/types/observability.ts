export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout'

export type ObservabilityPeriodPreset = '24h' | '7d' | '30d' | 'custom'

/** @deprecated use ObservabilityPeriodPreset */
export type ObservabilityPeriod = ObservabilityPeriodPreset

export type ObservabilityDateRange = {
  from: string
  to: string
}

export type ExecutionStage = {
  stage_name: string
  started_at?: string
  finished_at?: string | null
  duration_ms: number
  status: string
  metadata?: Record<string, unknown>
}

export type ExecutionDocument = {
  document_id: string
  chunk_id: string
  chunk_index: number
  similarity_score: number
  rerank_score: number
  was_used_in_prompt: boolean
  position: number
}

export type ExecutionCost = {
  provider: string
  model: string
  currency: string
  prompt_tokens: number
  completion_tokens: number
  prompt_cost: number
  completion_cost: number
  total_cost: number
}

export type ExecutionError = {
  stage: string
  type: string
  message: string
  occurred_at: string
}

/** Resumo retornado por GET /observability/executions */
export type Execution = {
  id: string
  project_id: string
  conversation_id?: string
  request_id?: string
  provider: string
  model: string
  operation: string
  status: ExecutionStatus | string
  started_at: string
  finished_at?: string | null
  duration_ms: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  prompt_cost: number
  completion_cost: number
  total_cost: number
  currency?: string
  documents_found?: number
  documents_used?: number
  chunks_found?: number
  chunks_used?: number
  chunk_expansion_size?: number
  context_window_size?: number
  embedding_model?: string
  embedding_duration_ms?: number
  vector_search_duration_ms?: number
  hybrid_search_duration_ms?: number
  rerank_duration_ms?: number
  context_expansion_duration_ms?: number
  prompt_build_duration_ms?: number
  llm_duration_ms?: number
  grounding_duration_ms?: number
  post_process_duration_ms?: number
  total_pipeline_duration_ms?: number
  grounded: boolean
  grounding_score: number
  confidence_score?: number
  retrieval_score?: number
  rerank_score?: number
  cache_hit: boolean
  cache_key?: string
  response_length?: number
  finish_reason?: string
}

/** Detalhe retornado por GET /observability/executions/:id */
export type ExecutionDetail = Execution & {
  stages: ExecutionStage[]
  documents: ExecutionDocument[]
  costs: ExecutionCost[]
  errors: ExecutionError[]
}

export type ExecutionListResponse = {
  items: Execution[]
  count: number
}

export type ExecutionListFilter = {
  limit?: number
  operation?: string
  provider?: string
  project_id?: string
  status?: string
  model?: string
}

/** Timing fields available on list summaries (used when stages[] is absent). */
export const STAGE_DURATION_FIELDS = [
  { key: 'embedding_duration_ms', name: 'embedding' },
  { key: 'vector_search_duration_ms', name: 'vector_search' },
  { key: 'hybrid_search_duration_ms', name: 'hybrid_search' },
  { key: 'rerank_duration_ms', name: 'rerank' },
  { key: 'context_expansion_duration_ms', name: 'context_expansion' },
  { key: 'prompt_build_duration_ms', name: 'prompt_build' },
  { key: 'llm_duration_ms', name: 'llm_generate' },
  { key: 'grounding_duration_ms', name: 'grounding' },
  { key: 'post_process_duration_ms', name: 'post_process' },
] as const satisfies ReadonlyArray<{ key: keyof Execution; name: string }>
