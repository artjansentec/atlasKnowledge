import type { ReactNode } from 'react'
import type { ExecutionStatus } from '../types/observability'
import { labelStatus } from '../lib/observability-aggregations'

export function fmtPct(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`
}

export function fmtMs(value: number) {
  if (!Number.isFinite(value)) return '—'
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 1 : 2)}s`
  return `${Math.round(value)}ms`
}

export function fmtNum(value: number) {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value || 0))
}

export function fmtUsd(value: number, digits = 4) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value || 0)
}

export function EmptyState({ message }: { message: string }) {
  return <p className="obs-empty">{message}</p>
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <div className="obs-chart-skeleton" style={{ height }} aria-hidden="true" />
}

export function TermHint({ term, tip }: { term: string; tip: string }) {
  return (
    <abbr className="obs-term" title={tip}>
      {term}
      <span className="obs-term__mark" aria-hidden="true">
        ?
      </span>
    </abbr>
  )
}

export function KpiCard({
  label,
  value,
  tip,
  tone,
  loading,
}: {
  label: ReactNode
  value: string
  tip?: string
  tone?: 'positive' | 'warning' | 'negative'
  loading?: boolean
}) {
  return (
    <article className={`obs-kpi${tone ? ` obs-kpi--${tone}` : ''}`}>
      <span className="obs-kpi__label">
        {label}
        {tip ? (
          <span className="obs-kpi__tip" title={tip}>
            ?
          </span>
        ) : null}
      </span>
      {loading ? <span className="obs-kpi__skeleton" /> : <strong className="obs-kpi__value">{value}</strong>}
    </article>
  )
}

export function Panel({
  title,
  description,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="obs-panel">
      <header className="obs-panel__header">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="obs-panel__body">{children}</div>
    </section>
  )
}

export function StatusPill({ status }: { status: string }) {
  const normalized = (status || 'unknown').toLowerCase()
  const tone: ExecutionStatus | 'unknown' =
    normalized === 'completed' ||
    normalized === 'failed' ||
    normalized === 'timeout' ||
    normalized === 'cancelled' ||
    normalized === 'running'
      ? normalized
      : 'unknown'

  return <span className={`obs-status obs-status--${tone}`}>{labelStatus(normalized)}</span>
}
