import { Outlet, Link, useNavigate, useParams } from 'react-router-dom'
import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { MessageSquarePlus, MessagesSquare, Sparkles, Trash2, X } from 'lucide-react'
import { AiCredentialBanner } from '../components/ai-credential-banner'
import {
  ASK_THREADS_EVENT,
  createThread,
  deleteThread as removeThread,
  loadThreads,
  upsertThread,
  type AskThread,
} from '../lib/ask-threads'
import { useAiSettingsStatus } from '../lib/ai-settings-status'
import './css/ask.css'

function AskLayoutPage() {
  const navigate = useNavigate()
  const { threadId: activeId } = useParams<{ threadId?: string }>()
  const [threads, setThreads] = useState<AskThread[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const { blocked: aiBlocked } = useAiSettingsStatus()
  const closeHistory = useCallback(() => setHistoryOpen(false), [])

  useEffect(() => {
    document.title = 'Busca semântica RAG · Atlas Knowledge'
  }, [])

  useEffect(() => {
    const refresh = () => setThreads(loadThreads())
    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener(ASK_THREADS_EVENT, refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener(ASK_THREADS_EVENT, refresh)
    }
  }, [])

  useEffect(() => {
    setHistoryOpen(false)
  }, [activeId])

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setHistoryOpen(false)
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!historyOpen) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setHistoryOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [historyOpen])

  function handleNew() {
    if (aiBlocked) return
    const thread = createThread()
    upsertThread(thread)
    setHistoryOpen(false)
    navigate(`/ask/${thread.id}`)
  }

  function handleDelete(event: MouseEvent, id: string) {
    event.preventDefault()
    event.stopPropagation()
    removeThread(id)
    if (id === activeId) navigate('/ask')
  }

  return (
    <div className="ask-layout">
      {historyOpen ? (
        <button
          type="button"
          className="ask-sidebar__backdrop"
          aria-label="Fechar histórico"
          onClick={closeHistory}
        />
      ) : null}

      <aside
        id="ask-history-sidebar"
        className={`ask-sidebar${historyOpen ? ' ask-sidebar--open' : ''}`}
        aria-label="Histórico de conversas RAG"
      >
        <div className="ask-sidebar__top">
          <button type="button" className="ask-new-btn bg-gradient-primary" onClick={handleNew} disabled={aiBlocked}>
            <MessageSquarePlus size={16} aria-hidden="true" />
            Nova conversa
          </button>
          <button
            type="button"
            className="ask-sidebar__close"
            onClick={closeHistory}
            aria-label="Fechar histórico"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="ask-sidebar__label">Histórico</div>

        <div className="ask-sidebar__list">
          {threads.length === 0 && (
            <div className="ask-sidebar__empty">
              Nenhuma conversa ainda. Clique em &quot;Nova conversa&quot; para começar.
            </div>
          )}

          {threads.map((thread) => {
            const active = thread.id === activeId
            return (
              <Link
                key={thread.id}
                to={`/ask/${thread.id}`}
                className={`ask-thread-item${active ? ' ask-thread-item--active' : ''}`}
                onClick={closeHistory}
              >
                <MessagesSquare size={16} className="ask-thread-item__icon" aria-hidden="true" />
                <div className="ask-thread-item__body">
                  <div className="ask-thread-item__title">{thread.title}</div>
                  <div className="ask-thread-item__date">
                    {new Date(thread.updatedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <button
                  type="button"
                  className="ask-thread-item__delete"
                  aria-label="Excluir conversa"
                  onClick={(event) => handleDelete(event, thread.id)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </Link>
            )
          })}
        </div>

        <div className="ask-sidebar__footer">
          <div className="ask-sidebar__hint bg-gradient-subtle">
            <div className="ask-sidebar__hint-icon bg-gradient-primary" aria-hidden="true">
              <Sparkles size={16} />
            </div>
            <p>Respostas baseadas na documentação indexada dos projetos no Atlas.</p>
          </div>
        </div>
      </aside>

      <div className="ask-main">
        <div className="ask-mobile-bar">
          <button
            type="button"
            className="ask-mobile-bar__link"
            onClick={() => setHistoryOpen(true)}
            aria-controls="ask-history-sidebar"
            aria-expanded={historyOpen}
          >
            Conversas
          </button>
          <button type="button" className="ask-mobile-bar__new" onClick={handleNew} disabled={aiBlocked}>
            Nova
          </button>
        </div>
        {aiBlocked ? (
          <div className="ask-main__banner">
            <AiCredentialBanner />
          </div>
        ) : null}
        <Outlet />
      </div>
    </div>
  )
}

export default AskLayoutPage
