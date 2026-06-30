import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, Calendar, Eye, FolderKanban, Lightbulb, Rocket, Search, Trophy } from 'lucide-react'
import { formatDateBR } from '../lib/date'
import { listAllLessons, type LessonWithProject } from '../lib/projects-api'
import { lessonTypeLabels, lessonTypeOptions, type ProjectLessonType } from '../lib/projects'
import './css/lessons.css'

const lessonTypeIcons: Record<ProjectLessonType, typeof Lightbulb> = {
  problem: AlertTriangle,
  attention: Eye,
  future: Rocket,
  success: Trophy,
}

function LessonTypeBadge({ type }: { type: ProjectLessonType }) {
  const Icon = lessonTypeIcons[type]

  return (
    <span className={`lesson-card__type lesson-card__type--${type}`}>
      <Icon size={13} aria-hidden="true" />
      {lessonTypeLabels[type]}
    </span>
  )
}

function LessonTypeIcon({ type, size }: { type: ProjectLessonType; size: number }) {
  const Icon = lessonTypeIcons[type]
  return <Icon size={size} aria-hidden="true" />
}

function LessonTypeGuide({
  selectedType,
  onSelectType,
}: {
  selectedType: ProjectLessonType | null
  onSelectType: (type: ProjectLessonType) => void
}) {
  return (
    <section className="lessons-status-guide" aria-label="Significado dos status de lição">
      <div>
        <span className="eyebrow eyebrow--accent">// guia de status</span>
        <h2>Como classificar uma lição?</h2>
      </div>

      <div className="lessons-status-guide__grid">
        {lessonTypeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`lessons-status-guide__item lessons-status-guide__item--${option.value}${
              selectedType === option.value ? ' lessons-status-guide__item--active' : ''
            }`}
            aria-pressed={selectedType === option.value}
            onClick={() => onSelectType(option.value)}
          >
            <span>
              <LessonTypeIcon type={option.value} size={16} />
            </span>
            <div>
              <strong>{option.label}</strong>
              <p>{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function LessonsPage() {
  const [query, setQuery] = useState('')
  const [selectedLessonType, setSelectedLessonType] = useState<ProjectLessonType | null>(null)
  const [lessons, setLessons] = useState<LessonWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [projectCount, setProjectCount] = useState(0)

  useEffect(() => {
    document.title = 'Lições · Atlas Knowledge'
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const data = await listAllLessons()
        if (cancelled) return
        setLessons(data)
        setProjectCount(new Set(data.map((lesson) => lesson.project.slug)).size)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const visibleLessons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return lessons
      .filter(({ title, description, recommendation, type, tags, project }) => {
        if (selectedLessonType && type !== selectedLessonType) return false
        if (!normalizedQuery) return true

        return [
          title,
          description,
          recommendation,
          lessonTypeLabels[type],
          tags?.join(' '),
          project.name,
          project.description,
          project.responsible,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      })
      .sort((a, b) => b.project.updatedAt.localeCompare(a.project.updatedAt))
  }, [lessons, query, selectedLessonType])

  function toggleLessonType(type: ProjectLessonType) {
    setSelectedLessonType((current) => (current === type ? null : type))
  }

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
            {projectCount} projetos
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

      <LessonTypeGuide selectedType={selectedLessonType} onSelectType={toggleLessonType} />

      {loading ? (
        <section className="lessons-empty">
          <Lightbulb size={34} aria-hidden="true" />
          <strong>Carregando lições...</strong>
        </section>
      ) : visibleLessons.length === 0 ? (
        <section className="lessons-empty">
          <Lightbulb size={34} aria-hidden="true" />
          <strong>Nenhuma lição encontrada</strong>
          <span>Tente buscar por outro termo ou revise os projetos cadastrados.</span>
        </section>
      ) : (
        <section className="lessons-list" aria-label="Lista de lições aprendidas">
          {visibleLessons.map(({ id, title, description, recommendation, type, createdAt, tags, project }) => (
            <Link
              key={id}
              to={`/projects/${project.slug}?tab=lessons`}
              className={`lesson-card lesson-card--${type}`}
              data-ai-lesson-id={id}
              data-ai-lesson-type={type}
              data-ai-tags={tags?.join(',') ?? ''}
            >
              <div className={`lesson-card__icon lesson-card__icon--${type}`}>
                <LessonTypeIcon type={type} size={20} />
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

                <LessonTypeBadge type={type} />

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
