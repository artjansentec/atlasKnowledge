import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  History,
  Lightbulb,
  Maximize2,
  Minimize2,
  Paperclip,
  PencilLine,
  Plus,
  Save,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { MarkdownView } from '../components/markdown-view'
import { StatusBadge } from '../components/status-badge'
import { flattenSections, getProject, type Project, type Section } from '../lib/projects'
import './css/project-detail.css'

type Tab = 'doc' | 'files' | 'lessons' | 'history'

function ProjectDetailPage() {
  const { slug } = useParams()
  const project = getProject(slug)
  const [tab, setTab] = useState<Tab>('doc')
  const [activeId, setActiveId] = useState(project?.sections[0]?.id ?? '')
  const [fullscreen, setFullscreen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project?.sections[0]?.content ?? '')
  const [savedDrafts, setSavedDrafts] = useState<Record<string, string>>({})

  const flatSections = project ? flattenSections(project.sections) : []
  const active = flatSections.find((item) => item.section.id === activeId)?.section ?? project?.sections[0]
  const activeContent = active ? (savedDrafts[active.id] ?? active.content) : ''

  useEffect(() => {
    if (project) document.title = `${project.name} · Atlas Knowledge`
  }, [project])

  useEffect(() => {
    const firstSection = project?.sections[0]
    setActiveId(firstSection?.id ?? '')
    setDraft(firstSection?.content ?? '')
    setEditing(false)
  }, [project])

  if (!project) return <Navigate to="/projects" replace />

  function selectSection(id: string) {
    const section = flatSections.find((item) => item.section.id === id)?.section
    setActiveId(id)
    setDraft(section ? (savedDrafts[section.id] ?? section.content) : '')
    setEditing(false)
  }

  function saveDraft() {
    if (!active) return
    setSavedDrafts((current) => ({ ...current, [active.id]: draft }))
    setEditing(false)
  }

  function cancelEditing() {
    setDraft(activeContent)
    setEditing(false)
  }

  return (
    <div className="project-detail-page">
      <div className="project-detail">
        <div className="project-detail__breadcrumb">
          <Link to="/projects">
            <ArrowLeft size={15} aria-hidden="true" />
            Projetos
          </Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span>{project.name}</span>
        </div>

        <header className="project-detail__hero">
          <div>
            <div className="project-detail__title">
              <h1>{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p>{project.description}</p>
          </div>
        </header>

        <nav className="project-detail__tabs" aria-label="Conteúdo do projeto">
          {[
            { id: 'doc' as const, label: 'Documentação', icon: FileText },
            { id: 'files' as const, label: `Arquivos (${project.attachments.length})`, icon: Paperclip },
            { id: 'lessons' as const, label: `Lições (${project.lessons.length})`, icon: Lightbulb },
            { id: 'history' as const, label: 'Histórico', icon: History },
          ].map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? 'project-detail__tab project-detail__tab--active' : 'project-detail__tab'}
                onClick={() => setTab(item.id)}
              >
                <Icon size={16} aria-hidden="true" />
                {item.label}
              </button>
            )
          })}
        </nav>

        {tab === 'doc' && (
          <DocView
            project={project}
            sections={project.sections}
            activeId={activeId}
            active={active}
            activeContent={activeContent}
            draft={draft}
            editing={editing}
            fullscreen={fullscreen}
            onCancel={cancelEditing}
            onDraftChange={setDraft}
            onSave={saveDraft}
            onSelect={selectSection}
            setEditing={setEditing}
            setFullscreen={setFullscreen}
          />
        )}
        {tab === 'files' && <FilesView project={project} />}
        {tab === 'lessons' && <LessonsView project={project} />}
        {tab === 'history' && <HistoryView project={project} />}
      </div>
    </div>
  )
}

