import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, Clock3, FileText, FolderKanban, Lightbulb, Search } from 'lucide-react'
import { flattenSections, projects } from '../lib/projects'
import './css/search.css'

type SearchResultType = 'project' | 'section' | 'lesson' | 'update'

type SearchResult = {
  id: string
  type: SearchResultType
  title: string
  snippet: string
  meta: string
  projectSlug: string
  projectName: string
}

const tabs = [
  { id: 'all', label: 'Tudo', icon: Search },
  { id: 'project', label: 'Projetos', icon: FolderKanban },
  { id: 'section', label: 'Seções', icon: FileText },
  { id: 'lesson', label: 'Lições', icon: Lightbulb },
  { id: 'update', label: 'Atualizações', icon: Clock3 },
] as const

const typeLabels: Record<SearchResultType, string> = {
  project: 'Projeto',
  section: 'Seção',
  lesson: 'Lição',
  update: 'Atualização',
}

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('all')

  useEffect(() => {
    document.title = 'Busca · Atlas Knowledge'
  }, [])

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const results = useMemo(() => buildSearchResults(query), [query])
  const visibleResults = tab === 'all' ? results : results.filter((result) => result.type === tab)

  const counts = useMemo(
    () => ({
      all: results.length,
      project: results.filter((result) => result.type === 'project').length,
      section: results.filter((result) => result.type === 'section').length,
      lesson: results.filter((result) => result.type === 'lesson').length,
      update: results.filter((result) => result.type === 'update').length,
    }),
    [results],
  )

  function handleQueryChange(value: string) {
    setQuery(value)

    const nextQuery = value.trim()
    if (nextQuery) {
      setSearchParams({ q: nextQuery }, { replace: true })
      return
    }

    setSearchParams({}, { replace: true })
  }

  return (
    <div className="search-page">
      <section className="search-hero">
        <div>
          <div className="eyebrow eyebrow--accent">// busca global</div>
          <h1>Encontre qualquer coisa</h1>
          <p>
            Pesquise projetos, seções, lições aprendidas e atualizações registradas no Atlas
            Knowledge.
          </p>
        </div>

        <div className="search-hero__summary" aria-label="Resumo da busca">
          <Search size={18} aria-hidden="true" />
          <strong>{counts.all}</strong>
          <span>{counts.all === 1 ? 'resultado encontrado' : 'resultados encontrados'}</span>
        </div>
      </section>

      <section className="search-panel" aria-label="Busca global">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Buscar projetos, documentos, lições e atualizações..."
          />
        </label>

        <div className="search-tabs" aria-label="Filtrar resultados por tipo">
          {tabs.map((item) => {
            const Icon = item.icon
            const active = tab === item.id

            return (
              <button
                key={item.id}
                type="button"
                className={active ? 'search-tab search-tab--active' : 'search-tab'}
                onClick={() => setTab(item.id)}
              >
                <Icon size={15} aria-hidden="true" />
                {item.label}
                <span>{counts[item.id]}</span>
              </button>
            )
          })}
        </div>
      </section>

      {!query.trim() ? (
        <section className="search-empty">
          <Search size={34} aria-hidden="true" />
          <strong>Digite para começar a busca</strong>
          <span>Use termos de projetos, responsáveis, seções, lições ou histórico.</span>
        </section>
      ) : visibleResults.length === 0 ? (
        <section className="search-empty">
          <Search size={34} aria-hidden="true" />
          <strong>Nenhum resultado encontrado</strong>
          <span>
            Não encontramos nada para <code>{query}</code>. Tente buscar por outro termo.
          </span>
        </section>
      ) : (
        <section className="search-results" aria-label="Resultados da busca">
          {visibleResults.map((result) => (
            <Link key={result.id} to={`/projects/${result.projectSlug}`} className="search-result">
              <ResultIcon type={result.type} />

              <div className="search-result__content">
                <div className="search-result__meta">
                  <span>{typeLabels[result.type]}</span>
                  <small>{result.projectName}</small>
                </div>
                <h2>{result.title}</h2>
                <p>{result.snippet}</p>
                <small>{result.meta}</small>
              </div>

              <ArrowUpRight className="search-result__arrow" size={17} aria-hidden="true" />
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}

function buildSearchResults(query: string): SearchResult[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []

  return projects
    .flatMap((project) => {
      const projectResults: SearchResult[] = [
        {
          id: `${project.id}-project`,
          type: 'project',
          title: project.name,
          snippet: project.description,
          meta: `Responsável: ${project.responsible} · Atualizado em ${project.updatedAt}`,
          projectSlug: project.slug,
          projectName: project.name,
        },
      ]

      const sections = flattenSections(project.sections)

      const sectionResults = sections.map<SearchResult>(({ section }) => ({
        id: `${project.id}-section-${section.id}`,
        type: 'section',
        title: section.title,
        snippet: section.content,
        meta: `${sections.length} seções no projeto`,
        projectSlug: project.slug,
        projectName: project.name,
      }))

      const lessonResults = project.lessons.map<SearchResult>((lesson) => ({
        id: `${project.id}-lesson-${lesson.id}`,
        type: 'lesson',
        title: lesson.title,
        snippet: lesson.description,
        meta: `Lição aprendida · ${project.responsible}`,
        projectSlug: project.slug,
        projectName: project.name,
      }))

      const updateResults = project.history.map<SearchResult>((history) => ({
        id: `${project.id}-update-${history.id}`,
        type: 'update',
        title: history.action,
        snippet: `Atualização em ${history.target}.`,
        meta: history.at,
        projectSlug: project.slug,
        projectName: project.name,
      }))

      return [...projectResults, ...sectionResults, ...lessonResults, ...updateResults]
    })
    .filter((result) =>
      [result.title, result.snippet, result.meta, result.projectName].join(' ').toLowerCase().includes(normalizedQuery),
    )
}

function ResultIcon({ type }: { type: SearchResultType }) {
  const map: Record<SearchResultType, { icon: typeof FileText; className: string }> = {
    project: { icon: FolderKanban, className: 'search-result__icon--project' },
    section: { icon: FileText, className: 'search-result__icon--section' },
    lesson: { icon: Lightbulb, className: 'search-result__icon--lesson' },
    update: { icon: Clock3, className: 'search-result__icon--update' },
  }
  const { icon: Icon, className } = map[type]

  return (
    <div className={`search-result__icon ${className}`}>
      <Icon size={20} aria-hidden="true" />
    </div>
  )
}

export default SearchPage
