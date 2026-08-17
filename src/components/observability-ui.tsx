import { type ReactNode, useId } from 'react'
import { Dialog, DialogContent } from '@mui/material'
import { X } from 'lucide-react'
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
  caption,
  onHelp,
  tone,
  loading,
}: {
  label: ReactNode
  value: string
  tip?: string
  /** Short plain-language line under the value */
  caption?: string
  /** When set, the ? opens this help instead of only showing a native tooltip */
  onHelp?: () => void
  tone?: 'positive' | 'warning' | 'negative'
  loading?: boolean
}) {
  return (
    <article className={`obs-kpi${tone ? ` obs-kpi--${tone}` : ''}`}>
      <span className="obs-kpi__label">
        {label}
        {tip || onHelp ? (
          onHelp ? (
            <button
              type="button"
              className="obs-kpi__tip"
              onClick={onHelp}
              aria-label={`Explicar ${typeof label === 'string' ? label : 'indicador'}`}
              title={tip ?? 'Clique para entender este indicador'}
            >
              ?
            </button>
          ) : (
            <span className="obs-kpi__tip" title={tip}>
              ?
            </span>
          )
        ) : null}
      </span>
      {loading ? <span className="obs-kpi__skeleton" /> : <strong className="obs-kpi__value">{value}</strong>}
      {caption && !loading ? <p className="obs-kpi__caption">{caption}</p> : null}
    </article>
  )
}

export function ObsHelpDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const titleId = useId()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth className="obs-help-dialog">
      <DialogContent className="obs-help-dialog__content">
        <header className="obs-help-dialog__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="obs-help-dialog__close" onClick={onClose} aria-label="Fechar">
            <X size={18} strokeWidth={2} />
          </button>
        </header>
        <div className="obs-help-dialog__body" role="document" aria-labelledby={titleId}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function PercentileHelpContent() {
  return (
    <div className="obs-help">
      <p>
        São tempos de resposta ordenados do mais rápido ao mais lento. Cada <strong>pN</strong> responde:
        “N% das execuções terminaram em até este tempo?”
      </p>

      <ul className="obs-help__list">
        <li>
          <strong>p50 (mediana / caso típico)</strong>
          <span>Metade das execuções foi mais rápida que este valor. É o que a maioria sente.</span>
        </li>
        <li>
          <strong>p95 (lentidão recorrente)</strong>
          <span>95% terminaram em até este tempo; só 5% foram mais lentas. Bom alerta de problema real.</span>
        </li>
        <li>
          <strong>p99 (piores extremos)</strong>
          <span>99% ficaram abaixo; o 1% restante são outliers (picos, retries, timeouts).</span>
        </li>
      </ul>

      <div className="obs-help__example">
        <p className="obs-help__example-title">Exemplo</p>
        <p>
          p50 = <strong>800 ms</strong>, p95 = <strong>3 s</strong>, p99 = <strong>12 s</strong>
        </p>
        <p>
          A maioria responde em ~0,8 s. Em 1 de cada 20 chamadas passa de 3 s. Nos piores casos chega a ~12 s.
        </p>
      </div>

      <p className="obs-help__tip">
        Se o p50 estiver ok e o p95/p99 estiverem altos, o fluxo médio está bem — o problema está na cauda
        lenta (gargalo, modelo, retry).
      </p>
    </div>
  )
}

export function StageLatencyHelpContent() {
  return (
    <div className="obs-help">
      <p>
        Este gráfico <strong>quebra o tempo total</strong> da execução em cada etapa do pipeline e mostra o{' '}
        <strong>p50</strong> (caso típico) e o <strong>p95</strong> (lentidão recorrente) de cada uma.
      </p>

      <ul className="obs-help__list">
        <li>
          <strong>Cada linha = uma etapa</strong>
          <span>
            Embedding, busca vetorial/híbrida, rerank, montagem do prompt, geração (LLM), grounding, etc.
          </span>
        </li>
        <li>
          <strong>Barra p50</strong>
          <span>Tempo típico daquela etapa — o que acontece na maior parte das vezes.</span>
        </li>
        <li>
          <strong>Barra p95</strong>
          <span>Tempo “ruim recorrente”: 95% das vezes a etapa ficou abaixo disso.</span>
        </li>
        <li>
          <strong>Ordem das linhas</strong>
          <span>As etapas vêm ordenadas pelo maior p95. A de cima costuma ser o gargalo.</span>
        </li>
      </ul>

      <div className="obs-help__example">
        <p className="obs-help__example-title">Como interpretar</p>
        <p>
          <strong>Uma etapa com p95 bem maior</strong> → provável gargalo (ex.: LLM ou busca).
        </p>
        <p>
          <strong>p50 baixo e p95 alto</strong> na mesma etapa → em geral ok; às vezes explode (pico/retry).
        </p>
        <p>
          <strong>p50 e p95 altos</strong> → a etapa é lenta de forma estável.
        </p>
      </div>

      <p className="obs-help__tip">
        Os cards de cima medem a execução inteira. Este gráfico mostra <strong>onde</strong> esse tempo está
        sendo gasto — útil para saber se o atraso vem do modelo, da busca ou de outra etapa.
      </p>
    </div>
  )
}

export function Panel({
  title,
  description,
  onHelp,
  helpLabel = 'Explicar este painel',
  children,
}: {
  title: ReactNode
  description?: ReactNode
  onHelp?: () => void
  helpLabel?: string
  children: ReactNode
}) {
  return (
    <section className="obs-panel">
      <header className="obs-panel__header">
        <div className="obs-panel__title-row">
          <h3>{title}</h3>
          {onHelp ? (
            <button
              type="button"
              className="obs-kpi__tip"
              onClick={onHelp}
              aria-label={helpLabel}
              title={helpLabel}
            >
              ?
            </button>
          ) : null}
        </div>
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