function DocView({
  project,
  sections,
  activeId,
  active,
  activeContent,
  draft,
  editing,
  fullscreen,
  onCancel,
  onDraftChange,
  onSave,
  onSelect,
  setEditing,
  setFullscreen,
}: {
  project: Project
  sections: Section[]
  activeId: string
  active: Section | undefined
  activeContent: string
  draft: string
  editing: boolean
  fullscreen: boolean
  onCancel: () => void
  onDraftChange: (value: string) => void
  onSave: () => void
  onSelect: (id: string) => void
  setEditing: (value: boolean) => void
  setFullscreen: (value: boolean) => void
}) {
  if (fullscreen) {
    return (
      <div className="project-reader">
        <div className="project-reader__bar">
          <div className="project-reader__title">
            {project.name} · {active?.title}
          </div>
          <button type="button" className="project-detail__ghost-btn" onClick={() => setFullscreen(false)}>
            <Minimize2 size={15} aria-hidden="true" />
            Sair da leitura
          </button>
        </div>
        <article className="project-reader__content">
          <MarkdownView content={activeContent} />
        </article>
      </div>
    )
  }

  return (
    <section className="project-doc-layout">
      <aside className="project-sections-card">
        <div className="project-detail__panel-title">
          <span>Seções</span>
          <button type="button" aria-label="Adicionar seção">
            <Plus size={15} aria-hidden="true" />
          </button>
        </div>
        <SectionTree sections={sections} activeId={activeId} onSelect={onSelect} />
      </aside>

      <article className="project-document-card">
        <div className="project-document-card__toolbar">
          <div>
            <FileText size={16} aria-hidden="true" />
            <span>{active?.title}</span>
          </div>
          <div className="project-document-card__actions">
            <div className="project-view-toggle">
              <button
                type="button"
                className={!editing ? 'project-view-toggle__item project-view-toggle__item--active' : 'project-view-toggle__item'}
                onClick={() => setEditing(false)}
              >
                <Eye size={14} aria-hidden="true" />
                Ler
              </button>
              <button
                type="button"
                className={editing ? 'project-view-toggle__item project-view-toggle__item--active' : 'project-view-toggle__item'}
                onClick={() => setEditing(true)}
              >
                <PencilLine size={14} aria-hidden="true" />
                Editar
              </button>
            </div>
            <button type="button" className="project-detail__ghost-btn" onClick={() => setFullscreen(true)}>
              <Maximize2 size={14} aria-hidden="true" />
              Tela cheia
            </button>
          </div>
        </div>

        {editing ? (
          <div className="project-editor">
            <div className="project-editor__pane">
              <div className="project-editor__label">Markdown</div>
              <textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                spellCheck={false}
                aria-label="Editar documentação em Markdown"
              />
              <div className="project-editor__footer">
                <button type="button" className="project-detail__ghost-btn" onClick={onCancel}>
                  <X size={14} aria-hidden="true" />
                  Cancelar
                </button>
                <button type="button" className="project-detail__primary-btn" onClick={onSave}>
                  <Save size={14} aria-hidden="true" />
                  Salvar
                </button>
              </div>
            </div>
            <div className="project-editor__pane">
              <div className="project-editor__label">Preview</div>
              <div className="project-editor__preview">
                <MarkdownView content={draft} />
              </div>
            </div>
          </div>
        ) : (
          <div className="project-document-card__content">
            <MarkdownView content={activeContent} />
          </div>
        )}
      </article>

      <aside className="project-detail__aside">
        <ProjectInfo project={project} />
        <RelatedFiles project={project} />
        <RelatedLessons project={project} />
      </aside>
    </section>
  )
}

function SectionTree({
  sections,
  activeId,
  onSelect,
  depth = 0,
}: {
  sections: Section[]
  activeId: string
  onSelect: (id: string) => void
  depth?: number
}) {
  return (
    <ul className="project-section-tree">
      {sections.map((section) => (
        <SectionItem
          key={section.id}
          activeId={activeId}
          depth={depth}
          onSelect={onSelect}
          section={section}
        />
      ))}
    </ul>
  )
}

function SectionItem({
  section,
  activeId,
  onSelect,
  depth,
}: {
  section: Section
  activeId: string
  onSelect: (id: string) => void
  depth: number
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = Boolean(section.children?.length)
  const active = activeId === section.id

  return (
    <li>
      <div
        className={active ? 'project-section-tree__row project-section-tree__row--active' : 'project-section-tree__row'}
        style={{ paddingLeft: depth * 14 + 8 }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? 'Recolher seção' : 'Expandir seção'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
          </button>
        ) : (
          <span className="project-section-tree__dot" aria-hidden="true" />
        )}
        <button type="button" onClick={() => onSelect(section.id)}>
          {section.title}
        </button>
      </div>
      {hasChildren && open && (
        <SectionTree sections={section.children ?? []} activeId={activeId} onSelect={onSelect} depth={depth + 1} />
      )}
    </li>
  )
}

function ProjectInfo({ project }: { project: Project }) {
  return (
    <div className="project-detail__card">
      <div className="project-detail__panel-title">Informações</div>
      <dl className="project-detail__info">
        <InfoRow icon={Users} label="Responsável" value={project.responsible} />
        {project.client && <InfoRow icon={Users} label="Cliente" value={project.client} />}
        <InfoRow icon={Calendar} label="Criado em" value={project.createdAt} />
        <InfoRow icon={Calendar} label="Atualizado" value={project.updatedAt} />
      </dl>
      <TagList icon={Tag} label="Tags" values={project.tags} />
      {project.tech && <TagList icon={FileCode} label="Tecnologias" values={project.tech} featured />}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <div>
      <dt>
        <Icon size={14} aria-hidden="true" />
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  )
}

