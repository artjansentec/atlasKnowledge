import { type FormEvent, type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material'
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
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
  Rocket,
  Save,
  Tag,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { confirmDanger, showToast } from '../components/app-alerts'
import { MarkdownView } from '../components/markdown-view'
import { StatusBadge } from '../components/status-badge'
import { canManageProject } from '../lib/auth'
import { formatDateBR } from '../lib/date'
import {
  flattenSections,
  getProject,
  lessonTypeLabels,
  lessonTypeOptions,
  type Project,
  type ProjectAttachment,
  type ProjectLesson,
  type ProjectLessonType,
  type ProjectStatus,
  type Section,
} from '../lib/projects'
import './css/project-detail.css'

type Tab = 'doc' | 'files' | 'lessons' | 'history'
type SectionCreationMode = 'section' | 'subsection'
type MoveDirection = 'up' | 'down'
type CarouselDirection = 'previous' | 'next'
type SectionOption = { id: string; title: string; depth: number }

const projectTabs: Tab[] = ['doc', 'files', 'lessons', 'history']
const responsibleOptions = ['Marina Alves', 'Rafael Costa', 'Bianca Souza', 'Lucas Lima', 'Camila Rocha', 'Pedro Nunes']
const emptyLessonDraft = {
  type: 'success' as ProjectLessonType,
  title: '',
  description: '',
  recommendation: '',
  tags: '',
}
const lessonTypeIcons: Record<ProjectLessonType, typeof Lightbulb> = {
  problem: AlertTriangle,
  attention: Eye,
  future: Rocket,
  success: Trophy,
}

function getTabFromSearchParams(searchParams: URLSearchParams): Tab {
  const tab = searchParams.get('tab')
  return projectTabs.includes(tab as Tab) ? (tab as Tab) : 'doc'
}

function createSectionId() {
  return `section-${Date.now()}`
}

function createLessonId() {
  return `lesson-${Date.now()}`
}

function createAttachmentId() {
  return `attachment-${Date.now()}`
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function parseLessonTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  )
}

function parseList(value: string, lowercase = false) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => (lowercase ? item.toLowerCase() : item)),
    ),
  )
}

function addSubsection(sections: Section[], parentId: string, subsection: Section): Section[] {
  return sections.map((section) => {
    if (section.id === parentId) {
      return {
        ...section,
        children: [...(section.children ?? []), subsection],
      }
    }

    if (!section.children?.length) return section

    return {
      ...section,
      children: addSubsection(section.children, parentId, subsection),
    }
  })
}

function moveSection(sections: Section[], sectionId: string, direction: MoveDirection): Section[] {
  const index = sections.findIndex((section) => section.id === sectionId)

  if (index >= 0) {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= sections.length) return sections

    const reordered = [...sections]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    return reordered
  }

  return sections.map((section) => {
    if (!section.children?.length) return section

    return {
      ...section,
      children: moveSection(section.children, sectionId, direction),
    }
  })
}

function renameSection(sections: Section[], sectionId: string, title: string): Section[] {
  return sections.map((section) => {
    if (section.id === sectionId) return { ...section, title }
    if (!section.children?.length) return section

    return {
      ...section,
      children: renameSection(section.children, sectionId, title),
    }
  })
}

function deleteSection(sections: Section[], sectionId: string): Section[] {
  return sections
    .filter((section) => section.id !== sectionId)
    .map((section) => {
      if (!section.children?.length) return section

      return {
        ...section,
        children: deleteSection(section.children, sectionId),
      }
    })
}

function getSectionIds(section: Section): string[] {
  return [section.id, ...(section.children?.flatMap(getSectionIds) ?? [])]
}

function sectionContainsId(section: Section, id: string): boolean {
  return section.id === id || Boolean(section.children?.some((child) => sectionContainsId(child, id)))
}

function getAttachmentCitationLocations(
  attachment: ProjectAttachment,
  sections: { section: Section; depth: number }[],
  savedDrafts: Record<string, string>,
) {
  const citationKeys = [attachment.name, attachment.id, attachment.backendFileId].filter(Boolean)

  return sections
    .filter(({ section }) => {
      const content = savedDrafts[section.id] ?? section.content
      return citationKeys.some((key) => content.includes(`[[arquivo:${key}]]`))
    })
    .map(({ section, depth }) => ({ id: section.id, title: section.title, depth }))
}

function ProjectDetailPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = getTabFromSearchParams(searchParams)
  const requestedSectionId = searchParams.get('section')
  const project = getProject(slug)
  const [tabAnimationStep, setTabAnimationStep] = useState(0)
  const [projectDetails, setProjectDetails] = useState<Project | undefined>(() => project)
  const [sections, setSections] = useState<Section[]>(() => project?.sections ?? [])
  const [attachments, setAttachments] = useState<ProjectAttachment[]>(() => project?.attachments ?? [])
  const [lessons, setLessons] = useState<ProjectLesson[]>(() => project?.lessons ?? [])
  const [activeId, setActiveId] = useState(project?.sections[0]?.id ?? '')
  const [fullscreen, setFullscreen] = useState(true)
  const [fullscreenClosing, setFullscreenClosing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project?.sections[0]?.content ?? '')
  const [carouselDirection, setCarouselDirection] = useState<CarouselDirection>('next')
  const [sectionCreationMode, setSectionCreationMode] = useState<SectionCreationMode | null>(null)
  const [sectionTitleDraft, setSectionTitleDraft] = useState('')
  const [savedDrafts, setSavedDrafts] = useState<Record<string, string>>({})
  const [previewAttachment, setPreviewAttachment] = useState<ProjectAttachment | null>(null)
  const fullscreenCloseTimeoutRef = useRef<number | null>(null)

  const flatSections = flattenSections(sections)
  const sectionOptions = flatSections.map(({ section, depth }) => ({ id: section.id, title: section.title, depth }))
  const active = flatSections.find((item) => item.section.id === activeId)?.section ?? sections[0]
  const activeContent = active ? (savedDrafts[active.id] ?? active.content) : ''
  const activeIndex = flatSections.findIndex((item) => item.section.id === active?.id)
  const previousSection = activeIndex > 0 ? flatSections[activeIndex - 1]?.section : undefined
  const nextSection = activeIndex >= 0 ? flatSections[activeIndex + 1]?.section : undefined
  const displayedProject = projectDetails ?? project
  const canManage = displayedProject ? canManageProject(displayedProject) : false
  const tab = requestedTab
  const previewCitationLocations = previewAttachment
    ? getAttachmentCitationLocations(previewAttachment, flatSections, savedDrafts)
    : []

  useEffect(() => {
    if (displayedProject) document.title = `${displayedProject.name} · Atlas Knowledge`
  }, [displayedProject])

  useEffect(() => {
    if (!fullscreen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeFullscreen()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullscreen])

  useEffect(() => {
    return () => {
      if (fullscreenCloseTimeoutRef.current) window.clearTimeout(fullscreenCloseTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!project) return

    setProjectDetails(project)
    setSections(project.sections)
    setAttachments(project.attachments)
    setLessons(project.lessons)
    const firstSection = project.sections[0]
    setActiveId(firstSection?.id ?? '')
    setDraft(firstSection?.content ?? '')
    setEditing(false)
    setFullscreen(true)
    setFullscreenClosing(false)
    setCarouselDirection('next')
    setSectionCreationMode(null)
    setSectionTitleDraft('')
    setPreviewAttachment(null)
  }, [project])

  useEffect(() => {
    if (!project || tab !== 'doc' || !requestedSectionId) return

    const targetSection = flattenSections(project.sections).find((item) => item.section.id === requestedSectionId)?.section
    if (!targetSection) return

    if (fullscreenCloseTimeoutRef.current) {
      window.clearTimeout(fullscreenCloseTimeoutRef.current)
      fullscreenCloseTimeoutRef.current = null
    }
    setActiveId(targetSection.id)
    setDraft(savedDrafts[targetSection.id] ?? targetSection.content)
    setEditing(false)
    setFullscreen(true)
    setFullscreenClosing(false)
    setCarouselDirection('next')
  }, [project, requestedSectionId, savedDrafts, tab])

  if (!project) return <Navigate to="/projects" replace />

  const currentProject = projectDetails ?? project

  function startSectionCreation(mode: SectionCreationMode) {
    if (!canManage) return

    setSectionCreationMode(mode)
    setSectionTitleDraft(mode === 'section' ? 'Nova seção' : 'Nova subseção')
  }

  function cancelSectionCreation() {
    setSectionCreationMode(null)
    setSectionTitleDraft('')
  }

  function addSection() {
    if (!canManage) return
    if (!sectionCreationMode) return

    const title = sectionTitleDraft.trim() || (sectionCreationMode === 'section' ? 'Nova seção' : 'Nova subseção')
    const newSection: Section = {
      id: createSectionId(),
      title,
      content: `# ${title}\n\n`,
    }

    setSections((current) =>
      sectionCreationMode === 'subsection' && activeId ? addSubsection(current, activeId, newSection) : [...current, newSection],
    )
    setActiveId(newSection.id)
    setDraft(newSection.content)
    setEditing(true)
    cancelSectionCreation()
    showToast(sectionCreationMode === 'section' ? 'Seção criada' : 'Subseção criada')
  }

  function reorderSection(sectionId: string, direction: MoveDirection) {
    if (!canManage) return

    setSections((current) => moveSection(current, sectionId, direction))
  }

  function updateSectionTitle(sectionId: string, title: string) {
    if (!canManage) return

    setSections((current) => renameSection(current, sectionId, title))
  }

  async function removeActiveSection() {
    if (!canManage) return
    if (!active) return
    const confirmed = await confirmDanger({
      title: `Apagar "${active.title}"?`,
      text: 'Essa ação também remove todas as subseções e não poderá ser desfeita.',
      confirmButtonText: 'Apagar',
    })

    if (!confirmed) return

    const deletedIds = getSectionIds(active)
    const nextSections = deleteSection(sections, active.id)
    const nextActive = flattenSections(nextSections)[0]?.section

    setSections(nextSections)
    setSavedDrafts((current) =>
      Object.fromEntries(Object.entries(current).filter(([sectionId]) => !deletedIds.includes(sectionId))),
    )
    setActiveId(nextActive?.id ?? '')
    setDraft(nextActive ? (savedDrafts[nextActive.id] ?? nextActive.content) : '')
    setEditing(false)
    showToast('Seção apagada')
  }

  async function removeAttachment(attachment: ProjectAttachment) {
    if (!canManage) return

    const confirmed = await confirmDanger({
      title: `Apagar "${attachment.name}"?`,
      text: 'O arquivo será removido dos registros do projeto.',
      confirmButtonText: 'Apagar arquivo',
    })

    if (!confirmed) return

    setAttachments((current) => current.filter((item) => item.id !== attachment.id))
    showToast('Arquivo apagado')
  }

  function addAttachment(file: File) {
    if (!canManage) return

    const extension = file.name.split('.').pop()?.toLowerCase() || 'file'
    const attachment: ProjectAttachment = {
      id: createAttachmentId(),
      name: file.name,
      type: extension,
      size: formatFileSize(file.size),
      uploadedAt: new Date().toISOString().slice(0, 10),
    }

    setAttachments((current) => [attachment, ...current])
    showToast('Arquivo enviado')
  }

  async function removeLesson(lesson: ProjectLesson) {
    if (!canManage) return

    const confirmed = await confirmDanger({
      title: `Apagar "${lesson.title}"?`,
      text: 'A lição será removida dos registros do projeto.',
      confirmButtonText: 'Apagar lição',
    })

    if (!confirmed) return

    setLessons((current) => current.filter((item) => item.id !== lesson.id))
    showToast('Lição apagada')
  }

  function addLesson(lesson: Omit<ProjectLesson, 'id' | 'createdAt'>) {
    if (!canManage) return

    setLessons((current) => [
      {
        id: createLessonId(),
        createdAt: new Date().toISOString().slice(0, 10),
        ...lesson,
      },
      ...current,
    ])
    showToast('Lição criada')
  }

  function updateLesson(lessonId: string, lesson: Omit<ProjectLesson, 'id' | 'createdAt'>) {
    if (!canManage) return

    setLessons((current) => current.map((item) => (item.id === lessonId ? { ...item, ...lesson } : item)))
    showToast('Lição atualizada')
  }

  function updateProjectInfo(nextProject: Project) {
    if (!canManage) return

    setProjectDetails({
      ...nextProject,
      updatedAt: new Date().toISOString().slice(0, 10),
    })
    showToast('Informações do projeto atualizadas')
  }

  function selectSection(id: string) {
    const section = flatSections.find((item) => item.section.id === id)?.section
    const nextIndex = flatSections.findIndex((item) => item.section.id === id)

    if (nextIndex !== -1 && activeIndex !== -1) {
      setCarouselDirection(nextIndex > activeIndex ? 'next' : 'previous')
    }

    setActiveId(id)
    setDraft(section ? (savedDrafts[section.id] ?? section.content) : '')
    setEditing(false)
  }

  function navigateSection(direction: CarouselDirection) {
    const target = direction === 'previous' ? previousSection : nextSection
    if (!target) return

    setCarouselDirection(direction)
    setActiveId(target.id)
    setDraft(savedDrafts[target.id] ?? target.content)
    setEditing(false)
  }

  function saveDraft() {
    if (!canManage) return
    if (!active) return
    setSavedDrafts((current) => ({ ...current, [active.id]: draft }))
    setEditing(false)
    showToast('Alterações salvas')
  }

  function cancelEditing() {
    setDraft(activeContent)
    setEditing(false)
  }

  function changeTab(nextTab: Tab) {
    if (nextTab === tab) return

    const nextSearchParams = new URLSearchParams(searchParams)
    if (nextTab === 'doc') {
      nextSearchParams.delete('tab')
    } else {
      nextSearchParams.set('tab', nextTab)
    }

    setSearchParams(nextSearchParams, { replace: true })
    setTabAnimationStep((current) => current + 1)
  }

  function openFullscreen() {
    if (fullscreenCloseTimeoutRef.current) window.clearTimeout(fullscreenCloseTimeoutRef.current)
    setFullscreenClosing(false)
    setFullscreen(true)
  }

  function closeFullscreen() {
    if (!fullscreen || fullscreenClosing) return

    setFullscreenClosing(true)
    fullscreenCloseTimeoutRef.current = window.setTimeout(() => {
      setFullscreen(false)
      setFullscreenClosing(false)
    }, 220)
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
          <span>{currentProject.name}</span>
        </div>

        <header className="project-detail__hero">
          <div>
            <div className="project-detail__title">
              <h1>{currentProject.name}</h1>
              <StatusBadge status={currentProject.status} />
            </div>
            <p>{currentProject.description}</p>
          </div>
        </header>

        <nav className="project-detail__tabs" aria-label="Conteúdo do projeto">
          {[
            { id: 'doc' as const, label: 'Documentação', icon: FileText },
            { id: 'files' as const, label: `Arquivos (${attachments.length})`, icon: Paperclip },
            { id: 'lessons' as const, label: `Lições (${lessons.length})`, icon: Lightbulb },
            { id: 'history' as const, label: 'Histórico', icon: History },
          ].map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? 'project-detail__tab project-detail__tab--active' : 'project-detail__tab'}
                onClick={() => changeTab(item.id)}
              >
                <Icon size={16} aria-hidden="true" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div
          className="project-tab-transition"
          data-active-tab={tab}
          style={{
            animationName:
              tab === 'doc' ? 'project-tab-doc-enter' : tabAnimationStep % 2 === 0 ? 'project-tab-enter-a' : 'project-tab-enter-b',
          }}
        >
          {tab === 'doc' && (
            <DocView
              project={currentProject}
              sections={sections}
              activeId={activeId}
              active={active}
              activeIndex={activeIndex}
              activeContent={activeContent}
              attachments={attachments}
              canManage={canManage}
              carouselDirection={carouselDirection}
              draft={draft}
              editing={editing}
              fullscreen={fullscreen}
              fullscreenClosing={fullscreenClosing}
              lessons={lessons}
              sectionCreationMode={sectionCreationMode}
              sectionOptions={sectionOptions}
              sectionTitleDraft={sectionTitleDraft}
              onAddSection={addSection}
              onCancel={cancelEditing}
              onCancelSectionCreation={cancelSectionCreation}
              onCloseFullscreen={closeFullscreen}
              onDeleteSection={removeActiveSection}
              onDraftChange={setDraft}
              onOpenAttachment={setPreviewAttachment}
              onOpenFullscreen={openFullscreen}
              onMoveSection={reorderSection}
              onNavigateSection={navigateSection}
              onRenameSection={updateSectionTitle}
              onSave={saveDraft}
              onSelect={selectSection}
              previousSectionTitle={previousSection?.title}
              onSectionTitleDraftChange={setSectionTitleDraft}
              onStartSectionCreation={startSectionCreation}
              onUpdateProject={updateProjectInfo}
              nextSectionTitle={nextSection?.title}
              setEditing={setEditing}
            />
          )}
          {tab === 'files' && (
            <FilesView
              attachments={attachments}
              canManage={canManage}
              onAddAttachment={addAttachment}
              onDeleteAttachment={removeAttachment}
              onOpenAttachment={setPreviewAttachment}
            />
          )}
          {tab === 'lessons' && (
            <LessonsView
              lessons={lessons}
              canManage={canManage}
              onAddLesson={addLesson}
              onDeleteLesson={removeLesson}
              onUpdateLesson={updateLesson}
            />
          )}
          {tab === 'history' && <HistoryView project={currentProject} />}
        </div>
      </div>
      <AttachmentPreviewDialog
        attachment={previewAttachment}
        citationLocations={previewCitationLocations}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  )
}

function DocView({
  project,
  sections,
  activeId,
  active,
  activeIndex,
  activeContent,
  attachments,
  canManage,
  carouselDirection,
  draft,
  editing,
  fullscreen,
  fullscreenClosing,
  lessons,
  sectionCreationMode,
  sectionOptions,
  sectionTitleDraft,
  onAddSection,
  onCancel,
  onCancelSectionCreation,
  onCloseFullscreen,
  onDeleteSection,
  onDraftChange,
  onOpenAttachment,
  onOpenFullscreen,
  onMoveSection,
  onNavigateSection,
  onRenameSection,
  onSave,
  onSelect,
  previousSectionTitle,
  onSectionTitleDraftChange,
  onStartSectionCreation,
  onUpdateProject,
  nextSectionTitle,
  setEditing,
}: {
  project: Project
  sections: Section[]
  activeId: string
  active: Section | undefined
  activeIndex: number
  activeContent: string
  attachments: ProjectAttachment[]
  canManage: boolean
  carouselDirection: CarouselDirection
  draft: string
  editing: boolean
  fullscreen: boolean
  fullscreenClosing: boolean
  lessons: ProjectLesson[]
  sectionCreationMode: SectionCreationMode | null
  sectionOptions: SectionOption[]
  sectionTitleDraft: string
  onAddSection: () => void
  onCancel: () => void
  onCancelSectionCreation: () => void
  onCloseFullscreen: () => void
  onDeleteSection: () => void
  onDraftChange: (value: string) => void
  onOpenAttachment: (attachment: ProjectAttachment) => void
  onOpenFullscreen: () => void
  onMoveSection: (sectionId: string, direction: MoveDirection) => void
  onNavigateSection: (direction: CarouselDirection) => void
  onRenameSection: (sectionId: string, title: string) => void
  onSave: () => void
  onSelect: (id: string) => void
  previousSectionTitle: string | undefined
  onSectionTitleDraftChange: (value: string) => void
  onStartSectionCreation: (mode: SectionCreationMode) => void
  onUpdateProject: (project: Project) => void
  nextSectionTitle: string | undefined
  setEditing: (value: boolean) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  function insertAttachmentCitation(attachment: ProjectAttachment) {
    const citation = `[[arquivo:${attachment.name}]]`
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? draft.length
    const end = textarea?.selectionEnd ?? start
    const nextDraft = `${draft.slice(0, start)}${citation}${draft.slice(end)}`
    const nextCaretPosition = start + citation.length

    onDraftChange(nextDraft)
    window.requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(nextCaretPosition, nextCaretPosition)
    })
    showToast('Citação de arquivo inserida')
  }

  if (fullscreen) {
    return (
      <div className={fullscreenClosing ? 'project-reader project-reader--closing' : 'project-reader'}>
        <div className="project-reader__bar">
          <div className="project-reader__bar-main">
            <div className="project-reader__title">
              {project.name} · {active?.title}
            </div>
            <SectionSwitcher activeId={activeId} onSelect={onSelect} sections={sectionOptions} />
          </div>
          <button type="button" className="project-detail__ghost-btn project-reader__exit-button" onClick={onCloseFullscreen}>
            <Minimize2 size={15} aria-hidden="true" />
            Sair da tela cheia
            <kbd>Esc</kbd>
          </button>
        </div>
        <div className="project-reader__carousel project-document-carousel">
          <div className="project-document-carousel__viewport">
            <article
              key={active?.id}
              className={`project-reader__content project-document-card__content--${carouselDirection}`}
            >
              <MarkdownView attachments={attachments} content={activeContent} onOpenAttachment={onOpenAttachment} />
              <SectionPager
                activeIndex={activeIndex}
                nextSectionTitle={nextSectionTitle}
                onNavigateSection={onNavigateSection}
                previousSectionTitle={previousSectionTitle}
                totalSections={sectionOptions.length}
              />
            </article>
          </div>
        </div>
        <ProjectReaderFiles attachments={attachments} onOpenAttachment={onOpenAttachment} />
      </div>
    )
  }

  return (
    <section className="project-doc-layout">
      <aside className="project-sections-card">
        <div className="project-detail__panel-title">
          <span>Seções</span>
          {canManage && (
            <div className="project-section-actions">
              <button type="button" onClick={() => onStartSectionCreation('section')}>
                <Plus size={14} aria-hidden="true" />
                Seção
              </button>
              <button type="button" disabled={!activeId} onClick={() => onStartSectionCreation('subsection')}>
                <Plus size={14} aria-hidden="true" />
                Subseção
              </button>
            </div>
          )}
        </div>
        {canManage && sectionCreationMode && (
          <form className="project-section-create" onSubmit={(event) => {
            event.preventDefault()
            onAddSection()
          }}>
            <label htmlFor="section-title">
              Título da {sectionCreationMode === 'section' ? 'seção' : 'subseção'}
            </label>
            <input
              id="section-title"
              value={sectionTitleDraft}
              autoFocus
              onChange={(event) => onSectionTitleDraftChange(event.target.value)}
              placeholder={sectionCreationMode === 'section' ? 'Ex.: Planejamento' : 'Ex.: Decisões técnicas'}
            />
            <div>
              <button type="button" className="project-detail__ghost-btn" onClick={onCancelSectionCreation}>
                Cancelar
              </button>
              <button type="submit" className="project-detail__primary-btn">
                Criar
              </button>
            </div>
          </form>
        )}
        <SectionTree
          sections={sections}
          activeId={activeId}
          canManage={canManage}
          onMove={onMoveSection}
          onSelect={onSelect}
        />
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
              {canManage && (
                <button
                  type="button"
                  className={editing ? 'project-view-toggle__item project-view-toggle__item--active' : 'project-view-toggle__item'}
                  onClick={() => setEditing(true)}
                >
                  <PencilLine size={14} aria-hidden="true" />
                  Editar
                </button>
              )}
            </div>
            <button type="button" className="project-detail__ghost-btn" onClick={onOpenFullscreen}>
              <Maximize2 size={14} aria-hidden="true" />
              Tela cheia
            </button>
          </div>
        </div>

        {editing && canManage ? (
          <div className="project-editor">
            <div className="project-editor__pane">
              <div className="project-editor__meta">
                <label>
                  Título da seção
                  <input
                    value={active?.title ?? ''}
                    disabled={!active}
                    onChange={(event) => {
                      if (active) onRenameSection(active.id, event.target.value)
                    }}
                    placeholder="Digite o título"
                  />
                </label>
                <button type="button" className="project-detail__danger-btn" disabled={!active} onClick={onDeleteSection}>
                  <Trash2 size={14} aria-hidden="true" />
                  Apagar
                </button>
              </div>
              <div className="project-editor__label">Markdown</div>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                spellCheck={false}
                aria-label="Editar documentação em Markdown"
              />
              {attachments.length > 0 && (
                <div className="project-editor__attachments">
                  <div className="project-editor__label">Citar arquivos</div>
                  <div>
                    {attachments.map((attachment) => (
                      <button
                        key={attachment.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertAttachmentCitation(attachment)}
                      >
                        <Paperclip size={11} aria-hidden="true" />
                        {attachment.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                <MarkdownView attachments={attachments} content={draft} onOpenAttachment={onOpenAttachment} />
              </div>
            </div>
          </div>
        ) : (
          <div className="project-document-carousel">
            <div className="project-document-carousel__viewport">
              <div
                key={active?.id}
                className={`project-document-card__content project-document-card__content--${carouselDirection}`}
              >
                <MarkdownView attachments={attachments} content={activeContent} onOpenAttachment={onOpenAttachment} />
                <SectionPager
                  activeIndex={activeIndex}
                  nextSectionTitle={nextSectionTitle}
                  onNavigateSection={onNavigateSection}
                  previousSectionTitle={previousSectionTitle}
                  totalSections={sectionOptions.length}
                />
              </div>
            </div>
          </div>
        )}
      </article>

      <aside className="project-detail__aside">
        <ProjectInfo canManage={canManage} onSave={onUpdateProject} project={project} />
        <RelatedFiles attachments={attachments} onOpenAttachment={onOpenAttachment} />
        <RelatedLessons lessons={lessons} />
      </aside>
    </section>
  )
}

function SectionSwitcher({
  activeId,
  onSelect,
  sections,
}: {
  activeId: string
  onSelect: (id: string) => void
  sections: SectionOption[]
}) {
  if (sections.length <= 1) return null

  function handleChange(event: SelectChangeEvent) {
    onSelect(event.target.value)
  }

  return (
    <FormControl
      className="project-section-switcher"
      size="small"
      sx={{
        flex: '0 0 auto',
        maxWidth: 'min(34vw, 320px)',
        minWidth: 220,
        '& .MuiInputLabel-root': {
          color: 'var(--muted-foreground)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: 'var(--primary)',
        },
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          color: 'var(--text-h)',
          backgroundColor: 'var(--surface)',
          font: '700 13px/1.2 var(--font-sans)',
        },
        '& .MuiOutlinedInput-root fieldset': {
          borderColor: 'var(--border)',
        },
        '& .MuiOutlinedInput-root:hover fieldset': {
          borderColor: 'rgba(56, 173, 72, 0.32)',
        },
        '& .MuiOutlinedInput-root.Mui-focused fieldset': {
          borderColor: 'var(--primary)',
          borderWidth: 1,
        },
        '& .MuiSelect-icon': {
          color: 'var(--muted-foreground)',
        },
      }}
    >
      <InputLabel id="project-section-switcher-label">Seção</InputLabel>
      <Select
        label="Seção"
        labelId="project-section-switcher-label"
        value={activeId}
        onChange={handleChange}
        MenuProps={{
          slotProps: {
            paper: {
              sx: {
                border: '1px solid var(--border)',
                borderRadius: '12px',
                backgroundColor: 'var(--surface)',
                boxShadow: 'var(--shadow)',
                mt: 0.5,
              },
            },
          },
        }}
      >
        {sections.map((section) => (
          <MenuItem
            key={section.id}
            value={section.id}
            sx={{
              color: 'var(--foreground)',
              font: '600 13px/1.35 var(--font-sans)',
              pl: `${section.depth * 18 + 16}px`,
              '&.Mui-selected': {
                color: 'var(--primary)',
                backgroundColor: 'var(--accent-bg)',
              },
              '&.Mui-selected:hover, &:hover': {
                backgroundColor: 'rgba(56, 173, 72, 0.08)',
              },
            }}
          >
            {section.title}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

function SectionPager({
  activeIndex,
  nextSectionTitle,
  onNavigateSection,
  previousSectionTitle,
  totalSections,
}: {
  activeIndex: number
  nextSectionTitle: string | undefined
  onNavigateSection: (direction: CarouselDirection) => void
  previousSectionTitle: string | undefined
  totalSections: number
}) {
  if (totalSections <= 1) return null

  const currentSection = activeIndex >= 0 ? activeIndex + 1 : 1

  return (
    <nav className="project-section-pager" aria-label="Navegação entre seções">
      <button
        type="button"
        className="project-section-pager__button"
        disabled={!previousSectionTitle}
        onClick={() => onNavigateSection('previous')}
      >
        <span>Seção anterior</span>
        <strong>{previousSectionTitle ?? 'Início do documento'}</strong>
      </button>

      <span className="project-section-pager__counter">
        {currentSection} de {totalSections}
      </span>

      <button
        type="button"
        className="project-section-pager__button project-section-pager__button--next"
        disabled={!nextSectionTitle}
        onClick={() => onNavigateSection('next')}
      >
        <span>Próxima seção</span>
        <strong>{nextSectionTitle ?? 'Fim do documento'}</strong>
      </button>
    </nav>
  )
}

function SectionTree({
  sections,
  activeId,
  canManage,
  onMove,
  onSelect,
  depth = 0,
}: {
  sections: Section[]
  activeId: string
  canManage: boolean
  onMove: (sectionId: string, direction: MoveDirection) => void
  onSelect: (id: string) => void
  depth?: number
}) {
  return (
    <ul className="project-section-tree">
      {sections.map((section, index) => (
        <SectionItem
          key={section.id}
          activeId={activeId}
          canManage={canManage}
          depth={depth}
          index={index}
          onMove={onMove}
          onSelect={onSelect}
          section={section}
          siblingCount={sections.length}
        />
      ))}
    </ul>
  )
}

function SectionItem({
  section,
  activeId,
  canManage,
  index,
  onMove,
  onSelect,
  depth,
  siblingCount,
}: {
  section: Section
  activeId: string
  canManage: boolean
  index: number
  onMove: (sectionId: string, direction: MoveDirection) => void
  onSelect: (id: string) => void
  depth: number
  siblingCount: number
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = Boolean(section.children?.length)
  const active = activeId === section.id
  const containsActive = sectionContainsId(section, activeId)

  useEffect(() => {
    if (containsActive) setOpen(true)
  }, [containsActive])

  return (
    <li>
      <div
        className={active ? 'project-section-tree__row project-section-tree__row--active' : 'project-section-tree__row'}
        style={{ paddingLeft: depth * 14 + 8 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="project-section-tree__toggle"
            aria-label={open ? 'Recolher seção' : 'Expandir seção'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
          </button>
        ) : (
          <span className="project-section-tree__dot" aria-hidden="true" />
        )}
        <button type="button" className="project-section-tree__label" onClick={() => onSelect(section.id)}>
          {section.title}
        </button>
        {canManage && (
          <div className="project-section-tree__move-actions" aria-label={`Reordenar ${section.title}`}>
            <button
              type="button"
              aria-label={`Mover ${section.title} para cima`}
              disabled={index === 0}
              onClick={() => onMove(section.id, 'up')}
            >
              <ArrowUp size={13} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Mover ${section.title} para baixo`}
              disabled={index === siblingCount - 1}
              onClick={() => onMove(section.id, 'down')}
            >
              <ArrowDown size={13} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {hasChildren && open && (
        <SectionTree
          sections={section.children ?? []}
          activeId={activeId}
          canManage={canManage}
          onMove={onMove}
          onSelect={onSelect}
          depth={depth + 1}
        />
      )}
    </li>
  )
}

function ProjectReaderFiles({
  attachments,
  onOpenAttachment,
}: {
  attachments: ProjectAttachment[]
  onOpenAttachment: (attachment: ProjectAttachment) => void
}) {
  if (!attachments.length) return null

  return (
    <aside className="project-reader-files" aria-label="Arquivos anexados ao projeto">
      <div className="project-reader-files__title">
        <Paperclip size={14} aria-hidden="true" />
        Arquivos
      </div>
      <ul>
        {attachments.map((attachment) => (
          <li key={attachment.id}>
            <button type="button" onClick={() => onOpenAttachment(attachment)}>
              <FileIcon type={attachment.type} />
              <div>
                <strong>{attachment.name}</strong>
                <span>
                  {attachment.type.toUpperCase()} · {attachment.size}
                </span>
                <small>Enviado em {formatDateBR(attachment.uploadedAt)}</small>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

function ProjectInfo({
  project,
  canManage,
  onSave,
}: {
  project: Project
  canManage: boolean
  onSave: (project: Project) => void
}) {
  const [editing, setEditing] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const [techDraft, setTechDraft] = useState('')
  const [draft, setDraft] = useState({
    name: project.name,
    description: project.description,
    status: project.status,
    responsible: project.responsible,
    client: project.client ?? '',
    tags: project.tags.join(', '),
    tech: project.tech?.join(', ') ?? '',
  })

  useEffect(() => {
    setDraft({
      name: project.name,
      description: project.description,
      status: project.status,
      responsible: project.responsible,
      client: project.client ?? '',
      tags: project.tags.join(', '),
      tech: project.tech?.join(', ') ?? '',
    })
    setTagDraft('')
    setTechDraft('')
  }, [project])

  useEffect(() => {
    if (!canManage) setEditing(false)
  }, [canManage])

  function updateDraft<Field extends keyof typeof draft>(field: Field, value: (typeof draft)[Field]) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function cancelEditing() {
    setEditing(false)
    setDraft({
      name: project.name,
      description: project.description,
      status: project.status,
      responsible: project.responsible,
      client: project.client ?? '',
      tags: project.tags.join(', '),
      tech: project.tech?.join(', ') ?? '',
    })
    setTagDraft('')
    setTechDraft('')
  }

  function updateTags(tags: string[]) {
    updateDraft('tags', tags.join(', '))
  }

  function updateTech(tech: string[]) {
    updateDraft('tech', tech.join(', '))
  }

  function addTag() {
    const tag = tagDraft.trim().toLowerCase()
    if (!tag) return

    const tags = parseList(draft.tags, true)
    if (!tags.includes(tag)) updateTags([...tags, tag])
    setTagDraft('')
  }

  function removeTag(tag: string) {
    updateTags(parseList(draft.tags, true).filter((item) => item !== tag))
  }

  function addTech() {
    const tech = techDraft.trim()
    if (!tech) return

    const currentTech = parseList(draft.tech)
    const alreadyExists = currentTech.some((item) => item.toLowerCase() === tech.toLowerCase())
    if (!alreadyExists) updateTech([...currentTech, tech])
    setTechDraft('')
  }

  function removeTech(tech: string) {
    updateTech(parseList(draft.tech).filter((item) => item !== tech))
  }

  function handleTagKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' && event.key !== ',') return

    event.preventDefault()
    addTag()
  }

  function handleTechKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' && event.key !== ',') return

    event.preventDefault()
    addTech()
  }

  function submitProjectInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage) return

    const name = draft.name.trim()
    const description = draft.description.trim()
    const responsible = draft.responsible.trim()

    if (!name || !description || !responsible) {
      showToast('Preencha nome, descrição e responsável', 'warning')
      return
    }

    onSave({
      ...project,
      name,
      description,
      status: draft.status,
      responsible,
      client: draft.client.trim() || undefined,
      tags: parseList(draft.tags, true),
      tech: parseList(draft.tech),
    })
    setEditing(false)
  }

  if (editing && canManage) {
    const responsibleSelectOptions = Array.from(new Set([draft.responsible, ...responsibleOptions].filter(Boolean)))
    const tags = parseList(draft.tags, true)
    const tech = parseList(draft.tech)

    return (
      <div className="project-detail__card">
        <div className="project-detail__panel-title">Editar informações</div>
        <form className="project-info-form" onSubmit={submitProjectInfo}>
          <label>
            Nome
            <input value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} />
          </label>
          <label>
            Descrição
            <textarea value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} />
          </label>
          <label className="project-info-form__select-field project-info-form__select-field--status">
            Status
            <FormControl className="project-info-form__mui-field" size="small" fullWidth>
              <Select
                displayEmpty
                value={draft.status}
                onChange={(event: SelectChangeEvent<ProjectStatus>) => updateDraft('status', event.target.value as ProjectStatus)}
              >
                <MenuItem value="active">Ativo</MenuItem>
                <MenuItem value="paused">Pausado</MenuItem>
                <MenuItem value="done">Concluído</MenuItem>
              </Select>
            </FormControl>
          </label>
          <label className="project-info-form__select-field">
            Responsável
            <FormControl className="project-info-form__mui-field" size="small" fullWidth>
              <Select
                displayEmpty
                value={draft.responsible}
                onChange={(event: SelectChangeEvent) => updateDraft('responsible', event.target.value)}
              >
                {responsibleSelectOptions.map((responsible) => (
                  <MenuItem key={responsible} value={responsible}>
                    {responsible}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </label>
          <label>
            Cliente
            <input value={draft.client} onChange={(event) => updateDraft('client', event.target.value)} />
          </label>
          <label className="project-info-form__tag-field">
            Tags
            <div className="project-tag-editor">
              {tags.length > 0 && (
                <div className="project-tag-editor__chips" aria-label="Tags adicionadas">
                  {tags.map((tag) => (
                    <button key={tag} type="button" onClick={() => removeTag(tag)}>
                      #{tag}
                      <X size={12} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
              <div className="project-tag-editor__input-row">
                <input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Digite uma tag e pressione Enter"
                />
                <button type="button" className="project-detail__ghost-btn" onClick={addTag}>
                  Adicionar
                </button>
              </div>
            </div>
          </label>
          <label className="project-info-form__tag-field">
            Tecnologias
            <div className="project-tag-editor">
              {tech.length > 0 && (
                <div className="project-tag-editor__chips project-tag-editor__chips--tech" aria-label="Tecnologias adicionadas">
                  {tech.map((item) => (
                    <button key={item} type="button" onClick={() => removeTech(item)}>
                      {item}
                      <X size={12} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
              <div className="project-tag-editor__input-row">
                <input
                  value={techDraft}
                  onChange={(event) => setTechDraft(event.target.value)}
                  onKeyDown={handleTechKeyDown}
                  placeholder="Digite uma tecnologia e pressione Enter"
                />
                <button type="button" className="project-detail__ghost-btn" onClick={addTech}>
                  Adicionar
                </button>
              </div>
            </div>
          </label>
          <div className="project-info-form__actions">
            <button type="button" className="project-detail__ghost-btn" onClick={cancelEditing}>
              Cancelar
            </button>
            <button type="submit" className="project-detail__primary-btn">
              Salvar
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="project-detail__card">
      <div className="project-detail__panel-title">
        <span>Informações</span>
        {canManage && (
          <button type="button" aria-label="Editar informações do projeto" onClick={() => setEditing(true)}>
            <PencilLine size={15} aria-hidden="true" />
          </button>
        )}
      </div>
      <dl className="project-detail__info">
        <InfoRow icon={Users} label="Responsável" value={project.responsible} />
        {project.client && <InfoRow icon={Users} label="Cliente" value={project.client} />}
        <InfoRow icon={Calendar} label="Criado em" value={formatDateBR(project.createdAt)} />
        <InfoRow icon={Calendar} label="Atualizado" value={formatDateBR(project.updatedAt)} />
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

function RelatedFiles({
  attachments,
  onOpenAttachment,
}: {
  attachments: ProjectAttachment[]
  onOpenAttachment: (attachment: ProjectAttachment) => void
}) {
  if (!attachments.length) return null

  return (
    <div className="project-detail__card">
      <div className="project-detail__panel-title">Arquivos</div>
      <ul className="project-related-list">
        {attachments.slice(0, 4).map((attachment) => (
          <li key={attachment.id}>
            <button type="button" className="project-related-list__button" onClick={() => onOpenAttachment(attachment)}>
              <FileIcon type={attachment.type} />
              <div>
                <strong>{attachment.name}</strong>
                <span>
                  {attachment.type.toUpperCase()} · {attachment.size}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RelatedLessons({ lessons }: { lessons: ProjectLesson[] }) {
  if (!lessons.length) return null

  return (
    <div className="project-detail__card">
      <div className="project-detail__panel-title">
        <Lightbulb size={15} aria-hidden="true" />
        Lições
      </div>
      <ul className="project-detail__lessons">
        {lessons.slice(0, 3).map((lesson) => (
          <li key={lesson.id}>
            <LessonTypeBadge type={lesson.type} compact />
            <strong>{lesson.title}</strong>
            <span>{lesson.description}</span>
            {Boolean(lesson.tags?.length) && (
              <div className="project-lesson-tags project-lesson-tags--compact" aria-label="Tags da lição">
                {lesson.tags?.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function LessonTypeBadge({ type, compact = false }: { type: ProjectLessonType; compact?: boolean }) {
  const Icon = lessonTypeIcons[type]

  return (
    <span className={`project-lesson-type project-lesson-type--${type}${compact ? ' project-lesson-type--compact' : ''}`}>
      <Icon size={compact ? 11 : 13} aria-hidden="true" />
      {lessonTypeLabels[type]}
    </span>
  )
}

function LessonTypeIcon({ type, size }: { type: ProjectLessonType; size: number }) {
  const Icon = lessonTypeIcons[type]
  return <Icon size={size} aria-hidden="true" />
}

function LessonTypeSelectOption({
  option,
  compact = false,
}: {
  option: { value: ProjectLessonType; label: string; description: string }
  compact?: boolean
}) {
  return (
    <span className={`project-lesson-type-option project-lesson-type-option--${option.value}`}>
      <span className="project-lesson-type-option__dot" aria-hidden="true" />
      <span>
        <strong>{option.label}</strong>
        {!compact && <small>{option.description}</small>}
      </span>
    </span>
  )
}

function LessonTypeGuide({
  selectedType,
  onSelectType,
}: {
  selectedType: ProjectLessonType | null
  onSelectType: (type: ProjectLessonType) => void
}) {
  return (
    <section className="project-lesson-guide" aria-label="Significado dos status de lição">
      <div>
        <span className="eyebrow eyebrow--accent">// guia de status</span>
        <h2>Como classificar uma lição?</h2>
      </div>

      <div className="project-lesson-guide__grid">
        {lessonTypeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`project-lesson-guide__item project-lesson-guide__item--${option.value}${
              selectedType === option.value ? ' project-lesson-guide__item--active' : ''
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

function AttachmentPreviewDialog({
  attachment,
  citationLocations,
  onClose,
}: {
  attachment: ProjectAttachment | null
  citationLocations: SectionOption[]
  onClose: () => void
}) {
  if (!attachment) return null

  return (
    <Dialog
      open
      fullWidth
      maxWidth="md"
      className="project-attachment-dialog"
      onClose={onClose}
    >
      <DialogContent className="project-attachment-dialog__content">
        <header className="project-attachment-dialog__header">
          <FileIcon type={attachment.type} />
          <div>
            <span className="eyebrow eyebrow--accent">// prévia do arquivo</span>
            <h2>{attachment.name}</h2>
            <p>
              {attachment.type.toUpperCase()} · {attachment.size} · Enviado em {formatDateBR(attachment.uploadedAt)}
            </p>
          </div>
          <button type="button" className="project-attachment-dialog__close" aria-label="Fechar prévia" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <AttachmentPreviewBody attachment={attachment} citationLocations={citationLocations} />
      </DialogContent>
    </Dialog>
  )
}

function AttachmentPreviewBody({
  attachment,
  citationLocations,
}: {
  attachment: ProjectAttachment
  citationLocations: SectionOption[]
}) {
  if (attachment.type === 'pdf') {
    if (attachment.url) {
      return (
        <div className="project-file-preview project-file-preview--pdf-embed">
          <iframe src={attachment.url} title={`Prévia de ${attachment.name}`} />
          <div className="project-file-preview__backend-meta">
            <div className="project-file-preview__summary">
              <strong>Documento disponível para consulta</strong>
            </div>
            {citationLocations.length > 0 && (
              <dl className="project-file-preview__technical-details">
                <div>
                  <dt>Citado em</dt>
                  <dd>
                    <ul>
                      {citationLocations.map((location) => (
                        <li key={location.id}>{`${'  '.repeat(location.depth)}${location.title}`}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            )}
            <a href={attachment.url} target="_blank" rel="noreferrer">
              Abrir PDF em nova aba
            </a>
          </div>
        </div>
      )
    }

    return (
      <div className="project-file-preview project-file-preview--pdf">
        <div className="project-file-preview__page">
          <div className="project-file-preview__page-header">Mapa informacional</div>
          <h3>Resumo executivo</h3>
          <p>Estrutura recomendada para organizar documentação, decisões e aprendizados por projeto.</p>
          <div className="project-file-preview__lines">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="project-file-preview__callout">Governança · Busca · Reutilização</div>
        </div>
        <aside>
          <strong>PDF de exemplo</strong>
          <span>2 páginas detectadas</span>
          <span>Texto pesquisável disponível</span>
          <span>Clique nas citações para voltar a esta prévia.</span>
        </aside>
      </div>
    )
  }

  if (attachment.type === 'md') {
    return (
      <pre className="project-file-preview project-file-preview--code">
        <code>{`# Decisões de arquitetura

## ADR-001: Markdown como base
Status: aprovado

Motivo:
- Fácil revisão em PRs
- Portável para outras ferramentas
- Bom equilíbrio entre estrutura e velocidade

## ADR-002: Citações de arquivos
As citações [[arquivo:decisoes-arquitetura.md]] devem abrir uma prévia contextual.`}</code>
      </pre>
    )
  }

  if (attachment.type === 'xlsx') {
    return (
      <div className="project-file-preview project-file-preview--sheet">
        <table>
          <thead>
            <tr>
              <th>Perfil</th>
              <th>Contratos</th>
              <th>Tickets</th>
              <th>Indicadores</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Administrador</td>
              <td>Editar</td>
              <td>Editar</td>
              <td>Ver</td>
            </tr>
            <tr>
              <td>Financeiro</td>
              <td>Ver</td>
              <td>Sem acesso</td>
              <td>Ver</td>
            </tr>
            <tr>
              <td>Suporte</td>
              <td>Ver</td>
              <td>Editar</td>
              <td>Ver</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  if (attachment.type === 'png' || attachment.type === 'jpg') {
    return (
      <div className="project-file-preview project-file-preview--image">
        <div className="project-file-preview__mock-window">
          <div />
          <div />
          <div />
        </div>
        <div className="project-file-preview__flow">
          <span>Editor</span>
          <ChevronRight size={18} aria-hidden="true" />
          <span>Preview</span>
          <ChevronRight size={18} aria-hidden="true" />
          <span>Anexos</span>
        </div>
        <p>{attachment.name}</p>
      </div>
    )
  }

  return (
    <article className="project-file-preview project-file-preview--doc">
      <h3>Contrato de API</h3>
      <p>
        Documento de exemplo com endpoints, responsabilidades e regras de compatibilidade entre sistemas.
      </p>
      <div className="project-file-preview__lines">
        <span />
        <span />
        <span />
      </div>
    </article>
  )
}

function FilesView({
  attachments,
  canManage,
  onAddAttachment,
  onDeleteAttachment,
  onOpenAttachment,
}: {
  attachments: ProjectAttachment[]
  canManage: boolean
  onAddAttachment: (file: File) => void
  onDeleteAttachment: (attachment: ProjectAttachment) => void
  onOpenAttachment: (attachment: ProjectAttachment) => void
}) {
  const [selectedAttachment, setSelectedAttachment] = useState<ProjectAttachment | null>(attachments[0] ?? null)

  function selectAttachment(attachment: ProjectAttachment) {
    setSelectedAttachment(attachment)
  }

  function viewAttachment(attachment: ProjectAttachment) {
    setSelectedAttachment(attachment)
    onOpenAttachment(attachment)
  }

  useEffect(() => {
    setSelectedAttachment((current) => {
      if (!attachments.length) return null
      if (current && attachments.some((attachment) => attachment.id === current.id)) return current
      return attachments[0]
    })
  }, [attachments])

  return (
    <section className="project-tab-panel">
      <div className="project-tab-panel__header">
        <h2>Arquivos do projeto</h2>
        {canManage && (
          <label className="project-detail__primary-btn project-upload-button">
            <Plus size={16} aria-hidden="true" />
            Enviar arquivo
            <input
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onAddAttachment(file)
                event.target.value = ''
              }}
            />
          </label>
        )}
      </div>
      {attachments.length === 0 ? (
        <EmptyState icon={Paperclip} text="Nenhum arquivo anexado." />
      ) : (
        <div className="project-files-grid">
          {attachments.map((attachment) => (
            <article
              key={attachment.id}
              className={`project-file-card${selectedAttachment?.id === attachment.id ? ' project-file-card--selected' : ''}`}
            >
              <button
                type="button"
                className="project-file-card__main"
                aria-pressed={selectedAttachment?.id === attachment.id}
                onClick={() => selectAttachment(attachment)}
              >
                <FileIcon type={attachment.type} />
                <div>
                  <h3>{attachment.name}</h3>
                  <span>
                    {attachment.type.toUpperCase()} · {attachment.size}
                  </span>
                  <p>Enviado em {formatDateBR(attachment.uploadedAt)}</p>
                </div>
              </button>
              <div className="project-file-card__actions">
                <button
                  type="button"
                  className="project-detail__ghost-btn project-detail__ghost-btn--compact"
                  onClick={() => viewAttachment(attachment)}
                >
                  <Eye size={14} aria-hidden="true" />
                  Ver
                </button>
                {canManage && (
                  <button
                    type="button"
                    className="project-detail__danger-btn project-detail__danger-btn--compact"
                    onClick={() => onDeleteAttachment(attachment)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Apagar
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {selectedAttachment && (
        <aside className="project-attachment-viewer" aria-label="Detalhes do anexo selecionado">
          <FileIcon type={selectedAttachment.type} />
          <div>
            <span className="eyebrow eyebrow--accent">// anexo selecionado</span>
            <h3>{selectedAttachment.name}</h3>
            <p>
              Arquivo {selectedAttachment.type.toUpperCase()} com {selectedAttachment.size}, enviado em{' '}
              {formatDateBR(selectedAttachment.uploadedAt)}.
            </p>
            <code>{`[[arquivo:${selectedAttachment.name}]]`}</code>
          </div>
        </aside>
      )}
    </section>
  )
}

function LessonsView({
  lessons,
  canManage,
  onAddLesson,
  onDeleteLesson,
  onUpdateLesson,
}: {
  lessons: ProjectLesson[]
  canManage: boolean
  onAddLesson: (lesson: Omit<ProjectLesson, 'id' | 'createdAt'>) => void
  onDeleteLesson: (lesson: ProjectLesson) => void
  onUpdateLesson: (lessonId: string, lesson: Omit<ProjectLesson, 'id' | 'createdAt'>) => void
}) {
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [selectedLessonType, setSelectedLessonType] = useState<ProjectLessonType | null>(null)
  const [draft, setDraft] = useState(emptyLessonDraft)
  const visibleLessons = selectedLessonType ? lessons.filter((lesson) => lesson.type === selectedLessonType) : lessons

  useEffect(() => {
    if (!canManage) {
      setEditingLessonId(null)
      setDraft({ ...emptyLessonDraft })
    }
  }, [canManage])

  function toggleLessonType(type: ProjectLessonType) {
    setSelectedLessonType((current) => (current === type ? null : type))
  }

  function updateDraft<Field extends keyof typeof draft>(field: Field, value: (typeof draft)[Field]) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function startCreation() {
    if (!canManage) return

    setEditingLessonId('new')
    setDraft({ ...emptyLessonDraft })
  }

  function startEditing(lesson: ProjectLesson) {
    if (!canManage) return

    setEditingLessonId(lesson.id)
    setDraft({
      type: lesson.type,
      title: lesson.title,
      description: lesson.description,
      recommendation: lesson.recommendation,
      tags: lesson.tags?.join(', ') ?? '',
    })
  }

  function cancelEditingLesson() {
    setEditingLessonId(null)
    setDraft({ ...emptyLessonDraft })
  }

  function submitLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage) return

    const title = draft.title.trim()
    const description = draft.description.trim()
    const recommendation = draft.recommendation.trim()
    const tags = parseLessonTags(draft.tags)

    if (!title || !description || !recommendation) {
      showToast('Preencha todos os campos da lição', 'warning')
      return
    }

    if (editingLessonId === 'new') {
      onAddLesson({ type: draft.type, title, description, recommendation, tags })
    } else if (editingLessonId) {
      onUpdateLesson(editingLessonId, { type: draft.type, title, description, recommendation, tags })
    }

    cancelEditingLesson()
  }

  return (
    <section className="project-lessons-panel">
      <LessonTypeGuide selectedType={selectedLessonType} onSelectType={toggleLessonType} />

      {canManage && (
        <div className="project-lessons-panel__actions">
          <button type="button" className="project-detail__primary-btn" onClick={startCreation}>
            <Plus size={16} aria-hidden="true" />
            Nova lição
          </button>
        </div>
      )}
      {canManage && editingLessonId && (
        <form className="project-lesson-form" onSubmit={submitLesson}>
          <label className="project-lesson-form__select-field">
            Tipo da lição
            <FormControl className="project-lesson-form__mui-field" size="small" fullWidth>
              <Select
                value={draft.type}
                onChange={(event: SelectChangeEvent<ProjectLessonType>) =>
                  updateDraft('type', event.target.value as ProjectLessonType)
                }
                renderValue={(value) => {
                  const selectedOption = lessonTypeOptions.find((option) => option.value === value)
                  return selectedOption ? <LessonTypeSelectOption option={selectedOption} compact /> : null
                }}
                MenuProps={{
                  slotProps: {
                    paper: {
                      sx: {
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        backgroundColor: 'var(--surface)',
                        boxShadow: 'var(--shadow)',
                        mt: 0.5,
                      },
                    },
                  },
                }}
              >
                {lessonTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <LessonTypeSelectOption option={option} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <span className="project-lesson-form__hint">
              {lessonTypeOptions.find((option) => option.value === draft.type)?.description}
            </span>
          </label>
          <label>
            Título
            <input
              value={draft.title}
              autoFocus
              onChange={(event) => updateDraft('title', event.target.value)}
              placeholder="Ex.: Validar fluxo com usuários reais"
            />
          </label>
          <label>
            Descrição
            <textarea
              value={draft.description}
              onChange={(event) => updateDraft('description', event.target.value)}
              placeholder="Descreva o aprendizado registrado"
            />
          </label>
          <label>
            Recomendação
            <textarea
              value={draft.recommendation}
              onChange={(event) => updateDraft('recommendation', event.target.value)}
              placeholder="Qual ação deve ser tomada nos próximos projetos?"
            />
          </label>
          <label>
            Tags para IA
            <input
              value={draft.tags}
              onChange={(event) => updateDraft('tags', event.target.value)}
              placeholder="Ex.: onboarding, suporte, risco"
            />
          </label>
          <div>
            <button type="button" className="project-detail__ghost-btn" onClick={cancelEditingLesson}>
              Cancelar
            </button>
            <button type="submit" className="project-detail__primary-btn">
              {editingLessonId === 'new' ? 'Criar lição' : 'Salvar lição'}
            </button>
          </div>
        </form>
      )}
      {lessons.length === 0 ? (
        <EmptyState icon={Lightbulb} text="Nenhuma lição registrada ainda." />
      ) : visibleLessons.length === 0 ? (
        <EmptyState icon={Lightbulb} text="Nenhuma lição encontrada para este status." />
      ) : (
        visibleLessons.map((lesson) => (
          <article
            key={lesson.id}
            className={`project-lesson-card project-lesson-card--${lesson.type}`}
            data-ai-lesson-id={lesson.id}
            data-ai-lesson-type={lesson.type}
            data-ai-tags={lesson.tags?.join(',') ?? ''}
          >
            <div className="project-lesson-card__icon">
              <LessonTypeIcon type={lesson.type} size={20} />
            </div>
            <div>
              <header>
                <div className="project-lesson-card__title">
                  <h2>{lesson.title}</h2>
                  <LessonTypeBadge type={lesson.type} />
                </div>
                <span>{formatDateBR(lesson.createdAt)}</span>
                {canManage && (
                  <div className="project-lesson-card__actions">
                    <button
                      type="button"
                      className="project-detail__ghost-btn project-detail__ghost-btn--compact"
                      onClick={() => startEditing(lesson)}
                    >
                      <PencilLine size={14} aria-hidden="true" />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="project-detail__danger-btn project-detail__danger-btn--compact"
                      onClick={() => onDeleteLesson(lesson)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Apagar
                    </button>
                  </div>
                )}
              </header>
              <p>{lesson.description}</p>
              {Boolean(lesson.tags?.length) && (
                <div className="project-lesson-tags" aria-label="Tags da lição">
                  {lesson.tags?.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              )}
              <div className="project-lesson-card__recommendation">
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
              <time>{formatDateBR(history.at)}</time>
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
