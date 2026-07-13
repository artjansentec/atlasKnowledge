import { type DragEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  Check,
  ChevronRight,
  CircleDashed,
  ExternalLink,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  File as FileIcon,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  cancelDocumentationJob,
  generateDocumentation,
  listActiveDocumentationJobs,
  pollDocumentationJob,
  type ActiveDocumentationJob,
} from '../lib/documentation-api'
import {
  createProject,
  getProjectBySlug,
  listProjects,
  type ProjectListItem,
} from '../lib/projects-api'
import { showToast } from '../components/app-alerts'
import { AtlasSelect } from '../components/atlas-select'
import './css/ai-generator.css'

const ACCEPTED = [
  '.mp3',
  '.wav',
  '.m4a',
  '.ogg',
  '.flac',
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.xlsx',
  '.pptx',
  '.png',
  '.jpg',
  '.jpeg',
]

const ACCEPTED_LABELS = [
  'Áudio',
  'PDF',
  'DOC',
  'DOCX',
  'TXT',
  'Markdown',
  'README',
  'CSV',
  'XLSX',
  'PPTX',
  'PNG',
  'JPG',
  'JPEG',
]

interface DocType {
  id: string
  title: string
  audience: string
  items: string[]
}

const DOC_TYPES: DocType[] = [
  {
    id: 'funcional',
    title: 'Documentação Funcional',
    audience: 'Usuários, analistas e gestores',
    items: ['Objetivos', 'Escopo', 'Regras de Negócio', 'Fluxos', 'Funcionalidades', 'Perfis', 'Lições Aprendidas'],
  },
  {
    id: 'tecnica',
    title: 'Documentação Técnica',
    audience: 'Alimenta a aba Desenvolvimento do AtlasKnowledge',
    items: [
      'Arquitetura',
      'APIs',
      'Banco de Dados',
      'Docker',
      'Deploy',
      'Estrutura do Projeto',
      'Dependências',
      'Variáveis de Ambiente',
      'Tecnologias',
      'Endpoints',
      'Entidades',
      'Módulos',
      'Fluxos Técnicos',
      'Pendências',
      'Dívidas Técnicas',
      'Checklist',
      'Melhorias',
    ],
  },
]

interface UploadedFile {
  id: string
  file: File
}

type StepStatus = 'waiting' | 'running' | 'done' | 'error'

const STEPS = [
  'Recebendo arquivos',
  'Extraindo conteúdo',
  'Processando documentos',
  'Analisando contexto',
  'Gerando documentação',
  'Finalizando',
]

type ProjectMode = 'existing' | 'new'
type GeneratorView = 'generate' | 'jobs'

function statusLabel(status: string) {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'Na fila'
    case 'VALIDATING':
      return 'Validando'
    case 'UPLOADING_FILES':
      return 'Preparando arquivos'
    case 'WAITING_AI':
      return 'Aguardando IA'
    case 'PROCESSING':
      return 'Processando'
    case 'COMPLETED':
      return 'Concluído'
    case 'FAILED':
      return 'Falhou'
    case 'CANCELLED':
      return 'Cancelado'
    default:
      return status
  }
}

function formatJobTime(value?: string) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function iconForFile(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext)) return FileAudio
  if (['png', 'jpg', 'jpeg'].includes(ext)) return FileImage
  if (['csv', 'xlsx'].includes(ext)) return FileSpreadsheet
  if (['md', 'markdown', 'txt'].includes(ext)) return FileType2
  if (['pdf', 'doc', 'docx', 'pptx'].includes(ext)) return FileText
  return FileIcon
}

