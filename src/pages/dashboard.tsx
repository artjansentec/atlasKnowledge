import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpen,
  Clock,
  FolderKanban,
  Lightbulb,
  TrendingUp,
} from 'lucide-react'
import { DashboardPeriodPicker } from '../components/dashboard-period-picker'
import { StatusBadge } from '../components/status-badge'
import { currentMonthRange, formatDateBR } from '../lib/date'
import {
  getDashboardSummary,
  type DashboardPeriod,
  type DashboardSummary,
} from '../lib/projects-api'
import './css/dashboard.css'

function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>(() => currentMonthRange())
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Dashboard · Atlas Knowledge'
  }, [])

  useEffect(() => {
    let cancelled = false
    const requestPeriod = { from: period.from, to: period.to }

    async function load() {
      setLoading(true)
      setSummary(null)

      try {
        const summaryData = await getDashboardSummary(requestPeriod)
        if (cancelled) return
        setSummary(summaryData)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [period.from, period.to])

  const updates = summary?.recentUpdates ?? []
  const recent = summary?.recentProjects ?? []

  const stats = [
    {
      label: 'Projetos',
      value: summary?.projectCount ?? 0,
      icon: FolderKanban,
      hint: `${summary?.activeProjectCount ?? 0} ativos no período`,
    },
    {
      label: 'Documentos',
      value: summary?.documentCount ?? 0,
      icon: BookOpen,
      hint: 'seções alteradas no período',
    },
    {
      label: 'Lições',
      value: summary?.lessonCount ?? 0,
      icon: Lightbulb,
      hint: 'criadas no período',
    },
    {
      label: 'Atualizações',
      value: summary?.updateCount ?? 0,
      icon: TrendingUp,
      hint: 'registradas no período',
    },
  ]

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow eyebrow--accent">// dashboard</div>
          <h1>Conhecimento, sempre à mão</h1>
          <p>
            Centralize documentação, decisões e lições aprendidas de todos os projetos da empresa
            em um único lugar.
          </p>
        </div>

        <div className="dashboard-hero__aside">
          <DashboardPeriodPicker value={period} onChange={setPeriod} />

          <Link to="/projects" className="dashboard-hero__action">
            Explorar projetos <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {loading ? (
        <div className="dashboard-loading">Carregando indicadores...</div>
      ) : (
        <>
          <section className="stats-grid" aria-label="Indicadores do Atlas Knowledge">
            {stats.map((stat) => {
              const Icon = stat.icon

              return (
                <article key={stat.label} className="stat-card">
                  <div className="stat-card__header">
                    <span>{stat.label}</span>
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <strong>{stat.value}</strong>
                  <p>{stat.hint}</p>
                </article>
              )
            })}
          </section>

          <section className="dashboard-content">
            <article className="dashboard-panel dashboard-panel--wide" id="recent-projects">
              <div className="dashboard-panel__header">
                <h2>Projetos recentes</h2>
                <Link to="/projects">ver todos →</Link>
              </div>

              {recent.length === 0 ? (
                <p className="dashboard-empty">Nenhum projeto atualizado neste período.</p>
              ) : (
                <ul className="project-list">
                  {recent.map((project) => (
                    <li key={project.id}>
                      <Link to={`/projects/${project.slug}`} className="project-row">
                        <span className="project-avatar">{project.name.slice(0, 2).toUpperCase()}</span>

                        <span className="project-row__body">
                          <span className="project-row__title">
                            <p>{project.name}</p>
                            <StatusBadge status={project.status} />
                          </span>
                          <span>{project.description}</span>
                        </span>

                        <span className="project-row__meta">
                          <span>{formatDateBR(project.updatedAt)}</span>
                          <span>{project.responsible}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="dashboard-panel">
              <div className="dashboard-panel__header">
                <h2>Últimas atualizações</h2>
              </div>

              {updates.length === 0 ? (
                <p className="dashboard-empty">Nenhuma atualização neste período.</p>
              ) : (
                <ul className="updates-list">
                  {updates.map((update) => (
                    <li key={update.id}>
                      <Link to={`/projects/${update.projectSlug}`} className="update-card">
                        <span className="update-card__date">
                          <Clock size={13} aria-hidden="true" />
                          {formatDateBR(update.at)}
                        </span>
                        <strong>{update.action}</strong>
                        <span>
                          {update.projectName} · {update.target}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  )
}

export default DashboardPage
