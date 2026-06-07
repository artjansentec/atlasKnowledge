import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpen,
  Clock,
  FolderKanban,
  Lightbulb,
  TrendingUp,
} from 'lucide-react'
import { StatusBadge } from '../components/status-badge'
import { flattenSections, getProjectUpdates, projects } from '../lib/projects'
import './css/dashboard.css'

function DashboardPage() {
  useEffect(() => {
    document.title = 'Dashboard · Atlas Knowledge'
  }, [])

  const total = projects.length
  const active = projects.filter((project) => project.status === 'active').length
  const lessons = projects.reduce((count, project) => count + project.lessons.length, 0)
  const docs = projects.reduce((count, project) => count + flattenSections(project.sections).length, 0)
  const recent = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5)
  const updates = getProjectUpdates().slice(0, 6)

  const stats = [
    { label: 'Projetos', value: total, icon: FolderKanban, hint: `${active} ativos` },
    { label: 'Documentos', value: docs, icon: BookOpen, hint: 'seções no total' },
    { label: 'Lições', value: lessons, icon: Lightbulb, hint: 'aprendizados registrados' },
    { label: 'Atualizações', value: updates.length, icon: TrendingUp, hint: 'últimos 30 dias' },
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

        <Link to="/projects" className="dashboard-hero__action">
          Explorar projetos <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </section>

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
            <a href="/projects">ver todos →</a>
          </div>

          <ul className="project-list">
            {recent.map((project) => (
              <li key={project.id}>
                <a href={`/projects/${project.slug}`} className="project-row">
                  <span className="project-avatar">{project.name.slice(0, 2).toUpperCase()}</span>

                  <span className="project-row__body">
                    <span className="project-row__title">
                      <p>{project.name}</p>
                      <StatusBadge status={project.status} />
                    </span>
                    <span>{project.description}</span>
                  </span>

                  <span className="project-row__meta">
                    <span>{project.updatedAt}</span>
                    <span>{project.responsible}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel__header">
            <h2>Últimas atualizações</h2>
          </div>

          <ul className="updates-list">
            {updates.map((update) => (
              <li key={`${update.id}-${update.project.id}`}>
                <a href={`/projects/${update.project.slug}`} className="update-card">
                  <span className="update-card__date">
                    <Clock size={13} aria-hidden="true" />
                    {update.at}
                  </span>
                  <strong>{update.action}</strong>
                  <span>
                    {update.project.name} · {update.target}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  )
}

export default DashboardPage
