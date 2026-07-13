import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Lightbulb,
  Search,
  UserRound,
} from 'lucide-react'
import { StatusBadge } from '../components/status-badge'
import { useAuth } from '../lib/auth'
import { formatDateBR } from '../lib/date'
import {
  getDashboardSummary,
  listProjectUpdates,
  listProjects,
  type DashboardSummary,
  type ProjectListItem,
  type ProjectUpdate,
} from '../lib/projects-api'
import { type ProjectStatus } from '../lib/projects'
import { useProjectStatuses } from '../lib/project-status'
import './css/projects.css'

type Filter = 'all' | ProjectStatus

function ProjectsPage() {
  const { isCurrentUserAdmin } = useAuth()
  const { statuses } = useProjectStatuses()
  const filterOptions = useMemo<{ value: Filter; label: string }[]>(
    () => [{ value: 'all', label: 'Todos' }, ...statuses.map((status) => ({ value: status.code, label: status.label }))],
    [statuses],
  )
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [createdProject, setCreatedProject] = useState('')
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [updates, setUpdates] = useState<ProjectUpdate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Projetos · Atlas Knowledge'
    const created = sessionStorage.getItem('atlas:project-created')

    if (created) {
      setCreatedProject(created)
      sessionStorage.removeItem('atlas:project-created')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const status = filter === 'all' ? undefined : filter
        const [projectList, summaryData, updateList] = await Promise.all([
          listProjects({ status, q: query.trim() || undefined }),
          getDashboardSummary(),
          listProjectUpdates(),
        ])
        if (cancelled) return
        setProjects(projectList)
        setSummary(summaryData)
        setUpdates(updateList.slice(0, 5))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const timeout = window.setTimeout(() => void load(), query ? 300 : 0)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [filter, query])

  const activeCount = useMemo(
    () => projects.filter((project) => project.status === 'active').length,
    [projects],
  )
  const doneCount = useMemo(
    () => projects.filter((project) => project.status === 'done').length,
    [projects],
  )
  const canCreateProjects = isCurrentUserAdmin()

  return (
    <div className="projects-page">
      <section className="projects-hero">
        <div>
          <div className="eyebrow eyebrow--accent">// projetos</div>
          <h1>Projetos documentados</h1>
          <p>
            Acompanhe iniciativas, responsáveis, documentação e aprendizados em um único painel.
          </p>
        </div>

        {canCreateProjects && (
          <Link to="/projects/new" className="projects-hero__action">
            Novo projeto <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        )}
      </section>

      {createdProject && (
        <section className="projects-feedback" role="status">
          Projeto <strong>{createdProject}</strong> criado com sucesso.
        </section>
      )}

      <section className="projects-overview" aria-label="Resumo dos projetos">
        <MetricCard icon={FolderKanban} label="Total" value={summary?.projectCount ?? projects.length} hint="projetos na wiki" />
        <MetricCard icon={Clock3} label="Ativos" value={activeCount} hint="em acompanhamento" />
        <MetricCard icon={CheckCircle2} label="Concluídos" value={doneCount} hint="com histórico preservado" />
        <MetricCard icon={Lightbulb} label="Lições" value={summary?.lessonCount ?? 0} hint="aprendizados registrados" />
      </section>

      <section className="projects-layout">
        <div className="projects-main">
          <div className="projects-toolbar">
            <label className="projects-search">
              <Search size={16} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por projeto, responsável ou seção..."
              />
            </label>

            <div className="projects-filters" aria-label="Filtrar por status">
              {filterOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={filter === item.value ? 'projects-filter projects-filter--active' : 'projects-filter'}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="projects-empty">
              <FolderKanban size={34} aria-hidden="true" />
              <strong>Carregando projetos...</strong>
            </div>
          ) : projects.length === 0 ? (
            <div className="projects-empty">
              <FolderKanban size={34} aria-hidden="true" />
              <strong>Nenhum projeto encontrado</strong>
              <span>Tente mudar o filtro ou buscar por outro termo.</span>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map((project) => (
                <Link key={project.id} to={`/projects/${project.slug}`} className="project-card">
                  <div className="project-card__top">
                    <span className="project-card__avatar">
                      {project.name
                        .split(' ')
                        .map((word) => word[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </span>
                    <StatusBadge status={project.status} />
                  </div>

                  <div className="project-card__body">
                    <h2>{project.name}</h2>
                    <p>{project.description}</p>
                  </div>

                  <div className="project-card__meta">
                    <span>
                      <UserRound size={14} aria-hidden="true" />
                      {project.responsible}
                    </span>
                    <span>
                      <Calendar size={14} aria-hidden="true" />
                      Atualizado em {formatDateBR(project.updatedAt)}
                    </span>
                  </div>

                  {(project.tags?.length ?? 0) > 0 && (
                    <div className="project-card__footer">
                      <span>{(project.tags ?? []).slice(0, 3).map((tag) => `#${tag}`).join(' ')}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="projects-aside" aria-label="Atividade recente">
          <div className="projects-aside__header">
            <span className="eyebrow">atividade</span>
            <h2>Últimas mudanças</h2>
          </div>

          <ul className="projects-timeline">
            {updates.map((update) => (
              <li key={update.id}>
                <Link to={`/projects/${update.projectSlug}`}>
                  <span>{formatDateBR(update.at)}</span>
                  <strong>{update.action}</strong>
                  <small>
                    {update.projectName} · {update.target}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof FolderKanban
  label: string
  value: number
  hint: string
}) {
  return (
    <article className="projects-metric">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{hint}</p>
      </div>
      <Icon size={20} aria-hidden="true" />
    </article>
  )
}

export default ProjectsPage
