import { useEffect, useId, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowUpDown, Download, RefreshCw, Search } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DashboardPeriodPicker } from '../components/dashboard-period-picker'
import {
  ChartSkeleton,
  EmptyState,
  KpiCard,
  Panel,
  StatusPill,
  TermHint,
  fmtMs,
  fmtNum,
  fmtPct,
  fmtUsd,
} from '../components/observability-ui'
import { useAuth } from '../lib/auth'
import {
  avg,
  errorBreakdown,
  groupBy,
  histogram,
  kpis,
  labelStage,
  percentile,
  stageStats,
  timeSeries,
  toCsv,
} from '../lib/observability-aggregations'
import { observabilityErrorMessage } from '../lib/observability-api'
import { ObservabilityProvider, useObservability } from '../lib/observability-store'
import type { Execution, ExecutionDetail, ObservabilityPeriodPreset } from '../types/observability'
import './css/ai-monitor.css'

type MonitorTab = 'performance' | 'errors' | 'quality' | 'costs' | 'executions'

const TABS: { id: MonitorTab; label: string }[] = [
  { id: 'performance', label: 'Desempenho' },
  { id: 'errors', label: 'Erros' },
  { id: 'quality', label: 'Qualidade' },
  { id: 'costs', label: 'Custos' },
  { id: 'executions', label: 'Execuções' },
]

