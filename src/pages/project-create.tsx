import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  FileText,
  FolderKanban,
  Save,
  Sparkles,
  Tag,
  UserRound,
} from 'lucide-react'
import { MarkdownView } from '../components/markdown-view'
import { statusLabels, type ProjectStatus } from '../lib/projects'
import './css/project-create.css'

type NewProjectDraft = {
  name: string
  slug: string
  description: string
  status: ProjectStatus
  responsible: string
  client: string
  tags: string
  tech: string
  sectionTitle: string
  sectionContent: string
}

const initialDraft: NewProjectDraft = {
  name: '',
  slug: '',
  description: '',
  status: 'active',
  responsible: '',
  client: '',
  tags: '',
  tech: '',
  sectionTitle: 'Visão geral',
  sectionContent:
    '# Visão geral\n\nDescreva o contexto do projeto, objetivos principais e decisões já conhecidas.\n\n## Próximos passos\n\n- Registrar responsáveis.\n- Adicionar anexos importantes.\n- Documentar lições aprendidas.',
}

function ProjectCreatePage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState(initialDraft)
  const [slugTouched, setSlugTouched] = useState(false)

  useEffect(() => {
    document.title = 'Novo projeto · Atlas Knowledge'
  }, [])

  const tags = useMemo(() => splitList(draft.tags), [draft.tags])
  const tech = useMemo(() => splitList(draft.tech), [draft.tech])
  const previewName = draft.name.trim() || 'Novo projeto'
  const previewSlug = draft.slug.trim() || slugify(previewName)

  function updateDraft<Key extends keyof NewProjectDraft>(key: Key, value: NewProjectDraft[Key]) {
    setDraft((current) => {
      const next = { ...current, [key]: value }

      if (key === 'name' && !slugTouched) {
        next.slug = slugify(String(value))
      }

      return next
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const now = new Date().toISOString().slice(0, 10)
    const project = {
      id: `local-${Date.now()}`,
      slug: previewSlug,
      name: previewName,
      description: draft.description.trim(),
      status: draft.status,
      responsible: draft.responsible.trim(),
      client: draft.client.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      tags,
      tech,
      attachments: [],
      lessons: [],
      sections: [
        {
          id: slugify(draft.sectionTitle || 'visao-geral'),
          title: draft.sectionTitle.trim() || 'Visão geral',
          content: draft.sectionContent,
        },
      ],
      history: [
        {
          id: `history-${Date.now()}`,
          at: now,
          author: draft.responsible.trim(),
          action: 'Criou o projeto',
          target: draft.sectionTitle.trim() || 'Visão geral',
        },
      ],
    }

    localStorage.setItem('atlas:last-created-project', JSON.stringify(project))
    sessionStorage.setItem('atlas:project-created', previewName)
    navigate('/projects')
  }

  return (
    <div className="project-create-page">
      <div className="project-create">
        <div className="project-create__breadcrumb">
          <Link to="/projects">
            <ArrowLeft size={15} aria-hidden="true" />
            Projetos
          </Link>
          <ArrowRight size={14} aria-hidden="true" />
          <span>Novo projeto</span>
        </div>

        <header className="project-create__hero">
          <div>
            <div className="eyebrow eyebrow--accent">// novo projeto</div>
            <h1>Crie a base de conhecimento do projeto</h1>
            <p>
              Registre as informações essenciais, responsável e primeira seção de documentação para
              iniciar a wiki do projeto.
            </p>
          </div>
        </header>

        <form className="project-create__layout" onSubmit={handleSubmit}>
          <section className="project-create__form-card" aria-label="Dados do projeto">
            <div className="project-create__section-header">
              <FolderKanban size={17} aria-hidden="true" />
              <div>
                <h2>Informações gerais</h2>
                <p>Defina identificação, contexto e responsáveis.</p>
              </div>
            </div>

            <div className="project-create__grid">
              <label className="project-create__field project-create__field--wide">
                <span>Nome do projeto</span>
                <input
                  value={draft.name}
                  onChange={(event) => updateDraft('name', event.target.value)}
                  placeholder="Ex: Portal do Cliente"
                  required
                />
              </label>

              <label className="project-create__field">
                <span>Slug</span>
                <input
                  value={draft.slug}
                  onChange={(event) => {
                    setSlugTouched(true)
                    updateDraft('slug', slugify(event.target.value))
                  }}
                  placeholder="portal-cliente"
                  required
                />
              </label>

              <label className="project-create__field">
                <span>Status</span>
                <select
                  value={draft.status}
                  onChange={(event) => updateDraft('status', event.target.value as ProjectStatus)}
                >
                  {(Object.keys(statusLabels) as ProjectStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="project-create__field project-create__field--wide">
                <span>Descrição</span>
                <textarea
                  value={draft.description}
                  onChange={(event) => updateDraft('description', event.target.value)}
                  placeholder="Resumo curto do objetivo e escopo do projeto."
                  rows={4}
                  required
                />
              </label>

              <label className="project-create__field">
                <span>Responsável</span>
                <input
                  value={draft.responsible}
                  onChange={(event) => updateDraft('responsible', event.target.value)}
                  placeholder="Nome da pessoa responsável"
                  required
                />
              </label>

              <label className="project-create__field">
                <span>Cliente ou área</span>
                <input
                  value={draft.client}
                  onChange={(event) => updateDraft('client', event.target.value)}
                  placeholder="Ex: Operações internas"
                />
              </label>

              <label className="project-create__field">
                <span>Tags</span>
                <input
                  value={draft.tags}
                  onChange={(event) => updateDraft('tags', event.target.value)}
                  placeholder="wiki, onboarding, produto"
                />
              </label>

              <label className="project-create__field">
                <span>Tecnologias</span>
                <input
                  value={draft.tech}
                  onChange={(event) => updateDraft('tech', event.target.value)}
                  placeholder="React, Node.js, PostgreSQL"
                />
              </label>
            </div>
          </section>

          <section className="project-create__form-card" aria-label="Documentação inicial">
            <div className="project-create__section-header">
              <FileText size={17} aria-hidden="true" />
              <div>
                <h2>Documentação inicial</h2>
                <p>Comece com a primeira seção do projeto em Markdown.</p>
              </div>
            </div>

            <div className="project-create__grid">
              <label className="project-create__field project-create__field--wide">
                <span>Título da seção</span>
                <input
                  value={draft.sectionTitle}
                  onChange={(event) => updateDraft('sectionTitle', event.target.value)}
                  required
                />
              </label>

              <label className="project-create__field project-create__field--wide">
                <span>Conteúdo Markdown</span>
                <textarea
                  className="project-create__markdown"
                  value={draft.sectionContent}
                  onChange={(event) => updateDraft('sectionContent', event.target.value)}
                  rows={12}
                  required
                />
              </label>
            </div>

            <div className="project-create__actions">
              <Link to="/projects" className="project-create__secondary-action">
                Cancelar
              </Link>
              <button type="submit" className="project-create__primary-action">
                <Save size={16} aria-hidden="true" />
                Criar projeto
              </button>
            </div>
          </section>

          <aside className="project-create__preview" aria-label="Prévia do novo projeto">
            <div className="project-create__preview-card">
              <div className="project-create__preview-top">
                <div className="project-create__avatar">
                  {previewName
                    .split(' ')
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <span className={`project-create__status project-create__status--${draft.status}`}>
                  {statusLabels[draft.status]}
                </span>
              </div>

              <h2>{previewName}</h2>
              <p>{draft.description || 'A descrição do projeto aparecerá aqui.'}</p>

              <dl className="project-create__preview-info">
                <div>
                  <dt>
                    <UserRound size={14} aria-hidden="true" />
                    Responsável
                  </dt>
                  <dd>{draft.responsible || 'Não definido'}</dd>
                </div>
                <div>
                  <dt>
                    <Calendar size={14} aria-hidden="true" />
                    Slug
                  </dt>
                  <dd>{previewSlug}</dd>
                </div>
              </dl>

              <TagGroup icon={Tag} label="Tags" values={tags} fallback="Sem tags ainda" />
              <TagGroup icon={Sparkles} label="Tecnologias" values={tech} fallback="Sem tecnologias ainda" featured />
            </div>

            <div className="project-create__preview-card">
              <div className="project-create__preview-heading">
                <FileText size={15} aria-hidden="true" />
                Preview da seção
              </div>
              <MarkdownView content={draft.sectionContent} />
            </div>
          </aside>
        </form>
      </div>
    </div>
  )
}

function TagGroup({
  icon: Icon,
  label,
  values,
  fallback,
  featured = false,
}: {
  icon: typeof Tag
  label: string
  values: string[]
  fallback: string
  featured?: boolean
}) {
  return (
    <div className="project-create__tag-group">
      <div>
        <Icon size={14} aria-hidden="true" />
        {label}
      </div>
      {values.length ? (
        <div className="project-create__tags">
          {values.map((value) => (
            <span
              key={value}
              className={featured ? 'project-create__tag project-create__tag--featured' : 'project-create__tag'}
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  )
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default ProjectCreatePage
