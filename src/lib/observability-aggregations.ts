import {
  STAGE_DURATION_FIELDS,
  type Execution,
  type ExecutionDetail,
  type ExecutionError,
  type ObservabilityDateRange,
  type ObservabilityPeriodPreset,
} from '../types/observability'
import { datePart, toISODate } from './date'

export function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx] ?? 0
}

export function isErrorStatus(status: string) {
  return status === 'failed' || status === 'timeout'
}

export function isSuccessStatus(status: string) {
  return status === 'completed'
}

export function kpis(executions: Execution[]) {
  const total = executions.length
  const success = executions.filter((e) => isSuccessStatus(e.status)).length
  const errors = executions.filter((e) => isErrorStatus(e.status)).length
  const grounded = executions.filter((e) => e.grounded).length
  const durations = executions.map((e) => e.duration_ms)

  return {
    total,
    successRate: total ? (success / total) * 100 : 0,
    errorRate: total ? (errors / total) * 100 : 0,
    groundingRate: total ? (grounded / total) * 100 : 0,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
  }
}

export function errorBreakdown(details: ExecutionDetail[]) {
  const feed: { execution: ExecutionDetail; error: ExecutionError }[] = []

  for (const execution of details) {
    if (execution.errors?.length) {
      for (const error of execution.errors) {
        feed.push({ execution, error })
      }
    } else if (isErrorStatus(execution.status)) {
      feed.push({
        execution,
        error: {
          type: execution.status,
          stage: 'pipeline',
          message: `Execução finalizou com status ${execution.status}.`,
          occurred_at: execution.finished_at || execution.started_at,
        },
      })
    }
  }

  feed.sort((a, b) => b.error.occurred_at.localeCompare(a.error.occurred_at))

  const countMap = (key: 'type' | 'stage') => {
    const map = new Map<string, number>()
    for (const { error } of feed) {
      const name = error[key] || '—'
      map.set(name, (map.get(name) ?? 0) + 1)
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }

  return {
    byType: countMap('type'),
    byStage: countMap('stage'),
    feed,
  }
}

function stageDurationsFromSummary(execution: Execution): { name: string; duration_ms: number }[] {
  return STAGE_DURATION_FIELDS.map(({ key, name }) => {
    const value = Number(execution[key] ?? 0)
    return { name, duration_ms: value }
  }).filter((s) => s.duration_ms > 0)
}

export function stageStats(executions: Execution[], detailsById?: Map<string, ExecutionDetail>) {
  const byStage = new Map<string, number[]>()

  for (const execution of executions) {
    const detail = detailsById?.get(execution.id)
    const stages =
      detail?.stages?.length
        ? detail.stages.map((s) => ({ name: s.stage_name, duration_ms: s.duration_ms }))
        : stageDurationsFromSummary(execution)

    for (const stage of stages) {
      if (!stage.duration_ms) continue
      const list = byStage.get(stage.name) ?? []
      list.push(stage.duration_ms)
      byStage.set(stage.name, list)
    }
  }

  return [...byStage.entries()]
    .map(([name, values]) => ({
      name,
      p50: percentile(values, 50),
      p95: percentile(values, 95),
      count: values.length,
    }))
    .sort((a, b) => b.p95 - a.p95)
}

export function rangeFromPreset(preset: ObservabilityPeriodPreset, reference = new Date()): ObservabilityDateRange {
  if (preset === '24h') {
    const to = reference
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000)
    return { from: toISODate(from), to: toISODate(to) }
  }
  if (preset === '7d') {
    const to = reference
    const from = new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000)
    return { from: toISODate(from), to: toISODate(to) }
  }
  // 30d and fallback
  const to = reference
  const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000)
  return { from: toISODate(from), to: toISODate(to) }
}

function startOfDay(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).getTime()
}

function endOfDay(isoDate: string) {
  return new Date(`${isoDate}T23:59:59.999`).getTime()
}

export function filterByDateRange(executions: Execution[], range: ObservabilityDateRange) {
  const from = startOfDay(range.from)
  const to = endOfDay(range.to)
  return executions.filter((e) => {
    const t = new Date(e.started_at).getTime()
    return Number.isFinite(t) && t >= from && t <= to
  })
}

/** @deprecated prefer filterByDateRange */
export function filterByPeriod(executions: Execution[], period: ObservabilityPeriodPreset) {
  return filterByDateRange(executions, rangeFromPreset(period))
}