function AiGeneratorPage() {
  const navigate = useNavigate()
  const { slug: routeSlug } = useParams()
  const { user, isCurrentUserAdmin } = useAuth()
  const lockedToProject = Boolean(routeSlug)

  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['funcional', 'tecnica'])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [stepIdx, setStepIdx] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<UploadedFile | null>(null)
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const canCreateProjects = isCurrentUserAdmin()
  const [projectMode, setProjectMode] = useState<ProjectMode>(
    lockedToProject ? 'existing' : canCreateProjects ? 'new' : 'existing',
  )
  const [selectedSlug, setSelectedSlug] = useState(routeSlug ?? '')
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(routeSlug ?? null)
  const [loadingProject, setLoadingProject] = useState(Boolean(routeSlug))
  const [view, setView] = useState<GeneratorView>('generate')
  const [activeJobs, setActiveJobs] = useState<ActiveDocumentationJob[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsRefreshing, setJobsRefreshing] = useState(false)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const jobsRefreshCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    document.title = 'Gerador de Documentação IA · Atlas Knowledge'
  }, [])

  useEffect(() => {
    if (!canCreateProjects && !lockedToProject && projectMode === 'new') {
      setProjectMode('existing')
    }
  }, [canCreateProjects, lockedToProject, projectMode])

  useEffect(() => {
    let cancelled = false
    void listProjects()
      .then((items) => {
        if (!cancelled) setProjects(items)
      })
      .catch(() => {
        if (!cancelled) setProjects([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!routeSlug) {
      setLoadingProject(false)
      return
    }

    let cancelled = false
    setLoadingProject(true)
    void getProjectBySlug(routeSlug)
      .then((project) => {
        if (cancelled) return
        setProjectName(project.name)
        setDescription(project.description ?? '')
        setSelectedSlug(project.slug)
        setResolvedSlug(project.slug)
        setProjectMode('existing')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o projeto.')
      })
      .finally(() => {
        if (!cancelled) setLoadingProject(false)
      })

    return () => {
      cancelled = true
    }
  }, [routeSlug])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (jobsRefreshCooldownRef.current) clearTimeout(jobsRefreshCooldownRef.current)
    }
  }, [])

  useEffect(() => {
    if (view !== 'jobs') return

    let cancelled = false

    async function loadJobsOnce() {
      setJobsLoading(true)
      try {
        const items = await listActiveDocumentationJobs(routeSlug)
        if (cancelled) return
        setActiveJobs(items)
        setJobsError(null)
      } catch (err) {
        if (cancelled) return
        setJobsError(err instanceof ApiError ? err.message : 'Não foi possível carregar os jobs.')
      } finally {
        if (!cancelled) setJobsLoading(false)
      }
    }

    void loadJobsOnce()

    return () => {
      cancelled = true
    }
  }, [view, routeSlug])

  const selectedProject = useMemo(
    () => projects.find((project) => project.slug === selectedSlug) ?? null,
    [projects, selectedSlug],
  )

  async function refreshJobs() {
    if (jobsRefreshing) return

    setJobsRefreshing(true)
    const startedAt = Date.now()

    try {
      const items = await listActiveDocumentationJobs(routeSlug)
      setActiveJobs(items)
      setJobsError(null)
    } catch (err) {
      setJobsError(err instanceof ApiError ? err.message : 'Não foi possível carregar os jobs.')
    } finally {
      const remaining = Math.max(0, 5000 - (Date.now() - startedAt))
      if (jobsRefreshCooldownRef.current) clearTimeout(jobsRefreshCooldownRef.current)
      jobsRefreshCooldownRef.current = setTimeout(() => {
        setJobsRefreshing(false)
        jobsRefreshCooldownRef.current = null
      }, remaining)
    }
  }

  async function handleCancelJob(jobId: string) {
    setCancellingJobId(jobId)
    try {
      await cancelDocumentationJob(jobId)
      setActiveJobs((prev) => prev.filter((job) => job.job_id !== jobId))
      showToast('Job cancelado', 'success')
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível cancelar o job.', 'error')
    } finally {
      setCancellingJobId(null)
    }
  }

  function addFiles(list: FileList | File[]) {
    const arr = Array.from(list)
    const accepted: UploadedFile[] = []
    for (const file of arr) {
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
      if (!ACCEPTED.includes(ext)) {
        setError(`Arquivo não suportado: ${file.name}`)
        continue
      }
      if (file.size > 200 * 1024 * 1024) {
        setError(`Arquivo excede o tamanho permitido: ${file.name}`)
        continue
      }
      accepted.push({ id: crypto.randomUUID(), file })
    }
    if (accepted.length) {
      setError(null)
      setFiles((prev) => [...prev, ...accepted])
    }
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((file) => file.id !== id))
    setConfirmRemove(null)
  }

  function toggleType(id: string) {
    setSelectedTypes((prev) => (prev.includes(id) ? prev.filter((type) => type !== id) : [...prev, id]))
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files)
  }

  async function resolveTargetSlug(): Promise<{ slug: string; name: string; description: string }> {
    if (lockedToProject && routeSlug) {
      return {
        slug: routeSlug,
        name: projectName.trim() || selectedProject?.name || routeSlug,
        description: description.trim(),
      }
    }

    if (projectMode === 'existing') {
      if (!selectedSlug) throw new Error('Selecione um projeto existente.')
      const project = selectedProject ?? (await getProjectBySlug(selectedSlug))
      return {
        slug: project.slug,
        name: projectName.trim() || project.name,
        description: description.trim() || project.description || '',
      }
    }

    if (!canCreateProjects) {
      throw new Error('Apenas administradores podem criar um projeto novo a partir do gerador.')
    }
    if (!user?.id) throw new Error('Sessão inválida. Faça login novamente.')
    if (!projectName.trim()) throw new Error('Informe o nome do projeto.')

    // Reusa o projeto já criado nesta sessão (evita 422 de slug em retry).
    if (resolvedSlug) {
      try {
        const existing = await getProjectBySlug(resolvedSlug)
        return {
          slug: existing.slug,
          name: projectName.trim() || existing.name,
          description: description.trim() || existing.description || '',
        }
      } catch {
        setResolvedSlug(null)
      }
    }

    // Sem slug: o backend gera a partir do nome e resolve colisões (ex.: nome-2).
    const created = await createProject({
      name: projectName.trim(),
      description: description.trim(),
      responsibleUserId: user.id,
      tags: [],
      tech: [],
    })

    return {
      slug: created.slug,
      name: created.name,
      description: created.description ?? description.trim(),
    }
  }

  async function handleGenerate(event?: FormEvent) {
    event?.preventDefault()

    if (!projectName.trim() && projectMode === 'new' && !lockedToProject) {
      setError('Informe o nome do projeto.')
      return
    }
    if (projectMode === 'existing' && !lockedToProject && !selectedSlug) {
      setError('Selecione um projeto existente.')
      return
    }
    if (files.length === 0) {
      setError('Nenhum arquivo enviado.')
      return
    }
    if (selectedTypes.length === 0) {
      setError('Selecione ao menos um tipo de documentação.')
      return
    }

    setError(null)
    setRunning(true)
    setDone(false)
    setStepIdx(0)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const target = await resolveTargetSlug()
      setResolvedSlug(target.slug)
      setStepIdx(1)

      const job = await generateDocumentation(target.slug, {
        projectName: target.name,
        description: target.description,
        files: files.map((item) => item.file),
        language: 'pt',
        docTypes: selectedTypes,
      })

      const jobId = job.job_id
      if (!jobId) throw new Error('A API não retornou job_id.')

      setStepIdx(2)

      await pollDocumentationJob(jobId, {
        signal: controller.signal,
        onTick: (_status, elapsedMs) => {
          if (elapsedMs < 8000) setStepIdx(3)
          else if (elapsedMs < 20000) setStepIdx(4)
          else setStepIdx(4)
        },
      })

      setStepIdx(STEPS.length)
      setDone(true)
      showToast('Documentação gerada com sucesso')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ABORTED') return
      const message = err instanceof Error ? err.message : 'Falha ao gerar documentação.'
      setError(message)
      setStepIdx(-1)
      setDone(false)
      showToast(message, 'error')
    } finally {
      setRunning(false)
    }
  }

  function openProject() {
    if (!resolvedSlug) {
      setError('Projeto não encontrado após a geração.')
      return
    }
    navigate(`/projects/${resolvedSlug}`)
  }

  function reset() {
    abortRef.current?.abort()
    setDone(false)
    setStepIdx(-1)
    setRunning(false)
    setError(null)
  }

  const progressPct =
    stepIdx < 0 ? 0 : Math.min(100, Math.round(((stepIdx + (running ? 0.5 : 1)) / STEPS.length) * 100))

  if (loadingProject) {
    return (
      <div className="ai-generator-page">
        <div className="ai-generator">
          <p className="ai-generator__loading">Carregando projeto...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-generator-page">
      <div className="ai-generator">
        <nav className="ai-generator__breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Dashboard</Link>
          <ChevronRight size={12} aria-hidden="true" />
          {lockedToProject && routeSlug ? (
            <>
              <Link to={`/projects/${routeSlug}`}>{projectName || routeSlug}</Link>
              <ChevronRight size={12} aria-hidden="true" />
            </>
          ) : null}
          <span>Gerador IA</span>
        </nav>

        <header className="ai-generator__header">
          <div className="ai-generator__badge">
            <Sparkles size={12} aria-hidden="true" />
            IA · beta
          </div>
          <h1>Gerador de Documentação com IA</h1>
          <p>
            Envie documentos, áudios ou arquivos técnicos para que a Inteligência Artificial gere automaticamente uma
            documentação estruturada do projeto.
          </p>
        </header>

        <div className="ai-generator__tabs" role="tablist" aria-label="Seções do gerador">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'generate'}
            className={`ai-generator__tab${view === 'generate' ? ' is-active' : ''}`}
            onClick={() => setView('generate')}
          >
            Gerar documentação
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'jobs'}
            className={`ai-generator__tab${view === 'jobs' ? ' is-active' : ''}`}
            onClick={() => setView('jobs')}
          >
            Jobs em execução
            {activeJobs.length > 0 ? <span className="ai-generator__tab-count">{activeJobs.length}</span> : null}
          </button>
        </div>

        {error && view === 'generate' && (
          <div className="ai-generator__error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Fechar erro">
              <X size={16} />
            </button>
          </div>
        )}

        {view === 'jobs' ? (
          <section className="ai-generator-card">
            <header className="ai-generator-card__header ai-generator-card__header--row">
              <div>
                <h2>Jobs em execução</h2>
                <p>
                  {routeSlug
                    ? 'Processamentos ativos deste projeto.'
                    : 'Acompanhe gerações em andamento nos projetos que você pode acessar.'}
                </p>
              </div>
              <button
                type="button"
                className="ai-generator__secondary-btn"
                disabled={jobsLoading || jobsRefreshing}
                aria-busy={jobsRefreshing}
                onClick={() => void refreshJobs()}
              >
                <RefreshCw
                  size={14}
                  className={jobsRefreshing ? 'ai-generator__spin' : undefined}
                  aria-hidden="true"
                />
                Atualizar
              </button>
            </header>
            <div className="ai-generator-card__body">
              {jobsError ? (
                <div className="ai-generator__error" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{jobsError}</span>
                </div>
              ) : null}

              {jobsLoading && activeJobs.length === 0 ? (
                <p className="ai-generator__loading">Carregando jobs...</p>
              ) : activeJobs.length === 0 ? (
                <div className="ai-generator__jobs-empty">
                  <CircleDashed size={22} aria-hidden="true" />
                  <strong>Nenhum job em execução</strong>
                  <p>Quando uma geração estiver rodando, ela aparece aqui. Use Atualizar para refrescar a lista.</p>
                  <button type="button" className="ai-generator__primary-btn" onClick={() => setView('generate')}>
                    Ir para gerar documentação
                  </button>
                </div>
              ) : (
                <ul className="ai-generator__jobs">
                  {activeJobs.map((job) => (
                    <li key={job.job_id} className="ai-generator__job">
                      <div className="ai-generator__job-top">
                        <div>
                          <strong>{job.project_name || job.project_slug}</strong>
                          <p>
                            {statusLabel(job.status)}
                            {job.current_step ? ` · ${job.current_step}` : ''}
                          </p>
                        </div>
                        <span className="ai-generator__job-badge">{Math.max(0, Math.min(100, job.progress))}%</span>
                      </div>
                      <div className="ai-generator__progress-track">
                        <div style={{ width: `${Math.max(0, Math.min(100, job.progress))}%` }} />
                      </div>
                      <div className="ai-generator__job-meta">
                        <span>{job.file_count} arquivo(s)</span>
                        <span>Início: {formatJobTime(job.started_at || job.created_at)}</span>
                        {job.user_name ? <span>Por {job.user_name}</span> : null}
                      </div>
                      <div className="ai-generator__job-actions">
                        <Link className="ai-generator__secondary-btn" to={`/projects/${job.project_slug}`}>
                          Ver projeto
                        </Link>
                        <button
                          type="button"
                          className="ai-generator__danger-btn"
                          disabled={cancellingJobId === job.job_id}
                          onClick={() => void handleCancelJob(job.job_id)}
                        >
                          {cancellingJobId === job.job_id ? (
                            <>
                              <Loader2 size={14} className="ai-generator__spin" aria-hidden="true" />
                              Cancelando...
                            </>
                          ) : (
                            'Cancelar job'
                          )}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : (
          <>
        <section className="ai-generator-card">
          <header className="ai-generator-card__header">
            <h2>Informações do Projeto</h2>
            <p>Contexto que ajuda a IA a organizar melhor a documentação.</p>
          </header>
          <div className="ai-generator-card__body">
            {!lockedToProject && (
              <div className="ai-generator__project-mode">
                <label className={`ai-generator__mode-option${projectMode === 'new' ? ' is-active' : ''}`}>
                  <input
                    type="radio"
                    name="project-mode"
                    checked={projectMode === 'new'}
                    disabled={!canCreateProjects}
                    onChange={() => {
                      setProjectMode('new')
                      setResolvedSlug(null)
                      setSelectedSlug('')
                    }}
                  />
                  <span>Criar novo projeto</span>
                </label>
                <label className={`ai-generator__mode-option${projectMode === 'existing' ? ' is-active' : ''}`}>
                  <input
                    type="radio"
                    name="project-mode"
                    checked={projectMode === 'existing'}
                    onChange={() => {
                      setProjectMode('existing')
                      setResolvedSlug(null)
                    }}
                  />
                  <span>Usar projeto existente</span>
                </label>
              </div>
            )}

            {!lockedToProject && projectMode === 'existing' && (
              <label className="ai-generator-field">
                <span>
                  Projeto <span className="ai-generator-field__required">*</span>
                </span>
                <AtlasSelect
                  value={selectedSlug}
                  displayEmpty
                  placeholder="Selecione um projeto"
                  required
                  onChange={(slug) => {
                    setSelectedSlug(slug)
                    const project = projects.find((item) => item.slug === slug)
                    if (project) {
                      setProjectName(project.name)
                      setDescription(project.description ?? '')
                    }
                  }}
                  options={projects.map((project) => ({
                    value: project.slug,
                    label: project.name,
                  }))}
                />
              </label>
            )}

            <label className="ai-generator-field">
              <span>
                Nome do Projeto <span className="ai-generator-field__required">*</span>
              </span>
              <input
                value={projectName}
                onChange={(event) => {
                  setProjectName(event.target.value)
                  if (projectMode === 'new' && !lockedToProject) {
                    setResolvedSlug(null)
                  }
                }}
                placeholder="Ex.: Sistema de Gestão Comercial"
                disabled={lockedToProject || (projectMode === 'existing' && Boolean(selectedSlug))}
              />
            </label>

            <label className="ai-generator-field">
              <span>Descrição (opcional)</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Informações adicionais que ajudem a IA a compreender melhor o projeto."
                rows={3}
              />
            </label>
          </div>
        </section>

        <section className="ai-generator-card">
          <header className="ai-generator-card__header">
            <h2>Arquivos</h2>
            <p>Arraste ou selecione. Vários arquivos são suportados.</p>
          </header>
          <div className="ai-generator-card__body">
            <div
              className={`ai-generator__dropzone${dragOver ? ' is-dragover' : ''}`}
              onDragOver={(event) => {
                event.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  inputRef.current?.click()
                }
              }}
            >
              <div className="ai-generator__dropzone-icon">
                <UploadCloud size={28} aria-hidden="true" />
              </div>
              <p className="ai-generator__dropzone-title">Arraste arquivos aqui</p>
              <p className="ai-generator__dropzone-hint">ou clique para selecionar</p>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED.join(',')}
                className="ai-generator__file-input"
                onChange={(event) => {
                  if (event.target.files) addFiles(event.target.files)
                  event.target.value = ''
                }}
              />
            </div>

            <div className="ai-generator__accepted">
              <span>Aceitos:</span>
              {ACCEPTED_LABELS.map((label) => (
                <span key={label} className="ai-generator__chip">
                  {label}
                </span>
              ))}
            </div>

            {files.length > 0 && (
              <div className="ai-generator__files">
                <div className="ai-generator__files-header">
                  <span>
                    {files.length} arquivo{files.length > 1 ? 's' : ''}
                  </span>
                  <button type="button" onClick={() => setFiles([])}>
                    Limpar tudo
                  </button>
                </div>
                <ul>
                  {files.map((item) => {
                    const Icon = iconForFile(item.file.name)
                    return (
                      <li key={item.id}>
                        <div className="ai-generator__file-icon">
                          <Icon size={16} aria-hidden="true" />
                        </div>
                        <div className="ai-generator__file-meta">
                          <strong>{item.file.name}</strong>
                          <span>{formatSize(item.file.size)}</span>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remover ${item.file.name}`}
                          onClick={() => setConfirmRemove(item)}
                        >
                          <X size={16} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="ai-generator-card">
          <header className="ai-generator-card__header">
            <h2>Configurações da Geração</h2>
            <p>Como a documentação deve ser produzida.</p>
          </header>
          <div className="ai-generator-card__body">
            <div>
              <div className="ai-generator__types-label">Tipo de documentação</div>
              <div className="ai-generator__types">
                {DOC_TYPES.map((type) => {
                  const active = selectedTypes.includes(type.id)
                  return (
                    <label key={type.id} className={`ai-generator__type-card${active ? ' is-active' : ''}`}>
                      <input type="checkbox" checked={active} onChange={() => toggleType(type.id)} />
                      <div>
                        <strong>{type.title}</strong>
                        <p>{type.audience}</p>
                        <div className="ai-generator__type-tags">
                          {type.items.map((item) => (
                            <span key={item}>{item}</span>
                          ))}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <button type="button" className="ai-generator__submit" disabled={running} onClick={() => void handleGenerate()}>
          {running ? (
            <>
              <Loader2 size={16} className="ai-generator__spin" aria-hidden="true" />
              Enviando...
            </>
          ) : (
            <>
              <Sparkles size={16} aria-hidden="true" />
              Gerar Documentação
            </>
          )}
        </button>

        {(running || done) && (
          <section className="ai-generator-card">
            <header className="ai-generator-card__header">
              <h2>{done ? 'Processamento concluído' : 'Processando'}</h2>
              <p>{done ? 'Sua documentação está pronta.' : 'Aguarde enquanto a IA analisa os arquivos.'}</p>
            </header>
            <div className="ai-generator-card__body">
              {!done && (
                <div className="ai-generator__progress">
                  <div className="ai-generator__progress-meta">
                    <span>Progresso</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="ai-generator__progress-track">
                    <div style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              )}

              <ol className="ai-generator__steps">
                {STEPS.map((label, index) => {
                  let status: StepStatus = 'waiting'
                  if (done || index < stepIdx) status = 'done'
                  else if (index === stepIdx) status = running ? 'running' : 'done'
                  return (
                    <li key={label} className={`ai-generator__step is-${status}`}>
                      <span className="ai-generator__step-icon">
                        {status === 'done' && <Check size={16} aria-hidden="true" />}
                        {status === 'running' && <Loader2 size={16} className="ai-generator__spin" aria-hidden="true" />}
                        {status === 'waiting' && <CircleDashed size={16} aria-hidden="true" />}
                      </span>
                      <span className="ai-generator__step-label">{label}</span>
                      <span className="ai-generator__step-status">
                        {status === 'done' && 'concluído'}
                        {status === 'running' && 'executando'}
                        {status === 'waiting' && 'aguardando'}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          </section>
        )}

        {done && (
          <section className="ai-generator-card">
            <header className="ai-generator-card__header">
              <h2>Documentação gerada com sucesso</h2>
              <p>
                Projeto &quot;{projectName}&quot; · {files.length} arquivo(s) processado(s)
              </p>
            </header>
            <div className="ai-generator-card__body ai-generator__result-actions">
              <button type="button" className="ai-generator__primary-btn" onClick={openProject}>
                <ExternalLink size={16} aria-hidden="true" />
                Ver projeto
              </button>
              <button type="button" className="ai-generator__secondary-btn" onClick={reset}>
                <RotateCcw size={16} aria-hidden="true" />
                Gerar Novamente
              </button>
            </div>
          </section>
        )}
          </>
        )}
      </div>

      {confirmRemove && (
        <div className="ai-generator-modal" onClick={() => setConfirmRemove(null)}>
          <div className="ai-generator-modal__dialog" onClick={(event) => event.stopPropagation()}>
            <h3>Remover arquivo?</h3>
            <p>{confirmRemove.file.name}</p>
            <div className="ai-generator-modal__actions">
              <button type="button" className="ai-generator__secondary-btn" onClick={() => setConfirmRemove(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="ai-generator__danger-btn"
                onClick={() => removeFile(confirmRemove.id)}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AiGeneratorPage