function TagList({
  icon: Icon,
  label,
  values,
  featured = false,
}: {
  icon: typeof Tag
  label: string
  values: string[]
  featured?: boolean
}) {
  return (
    <div className="project-detail__tag-block">
      <div>
        <Icon size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="project-detail__tags">
        {values.map((value) => (
          <span key={value} className={featured ? 'project-detail__tag project-detail__tag--featured' : 'project-detail__tag'}>
            {value}
          </span>
        ))}
      </div>
    </div>
  )
}

function RelatedFiles({ project }: { project: Project }) {
  if (!project.attachments.length) return null

  return (
    <div className="project-detail__card">
      <div className="project-detail__panel-title">Arquivos</div>
      <ul className="project-related-list">
        {project.attachments.slice(0, 4).map((attachment) => (
          <li key={attachment.id}>
            <FileIcon type={attachment.type} />
            <div>
              <strong>{attachment.name}</strong>
              <span>
                {attachment.type.toUpperCase()} · {attachment.size}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RelatedLessons({ project }: { project: Project }) {
  if (!project.lessons.length) return null

  return (
    <div className="project-detail__card">
      <div className="project-detail__panel-title">
        <Lightbulb size={15} aria-hidden="true" />
        Lições
      </div>
      <ul className="project-detail__lessons">
        {project.lessons.slice(0, 3).map((lesson) => (
          <li key={lesson.id}>
            <strong>{lesson.title}</strong>
            <span>{lesson.description}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FileIcon({ type }: { type: string }) {
  const map: Record<string, typeof FileText> = {
    docx: FileText,
    jpg: FileImage,
    md: FileCode,
    pdf: FileType2,
    png: FileImage,
    xlsx: FileSpreadsheet,
  }
  const Icon = map[type] ?? FileText

  return (
    <span className={`project-file-icon project-file-icon--${type}`}>
      <Icon size={17} aria-hidden="true" />
    </span>
  )
}

function FilesView({ project }: { project: Project }) {
  return (
    <section className="project-tab-panel">
      <div className="project-tab-panel__header">
        <h2>Arquivos do projeto</h2>
        <button type="button" className="project-detail__primary-btn">
          <Plus size={16} aria-hidden="true" />
          Enviar arquivo
        </button>
      </div>
      {project.attachments.length === 0 ? (
        <EmptyState icon={Paperclip} text="Nenhum arquivo anexado." />
      ) : (
        <div className="project-files-grid">
          {project.attachments.map((attachment) => (
            <article key={attachment.id} className="project-file-card">
              <FileIcon type={attachment.type} />
              <div>
                <h3>{attachment.name}</h3>
                <span>
                  {attachment.type.toUpperCase()} · {attachment.size}
                </span>
                <p>Enviado em {attachment.uploadedAt}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function LessonsView({ project }: { project: Project }) {
  return (
    <section className="project-lessons-panel">
      <div className="project-lessons-panel__actions">
        <button type="button" className="project-detail__primary-btn">
          <Plus size={16} aria-hidden="true" />
          Nova lição
        </button>
      </div>
      {project.lessons.length === 0 ? (
        <EmptyState icon={Lightbulb} text="Nenhuma lição registrada ainda." />
      ) : (
        project.lessons.map((lesson) => (
          <article key={lesson.id} className="project-lesson-card">
            <div className="project-lesson-card__icon">
              <Lightbulb size={20} aria-hidden="true" />
            </div>
            <div>
              <header>
                <h2>{lesson.title}</h2>
                <span>{lesson.createdAt}</span>
              </header>
              <p>{lesson.description}</p>
              <div>
                <span>Recomendação</span>
                {lesson.recommendation}
              </div>
            </div>
          </article>
        ))
      )}
    </section>
  )
}

function HistoryView({ project }: { project: Project }) {
  return (
    <section className="project-history-panel">
      <ul>
        {project.history.map((history) => (
          <li key={history.id}>
            <span className="project-history-panel__avatar" aria-hidden="true">
              {history.author
                .split(' ')
                .map((word) => word[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div>
              <p>
                <strong>{history.author}</strong> <span>{history.action.toLowerCase()}</span>{' '}
                <em>{history.target}</em>
              </p>
              <time>{history.at}</time>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function EmptyState({ icon: Icon, text }: { icon: typeof Paperclip; text: string }) {
  return (
    <div className="project-empty-state">
      <Icon size={34} aria-hidden="true" />
      <span>{text}</span>
    </div>
  )
}

export default ProjectDetailPage