const PRESETS: { id: Exclude<ObservabilityPeriodPreset, 'custom'>; label: string }[] = [
  { id: '24h', label: '24 h' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
]

const tip = {
  contentStyle: {
    background: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 10,
    fontSize: 12,
    boxShadow: '0 10px 30px rgba(8, 20, 12, 0.08)',
  },
  labelStyle: { color: 'var(--color-muted-foreground)', marginBottom: 4 },
} as const

const FEED_PAGE_SIZE = 10

function ChartGradients({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-primary`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id={`${id}-secondary`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
        <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.85} />
        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={1} />
      </linearGradient>
    </defs>
  )
}

function PerformanceTab() {
  const { executions, loading, preset, range } = useObservability()
  const chartId = useId().replace(/:/g, '')
  const k = kpis(executions)
  const p99 = percentile(
    executions.map((e) => e.duration_ms),
    99,
  )
  const stages = stageStats(executions).map((s) => ({ ...s, name: labelStage(s.name) }))
  const series = timeSeries(executions, range, preset)
  const volume = series.map((s) => ({ label: s.label, execucoes: s.executions }))

  return (
    <div className="obs-tab-panel">
      <div className="obs-grid-3">
        <KpiCard
          label="p50"
          tip="Percentil 50: metade das execuções foi mais rápida que este valor."
          value={fmtMs(k.p50)}
          loading={loading}
        />
        <KpiCard
          label="p95"
          tip="Percentil 95: 95% das execuções terminaram em até este tempo. Bom indicador de lentidão recorrente."
          value={fmtMs(k.p95)}
          loading={loading}
          tone="warning"
        />
        <KpiCard
          label="p99"
          tip="Percentil 99: quase todas as execuções (99%) ficaram abaixo deste tempo. Mostra os piores casos."
          value={fmtMs(p99)}
          loading={loading}
          tone="negative"
        />
      </div>

      <Panel
        title="Latência por etapa"
        description={
          <>
            Tempo (p50 / p95) em cada estágio do pipeline. O maior p95 costuma ser o{' '}
            <TermHint term="gargalo" tip="Etapa que mais atrasa o fluxo completo." />.
          </>
        }
      >
        {loading ? (
          <ChartSkeleton height={320} />
        ) : stages.length === 0 ? (
          <EmptyState message="Sem tempos de etapa no período." />
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={stages} layout="vertical" margin={{ left: 16, right: 12 }}>
              <ChartGradients id={chartId} />
              <CartesianGrid strokeDasharray="4 6" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 11 }}
                stroke="var(--color-muted-foreground)"
              />
              <Tooltip {...tip} formatter={(v) => fmtMs(Number(v))} />
              <Legend />
              <Bar dataKey="p50" fill="var(--color-chart-2)" name="p50 (mediana)" radius={[0, 6, 6, 0]} barSize={10} />
              <Bar
                dataKey="p95"
                fill={`url(#${chartId}-bar)`}
                name="p95"
                radius={[0, 6, 6, 0]}
                barSize={10}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel
        title="Volume de execuções"
        description="Quantidade de chamadas ao pipeline ao longo do tempo selecionado."
      >
        {loading ? (
          <ChartSkeleton height={240} />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={volume} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <ChartGradients id={`${chartId}-vol`} />
              <CartesianGrid strokeDasharray="4 6" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={40} allowDecimals={false} />
              <Tooltip {...tip} />
              <Area
                type="monotone"
                dataKey="execucoes"
                name="Execuções"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                fill={`url(#${chartId}-vol-primary)`}
                activeDot={{ r: 5 }}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <TabGlossary
        items={[
          {
            term: 'p50 / p95 / p99',
            text: 'Percentis de latência: mediana, casos lentos frequentes e piores extremos.',
          },
        ]}
      />
    </div>
  )
}

function ErrorsTab({ onOpenExecution }: { onOpenExecution: (id: string) => void }) {
  const { executions, loading, errorDetails, errorDetailsLoading, loadErrorDetails } = useObservability()
  const [page, setPage] = useState(0)
  const k = kpis(executions)

  useEffect(() => {
    void loadErrorDetails()
  }, [loadErrorDetails])

  useEffect(() => {
    setPage(0)
  }, [errorDetails])

  const { byType, byStage, feed } = errorBreakdown(errorDetails)
  const busy = loading || errorDetailsLoading
  const pages = Math.max(1, Math.ceil(feed.length / FEED_PAGE_SIZE))
  const pageFeed = feed.slice(page * FEED_PAGE_SIZE, page * FEED_PAGE_SIZE + FEED_PAGE_SIZE)
  const failedCount =
    feed.length || executions.filter((e) => e.status === 'failed' || e.status === 'timeout').length

  const Bars = ({ rows }: { rows: { name: string; value: number }[] }) =>
    rows.length === 0 ? (
      <EmptyState message="Nenhum erro registrado." />
    ) : (
      <ul className="obs-bars">
        {rows.map((r, index) => (
          <li key={r.name} style={{ ['--bar-i' as string]: index }}>
            <span className="obs-bars__name" title={r.name}>
              {labelStage(r.name)}
            </span>
            <div className="obs-bars__track">
              <div
                className="obs-bars__fill is-animated"
                style={{ width: `${(r.value / rows[0]!.value) * 100}%` }}
              />
            </div>
            <span className="obs-bars__value">{r.value}</span>
          </li>
        ))}
      </ul>
    )

  return (
    <div className="obs-tab-panel">
      <div className="obs-grid-3">
        <KpiCard
          label="Taxa de erro"
          tip="Percentual de execuções com status falhou ou timeout no período."
          value={fmtPct(k.errorRate)}
          tone="negative"
          loading={loading}
        />
        <KpiCard label="Erros registrados" value={String(failedCount)} loading={busy} />
        <KpiCard
          label="Taxa de sucesso"
          tip="Percentual de execuções concluídas com sucesso."
          value={fmtPct(k.successRate)}
          tone="positive"
          loading={loading}
        />
      </div>

      <div className="obs-grid-2">
        <Panel
          title="Erros por tipo"
          description="Classificação do problema (timeout, provider, validação, etc.)."
        >
          {busy ? <ChartSkeleton height={160} /> : <Bars rows={byType} />}
        </Panel>
        <Panel
          title="Erros por etapa"
          description="Em qual estágio do pipeline a falha aconteceu."
        >
          {busy ? <ChartSkeleton height={160} /> : <Bars rows={byStage} />}
        </Panel>
      </div>

      <Panel title="Feed de erros" description="Lista paginada — 10 erros por página.">
        {busy ? (
          <ChartSkeleton height={180} />
        ) : feed.length === 0 ? (
          <EmptyState message="Nenhum erro no período." />
        ) : (
          <>
            <ul className="obs-feed">
              {pageFeed.map(({ execution, error }) => (
                <li key={`${execution.id}-${error.occurred_at}-${error.type}`}>
                  <button type="button" className="obs-feed__item" onClick={() => onOpenExecution(execution.id)}>
                    <div className="obs-feed__meta">
                      {error.type} · {labelStage(error.stage)}
                      <span>{new Date(error.occurred_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="obs-feed__message">{error.message}</p>
                    <div className="obs-feed__sub">
                      {execution.model} · {execution.project_id} · {execution.id}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="obs-pager" style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <span>
                Página {page + 1} de {pages} · {fmtNum(feed.length)} erros
              </span>
              <div className="obs-pager__actions">
                <button type="button" className="obs-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </button>
                <button
                  type="button"
                  className="obs-btn"
                  disabled={page >= pages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}

function QualityTab() {
  const { executions, loading } = useObservability()
  const chartId = useId().replace(/:/g, '')
  const k = kpis(executions)
  const grounding = histogram(executions.map((e) => e.grounding_score ?? 0))
  const confidence = histogram(executions.map((e) => e.confidence_score ?? 0))
  const avgRetrieval = avg(executions.map((e) => e.retrieval_score ?? 0))
  const avgRerank = avg(executions.map((e) => e.rerank_score ?? 0))

  return (
    <div className="obs-tab-panel">
      <div className="obs-grid-4">
        <KpiCard
          label={
            <TermHint
              term="Taxa de grounding"
              tip="Percentual de respostas consideradas ancoradas nas fontes recuperadas (não inventadas)."
            />
          }
          value={fmtPct(k.groundingRate)}
          tone={k.groundingRate > 70 ? 'positive' : 'warning'}
          loading={loading}
        />
        <KpiCard
          label={
            <TermHint
              term="Score de retrieval"
              tip="Qualidade média da busca de trechos relevantes no índice semântico."
            />
          }
          value={avgRetrieval.toFixed(3)}
          loading={loading}
        />
        <KpiCard
          label={
            <TermHint
              term="Score de rerank"
              tip="Após a busca, o rerank reordena trechos para priorizar os mais úteis à pergunta."
            />
          }
          value={avgRerank.toFixed(3)}
          loading={loading}
        />
        <KpiCard
          label={
            <TermHint
              term="Taxa de cache"
              tip="Percentual de respostas reaproveitadas de cache, economizando tokens e tempo."
            />
          }
          value={fmtPct(k.cacheHitRate)}
          loading={loading}
        />
      </div>

      <div className="obs-grid-2">
        {[
          {
            title: 'Distribuição do score de grounding',
            tip: 'Quão bem a resposta se apoia nos documentos recuperados (0 a 1).',
            data: grounding,
          },
          {
            title: 'Distribuição do score de confiança',
            tip: 'Confiança estimada do modelo na resposta gerada (0 a 1).',
            data: confidence,
          },
        ].map((c, idx) => (
          <Panel key={c.title} title={c.title} description={c.tip}>
            {loading ? (
              <ChartSkeleton height={240} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={c.data} margin={{ top: 8, right: 8 }}>
                  <ChartGradients id={`${chartId}-q${idx}`} />
                  <CartesianGrid strokeDasharray="4 6" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={36} allowDecimals={false} />
                  <Tooltip {...tip} />
                  <Bar
                    dataKey="value"
                    fill={idx === 0 ? 'var(--color-chart-1)' : 'var(--color-chart-2)'}
                    radius={[6, 6, 0, 0]}
                    name="Execuções"
                    animationDuration={700}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
        ))}
      </div>

      <TabGlossary
        items={[
          {
            term: 'Grounding',
            text: 'Verifica se a resposta se apoia nos documentos recuperados, em vez de “inventar”.',
          },
          {
            term: 'Retrieval / Rerank',
            text: 'Busca trechos relevantes e depois reordena os melhores para o prompt.',
          },
        ]}
      />
    </div>
  )
}

function CostsTab() {
  const { executions, loading, preset, range } = useObservability()
  const chartId = useId().replace(/:/g, '')
  const series = timeSeries(executions, range, preset).map((s) => ({
    label: s.label,
    prompt: s.prompt_cost,
    completion: s.completion_cost,
    total: s.total_cost,
  }))
  const totalCost = executions.reduce((sum, e) => sum + (e.total_cost ?? 0), 0)
  const dims = [
    { title: 'Por modelo', data: groupBy(executions, 'model') },
    { title: 'Por provedor', data: groupBy(executions, 'provider') },
    { title: 'Por operação', data: groupBy(executions, 'operation') },
    { title: 'Por projeto', data: groupBy(executions, 'project_id') },
  ]

  return (
    <div className="obs-tab-panel">
      <div className="obs-grid-3">
        <KpiCard label="Custo total no período" value={fmtUsd(totalCost, 4)} loading={loading} />
        <KpiCard
          label="Custo médio / execução"
          value={fmtUsd(executions.length ? totalCost / executions.length : 0, 4)}
          loading={loading}
        />
        <KpiCard label="Execuções com custo" value={fmtNum(executions.length)} loading={loading} />
      </div>

      <Panel
        title="Gastos ao longo do tempo"
        description={
          <>
            Evolução do custo em USD. <strong>Prompt</strong> é a entrada enviada ao modelo;{' '}
            <strong>Completion</strong> é o texto gerado na resposta.
          </>
        }
      >
        {loading ? (
          <ChartSkeleton height={300} />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={series} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <ChartGradients id={chartId} />
              <CartesianGrid strokeDasharray="4 6" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="var(--color-muted-foreground)"
                width={56}
                tickFormatter={(v) => `$${Number(v).toFixed(3)}`}
              />
              <Tooltip {...tip} formatter={(v) => fmtUsd(Number(v), 4)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                name="Custo total"
                stroke="var(--color-chart-1)"
                strokeWidth={3}
                dot={{ r: 3, strokeWidth: 0, fill: 'var(--color-chart-1)' }}
                activeDot={{ r: 6 }}
                animationDuration={900}
              />
              <Line
                type="monotone"
                dataKey="prompt"
                name="Prompt"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                animationDuration={900}
              />
              <Line
                type="monotone"
                dataKey="completion"
                name="Completion"
                stroke="#c47b16"
                strokeWidth={2}
                strokeDasharray="2 4"
                dot={false}
                animationDuration={900}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <div className="obs-grid-2">
        {dims.map((d) => (
          <Panel key={d.title} title={d.title}>
            <div className="obs-table-wrap">
              <table className="obs-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th className="is-right">Chamadas</th>
                    <th className="is-right">Tokens</th>
                    <th className="is-right">Custo</th>
                    <th className="is-right">Custo médio</th>
                  </tr>
                </thead>
                <tbody>
                  {d.data.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState message="Sem dados no período." />
                      </td>
                    </tr>
                  ) : (
                    d.data.map((r) => (
                      <tr key={r.name}>
                        <td className="font-mono">{r.name}</td>
                        <td className="is-right">{fmtNum(r.calls)}</td>
                        <td className="is-right">{fmtNum(r.tokens)}</td>
                        <td className="is-right">{fmtUsd(r.cost, 4)}</td>
                        <td className="is-right">{fmtUsd(r.avgCost, 4)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        ))}
      </div>

      <TabGlossary
        items={[
          {
            term: 'Tokens / Prompt / Completion',
            text: 'Unidades cobradas: texto de entrada (prompt) e texto gerado (completion).',
          },
        ]}
      />
    </div>
  )
}

type SortKey = 'started_at' | 'duration_ms' | 'total_cost' | 'total_tokens'

const columns: { key: SortKey | null; label: string; className?: string }[] = [
  { key: 'started_at', label: 'Início' },
  { key: null, label: 'Operação' },
  { key: null, label: 'Modelo' },
  { key: null, label: 'Status' },
  { key: 'duration_ms', label: 'Duração', className: 'is-right' },
  { key: 'total_tokens', label: 'Tokens', className: 'is-right' },
  { key: 'total_cost', label: 'Custo', className: 'is-right' },
  { key: null, label: 'Grounded', className: 'is-right' },
]

const PAGE_SIZE = 15

function ExecutionsTab({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { executions, loading, getDetail } = useObservability()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'started_at',
    dir: 'desc',
  })
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState<ExecutionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      setDetailError(null)
      return
    }

    let cancelled = false
    setDetailLoading(true)
    setDetailError(null)

    void getDetail(selectedId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null)
          setDetailError(observabilityErrorMessage(err))
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedId, getDetail])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? executions.filter((e) =>
          [e.id, e.project_id, e.model, e.operation, e.provider, e.request_id ?? '']
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
      : executions
    return [...filtered].sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      const cmp = typeof av === 'string' ? av.localeCompare(String(bv)) : Number(av) - Number(bv)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [executions, query, sort])

  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))

  const toggleSort = (key: SortKey) => {
    setPage(0)
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }))
  }

  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'atlas-ai-executions.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (selectedId) {
    return (
      <div className="obs-tab-panel">
        <Panel title={`Execução ${selectedId}`}>
          <button type="button" className="obs-btn" onClick={() => onSelect(null)} style={{ marginBottom: 12 }}>
            ← Voltar à lista
          </button>

          {detailLoading ? <ChartSkeleton height={220} /> : null}
          {detailError ? <EmptyState message={detailError} /> : null}

          {detail ? (
            <>
              <dl className="obs-detail">
                <dt>Início</dt>
                <dd>{new Date(detail.started_at).toLocaleString('pt-BR')}</dd>
                <dt>Operação</dt>
                <dd>{detail.operation}</dd>
                <dt>Modelo / Provedor</dt>
                <dd>
                  {detail.model} · {detail.provider}
                </dd>
                <dt>Status</dt>
                <dd>
                  <StatusPill status={detail.status} />
                </dd>
                <dt>Duração</dt>
                <dd>{fmtMs(detail.duration_ms)}</dd>
                <dt>
                  <TermHint
                    term="Tokens"
                    tip="Unidades de texto cobradas pelo modelo (entrada + saída)."
                  />
                </dt>
                <dd>
                  {fmtNum(detail.total_tokens)} (prompt {fmtNum(detail.prompt_tokens)} · completion{' '}
                  {fmtNum(detail.completion_tokens)})
                </dd>
                <dt>Custo</dt>
                <dd>
                  {fmtUsd(detail.total_cost, 4)}
                  {detail.currency ? ` ${detail.currency}` : ''}
                </dd>
                <dt>
                  <TermHint
                    term="Grounding"
                    tip="Se a resposta está ancorada nas fontes recuperadas e com qual score."
                  />
                </dt>
                <dd>
                  {detail.grounded ? `${(detail.grounding_score * 100).toFixed(0)}%` : '—'}
                  {detail.confidence_score != null
                    ? ` · confiança ${detail.confidence_score.toFixed(3)}`
                    : ''}
                  {detail.retrieval_score != null
                    ? ` · retrieval ${detail.retrieval_score.toFixed(3)}`
                    : ''}
                </dd>
                <dt>Projeto</dt>
                <dd className="font-mono">{detail.project_id}</dd>
                {detail.request_id ? (
                  <>
                    <dt>Request ID</dt>
                    <dd className="font-mono">{detail.request_id}</dd>
                  </>
                ) : null}
              </dl>

              {detail.stages.length > 0 ? (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Etapas do pipeline</h4>
                  <div className="obs-table-wrap" style={{ margin: 0 }}>
                    <table className="obs-table">
                      <thead>
                        <tr>
                          <th>Etapa</th>
                          <th>Status</th>
                          <th className="is-right">Duração</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.stages.map((s) => (
                          <tr key={`${s.stage_name}-${s.started_at ?? s.duration_ms}`}>
                            <td className="font-mono">{labelStage(s.stage_name)}</td>
                            <td>
                              <StatusPill status={s.status} />
                            </td>
                            <td className="is-right">{fmtMs(s.duration_ms)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {detail.errors.length > 0 ? (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Erros</h4>
                  <ul className="obs-feed" style={{ margin: 0 }}>
                    {detail.errors.map((err, i) => (
                      <li key={`${err.type}-${err.occurred_at}-${i}`}>
                        <div className="obs-feed__item" style={{ cursor: 'default' }}>
                          <div className="obs-feed__meta">
                            {err.type} · {labelStage(err.stage)}
                            <span>{new Date(err.occurred_at).toLocaleString('pt-BR')}</span>
                          </div>
                          <p className="obs-feed__message">{err.message}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {detail.documents.length > 0 ? (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>
                    Documentos recuperados ({detail.documents.length})
                  </h4>
                  <div className="obs-table-wrap" style={{ margin: 0 }}>
                    <table className="obs-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Documento</th>
                          <th className="is-right">Similaridade</th>
                          <th className="is-right">Usado no prompt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.documents.slice(0, 20).map((doc) => (
                          <tr key={`${doc.document_id}-${doc.chunk_id}-${doc.position}`}>
                            <td className="is-right">{doc.position}</td>
                            <td className="font-mono">{doc.document_id}</td>
                            <td className="is-right">{doc.similarity_score.toFixed(3)}</td>
                            <td className="is-right">{doc.was_used_in_prompt ? 'sim' : 'não'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </Panel>
      </div>
    )
  }

  return (
    <div className="obs-tab-panel">
      <Panel
        title={`Execuções · ${fmtNum(rows.length)} no período`}
        description="Cada linha é uma chamada ao pipeline (RAG, ingestão, etc.)."
      >
        <div style={{ margin: '-18px' }}>
          <div className="obs-toolbar">
            <div className="obs-search">
              <Search size={16} aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(0)
                }}
                placeholder="Buscar por id, modelo, projeto…"
                aria-label="Buscar execuções"
              />
            </div>
            <button type="button" className="obs-btn" onClick={download} style={{ marginLeft: 'auto' }}>
              <Download size={14} aria-hidden="true" /> Exportar CSV
            </button>
          </div>

          <div className="obs-table-wrap" style={{ margin: 0 }}>
            <table className="obs-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.label} className={c.className}>
                      {c.key ? (
                        <button type="button" className="obs-btn obs-btn--ghost" onClick={() => toggleSort(c.key!)}>
                          {c.label}
                          <ArrowUpDown size={12} aria-hidden="true" />
                        </button>
                      ) : c.label === 'Grounded' ? (
                        <TermHint
                          term="Grounded"
                          tip="Indica se a resposta foi ancorada nas fontes (com percentual do score)."
                        />
                      ) : c.label === 'Tokens' ? (
                        <TermHint term="Tokens" tip="Unidades de texto processadas pelo modelo." />
                      ) : (
                        c.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {columns.map((c) => (
                          <td key={c.label}>
                            <span className="obs-kpi__skeleton" style={{ width: '100%', height: 14 }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : pageRows.map((e: Execution) => (
                      <tr key={e.id}>
                        <td>
                          <button type="button" className="obs-btn obs-btn--ghost" onClick={() => onSelect(e.id)}>
                            <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                              {new Date(e.started_at).toLocaleString('pt-BR')}
                            </span>
                          </button>
                          <div className="font-mono" style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>
                            {e.id}
                          </div>
                        </td>
                        <td>{e.operation}</td>
                        <td>
                          <div className="font-mono">{e.model}</div>
                          <div style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>{e.provider}</div>
                        </td>
                        <td>
                          <StatusPill status={e.status} />
                        </td>
                        <td className="is-right">{fmtMs(e.duration_ms)}</td>
                        <td className="is-right">{fmtNum(e.total_tokens)}</td>
                        <td className="is-right">{fmtUsd(e.total_cost, 4)}</td>
                        <td className="is-right">
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: e.grounded ? 'var(--primary)' : 'var(--muted-foreground)',
                            }}
                          >
                            {e.grounded ? `${((e.grounding_score ?? 0) * 100).toFixed(0)}%` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {!loading && rows.length === 0 ? <EmptyState message="Nenhuma execução encontrada." /> : null}
          </div>

          <div className="obs-pager">
            <span>
              Página {page + 1} de {pages}
            </span>
            <div className="obs-pager__actions">
              <button type="button" className="obs-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </button>
              <button
                type="button"
                className="obs-btn"
                disabled={page >= pages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function TabGlossary({ items }: { items: { term: string; text: string }[] }) {
  return (
    <section className="obs-glossary" aria-label="Glossário desta aba">
      <h3>Como ler estes indicadores</h3>
      <dl>
        {items.map((item) => (
          <div key={item.term}>
            <dt>{item.term}</dt>
            <dd>{item.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function AiMonitorContent() {
  const { preset, setPreset, range, setCustomRange, error, refresh, loading, count, executions } =
    useObservability()
  const [tab, setTab] = useState<MonitorTab>('performance')
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    document.title = 'Monitor de IA · Atlas Knowledge'
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="obs-page">
      <div className="obs-shell">
        <header className="obs-header">
          <div>
            <div className="eyebrow eyebrow--accent">// admin · ia</div>
            <h1>Monitor de desempenho da IA</h1>
            <p>
              Dados ao vivo do pipeline — {fmtNum(executions.length)} execuções no período
              {count ? ` · ${fmtNum(count)} retornadas pela API` : ''}.
            </p>
          </div>
          <div className="obs-header__actions">
            <button
              type="button"
              className="obs-btn"
              disabled={loading || refreshing}
              onClick={() => void handleRefresh()}
            >
              <RefreshCw size={14} aria-hidden="true" />
              Atualizar
            </button>
            <div className="obs-period" role="group" aria-label="Atalhos de período">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`obs-period__btn${preset === p.id ? ' is-active' : ''}`}
                  onClick={() => setPreset(p.id)}
                >
                  {p.label}
                </button>
              ))}
              {preset === 'custom' ? <span className="obs-period__btn is-active">Personalizado</span> : null}
            </div>
            <DashboardPeriodPicker value={range} onChange={setCustomRange} />
          </div>
        </header>

        {error ? (
          <div className="obs-panel">
            <div className="obs-panel__body">
              <EmptyState message={error} />
            </div>
          </div>
        ) : null}

        <div className="obs-tabs" role="tablist" aria-label="Dashboards de IA">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`obs-tab${tab === item.id ? ' is-active' : ''}`}
              onClick={() => {
                setTab(item.id)
                if (item.id !== 'executions') setSelectedExecutionId(null)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'performance' ? <PerformanceTab /> : null}
        {tab === 'errors' ? (
          <ErrorsTab
            onOpenExecution={(id) => {
              setSelectedExecutionId(id)
              setTab('executions')
            }}
          />
        ) : null}
        {tab === 'quality' ? <QualityTab /> : null}
        {tab === 'costs' ? <CostsTab /> : null}
        {tab === 'executions' ? (
          <ExecutionsTab selectedId={selectedExecutionId} onSelect={setSelectedExecutionId} />
        ) : null}
      </div>
    </div>
  )
}

function AiMonitorPage() {
  const { loading, isCurrentUserAdmin } = useAuth()

  if (loading) {
    return <div className="obs-page obs-empty">Carregando...</div>
  }

  if (!isCurrentUserAdmin()) {
    return <Navigate to="/projects" replace />
  }

  return (
    <ObservabilityProvider>
      <AiMonitorContent />
    </ObservabilityProvider>
  )
}

export default AiMonitorPage
