import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, Clock3, FileText, FolderKanban, Lightbulb, Search } from 'lucide-react'
import {
  emptySearchResponse,
  getSearchCounts,
  normalizeSearchResponse,
  searchGlobal,
  type SearchResponse,
  type SearchResultItem,
} from '../lib/projects-api'
import './css/search.css'

type SearchResultType = SearchResultItem['type']
type SearchTab = 'all' | SearchResultType

const tabs = [
  { id: 'all', label: 'Tudo', icon: Search },
  { id: 'project', label: 'Projetos', icon: FolderKanban },
  { id: 'section', label: 'Seções', icon: FileText },
  { id: 'lesson', label: 'Lições', icon: Lightbulb },
  { id: 'update', label: 'Atualizações', icon: Clock3 },
] as const satisfies ReadonlyArray<{ id: SearchTab; label: string; icon: typeof Search }>

const typeLabels: Record<SearchResultType, string> = {
  project: 'Projeto',
  section: 'Seção',
  lesson: 'Lição',
  update: 'Atualização',
}

const tabResultKey: Record<Exclude<SearchTab, 'all'>, keyof SearchResponse> = {
  project: 'projects',
  section: 'sections',
  lesson: 'lessons',
  update: 'updates',
}

const resultGroups: Array<{ id: SearchResultType; label: string; key: keyof SearchResponse }> = [
  { id: 'project', label: 'Projetos', key: 'projects' },
  { id: 'section', label: 'Seções', key: 'sections' },
  { id: 'lesson', label: 'Lições', key: 'lessons' },
  { id: 'update', label: 'Atualizações', key: 'updates' },
]

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [tab, setTab] = useState<SearchTab>('all')
  const [results, setResults] = useState<SearchResponse>(emptySearchResponse)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Busca · Atlas Knowledge'
  }, [])

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      setResults(emptySearchResponse())
      setError(null)
      return
    }

    let cancelled = false
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await searchGlobal(normalizedQuery)
        if (!cancelled) setResults(normalizeSearchResponse(response))
      } catch (err) {
        if (!cancelled) {
          setResults(emptySearchResponse())
          setError(err instanceof Error ? err.message : 'Falha ao buscar')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [query])

  const counts = useMemo(() => getSearchCounts(results), [results])

  const visibleResults = useMemo(() => {
    if (tab === 'all') return null
    return results[tabResultKey[tab]]
  }, [results, tab])

  const groupedResults = useMemo(
    () =>
      resultGroups
        .map((group) => ({
          ...group,
          items: results[group.key],
        }))
        .filter((group) => group.items.length > 0),
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

  const hasResults = counts.all > 0

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
      ) : loading ? (
        <section className="search-empty">
          <Search size={34} aria-hidden="true" />
          <strong>Buscando...</strong>
        </section>
      ) : error ? (
        <section className="search-empty">
          <Search size={34} aria-hidden="true" />
          <strong>Erro na busca</strong>
          <span>{error}</span>
        </section>
      ) : !hasResults ? (
        <section className="search-empty">
          <Search size={34} aria-hidden="true" />
          <strong>Nenhum resultado encontrado</strong>
          <span>
            Não encontramos nada para <code>{query}</code>. Tente buscar por outro termo.
          </span>
        </section>
      ) : tab === 'all' ? (
        <div className="search-results-stack" aria-label="Resultados da busca">
          {groupedResults.map((group) => (
            <section key={group.id} className="search-results-group" aria-label={group.label}>
              <header className="search-results-group__header">
                <h2>{group.label}</h2>
                <span>{group.items.length}</span>
              </header>

              <div className="search-results">
                {group.items.map((result) => (
                  <SearchResultCard key={result.id} result={result} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="search-results" aria-label="Resultados da busca">
          {visibleResults?.map((result) => <SearchResultCard key={result.id} result={result} />)}
        </section>
      )}
    </div>
  )
}

function SearchResultCard({ result }: { result: SearchResultItem }) {
  return (
    <Link to={result.href} className="search-result">
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
