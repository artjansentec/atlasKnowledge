import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Calendar, FolderKanban, Lightbulb, Search } from 'lucide-react'
import { formatDateBR } from '../lib/date'
import { projects } from '../lib/projects'
import './css/lessons.css'

function LessonsPage() {
  const [query, setQuery] = useState('')

  useEffect(() => {
    document.title = 'Lições · Atlas Knowledge'
  }, [])

  const lessons = useMemo(
    () =>
      projects.flatMap((project) => project.lessons.map((lesson) => ({ ...lesson, project }))),
    [],
  )

  const visibleLessons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return lessons
      .filter(({ title, description, recommendation, tags, project }) => {
        if (!normalizedQuery) return true

        return [title, description, recommendation, tags?.join(' '), project.name, project.description, project.responsible]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      })
      .sort((a, b) => b.project.updatedAt.localeCompare(a.project.updatedAt))
  }, [lessons, query])

  return (
    <div className="lessons-page">
      <section className="lessons-hero">
        <div>
          <div className="eyebrow eyebrow--accent">// lições aprendidas</div>
          <h1>Sabedoria acumulada</h1>
          <p>
            Consulte aprendizados registrados nos projetos para orientar decisões, reduzir
            retrabalho e acelerar novas entregas.
          </p>
        </div>

        <div className="lessons-hero__summary" aria-label="Resumo das lições">
          <Lightbulb size={18} aria-hidden="true" />
          <strong>{visibleLessons.length}</strong>
          <span>
            {visibleLessons.length === 1 ? 'lição encontrada' : 'lições encontradas'} em{' '}
            {projects.length} projetos
          </span>
        </div>
      </section>

      <section className="lessons-toolbar" aria-label="Filtros de lições">
        <label className="lessons-search">
          <Search size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar por lição, projeto, responsável..."
          />
        </label>
      </section>

      {visibleLessons.length === 0 ? (
        <section className="lessons-empty">
          <Lightbulb size={34} aria-hidden="true" />
          <strong>Nenhuma lição encontrada</strong>
          <span>Tente buscar por outro termo ou revise os projetos cadastrados.</span>
        </section>
      ) : (
        <section className="lessons-list" aria-label="Lista de lições aprendidas">
          {visibleLessons.map(({ id, title, description, recommendation, createdAt, tags, project }) => (
            <Link
              key={id}
              to={`/projects/${project.slug}`}
              className="lesson-card"
              data-ai-lesson-id={id}
              data-ai-tags={tags?.join(',') ?? ''}
            >
              <div className="lesson-card__icon">
                <Lightbulb size={20} aria-hidden="true" />
              </div>

              <div className="lesson-card__content">
                <div className="lesson-card__header">
                  <h2>{title}</h2>
                  <span>
                    <Calendar size={14} aria-hidden="true" />
                    {formatDateBR(createdAt)}
                  </span>
                </div>

                <div className="lesson-card__project">
                  <FolderKanban size={14} aria-hidden="true" />
                  {project.name}
                </div>

                <p>{description}</p>

                {Boolean(tags?.length) && (
                  <div className="lesson-card__tags" aria-label="Tags da lição">
                    {tags?.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                )}

                <div className="lesson-card__recommendation">
                  <span>Recomendação</span>
                  {recommendation}
                </div>
              </div>

              <ArrowUpRight className="lesson-card__arrow" size={17} aria-hidden="true" />
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}

export default LessonsPage