export function timeSeries(executions: Execution[], range: ObservabilityDateRange, preset?: ObservabilityPeriodPreset) {
  const useHours = preset === '24h' || range.from === range.to

  if (useHours) {
    const buckets = 24
    const step = (24 * 60 * 60 * 1000) / buckets
    const start = Date.now() - 24 * 60 * 60 * 1000
    const series = Array.from({ length: buckets }, (_, i) => {
      const bucketStart = start + i * step
      return {
        label: new Date(bucketStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        from: bucketStart,
        executions: 0,
        prompt_cost: 0,
        completion_cost: 0,
        total_cost: 0,
      }
    })

    for (const execution of executions) {
      const t = new Date(execution.started_at).getTime()
      if (t < start || t > Date.now()) continue
      const idx = Math.min(buckets - 1, Math.max(0, Math.floor((t - start) / step)))
      const bucket = series[idx]
      if (!bucket) continue
      bucket.executions += 1
      bucket.prompt_cost += execution.prompt_cost ?? 0
      bucket.completion_cost += execution.completion_cost ?? 0
      bucket.total_cost += execution.total_cost ?? 0
    }

    return series.map((b) => ({
      label: b.label,
      executions: b.executions,
      prompt_cost: Number(b.prompt_cost.toFixed(6)),
      completion_cost: Number(b.completion_cost.toFixed(6)),
      total_cost: Number(b.total_cost.toFixed(6)),
    }))
  }

  const days: string[] = []
  const cursor = new Date(`${range.from}T12:00:00`)
  const end = new Date(`${range.to}T12:00:00`)
  while (cursor.getTime() <= end.getTime()) {
    days.push(toISODate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  const map = new Map(
    days.map((day) => [
      day,
      {
        label: new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        executions: 0,
        prompt_cost: 0,
        completion_cost: 0,
        total_cost: 0,
      },
    ]),
  )

  for (const execution of executions) {
    const day = datePart(execution.started_at)
    const bucket = map.get(day)
    if (!bucket) continue
    bucket.executions += 1
    bucket.prompt_cost += execution.prompt_cost ?? 0
    bucket.completion_cost += execution.completion_cost ?? 0
    bucket.total_cost += execution.total_cost ?? 0
  }

  return [...map.values()].map((b) => ({
    label: b.label,
    executions: b.executions,
    prompt_cost: Number(b.prompt_cost.toFixed(6)),
    completion_cost: Number(b.completion_cost.toFixed(6)),
    total_cost: Number(b.total_cost.toFixed(6)),
  }))
}

export function histogram(values: number[], bins = 10) {
  const finite = values.filter((v) => Number.isFinite(v))
  if (finite.length === 0) {
    return Array.from({ length: bins }, (_, i) => ({
      name: `${(i / bins).toFixed(1)}`,
      value: 0,
    }))
  }

  const counts = Array.from({ length: bins }, () => 0)
  for (const value of finite) {
    const clamped = Math.min(0.999999, Math.max(0, value))
    const idx = Math.min(bins - 1, Math.floor(clamped * bins))
    counts[idx] = (counts[idx] ?? 0) + 1
  }

  return counts.map((value, i) => ({
    name: `${(i / bins).toFixed(1)}–${((i + 1) / bins).toFixed(1)}`,
    value,
  }))
}

export function groupBy(executions: Execution[], key: keyof Execution) {
  const map = new Map<string, { calls: number; tokens: number; cost: number }>()

  for (const execution of executions) {
    const name = String(execution[key] ?? '—')
    const current = map.get(name) ?? { calls: 0, tokens: 0, cost: 0 }
    current.calls += 1
    current.tokens += execution.total_tokens ?? 0
    current.cost += execution.total_cost ?? 0
    map.set(name, current)
  }

  return [...map.entries()]
    .map(([name, row]) => ({
      name,
      calls: row.calls,
      tokens: row.tokens,
      cost: row.cost,
      avgCost: row.calls ? row.cost / row.calls : 0,
    }))
    .sort((a, b) => b.cost - a.cost)
}

export function toCsv(rows: Execution[]): string {
  const header = [
    'id',
    'started_at',
    'operation',
    'model',
    'provider',
    'status',
    'duration_ms',
    'total_tokens',
    'total_cost',
    'grounded',
    'grounding_score',
    'project_id',
  ]
  const lines = rows.map((e) =>
    [
      e.id,
      e.started_at,
      e.operation,
      e.model,
      e.provider,
      e.status,
      e.duration_ms,
      e.total_tokens,
      e.total_cost,
      e.grounded,
      e.grounding_score,
      e.project_id,
    ].join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

export const STAGE_LABELS: Record<string, string> = {
  embedding: 'Embedding',
  vector_search: 'Busca vetorial',
  hybrid_search: 'Busca híbrida',
  rerank: 'Rerank',
  context_expansion: 'Expansão de contexto',
  prompt_build: 'Montagem do prompt',
  llm_generate: 'Geração (LLM)',
  grounding: 'Grounding',
  post_process: 'Pós-processamento',
  pipeline: 'Pipeline',
}

export function labelStage(name: string) {
  return STAGE_LABELS[name] ?? name.replaceAll('_', ' ')
}

export const STATUS_LABELS: Record<string, string> = {
  completed: 'Concluída',
  failed: 'Falhou',
  timeout: 'Timeout',
  cancelled: 'Cancelada',
  running: 'Em execução',
  unknown: 'Desconhecido',
}

export function labelStatus(status: string) {
  const key = (status || 'unknown').toLowerCase()
  return STATUS_LABELS[key] ?? status
}
