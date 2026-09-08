import { Outlet, Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState, type MouseEvent } from 'react'
import { MessageSquarePlus, MessagesSquare, Sparkles, Trash2 } from 'lucide-react'
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
  const { blocked: aiBlocked } = useAiSettingsStatus()

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

  function handleNew() {
    if (aiBlocked) return
    const thread = createThread()
    upsertThread(thread)
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
      <aside className="ask-sidebar" aria-label="Histórico de conversas RAG">
        <div className="ask-sidebar__top">
          <button type="button" className="ask-new-btn bg-gradient-primary" onClick={handleNew} disabled={aiBlocked}>
            <MessageSquarePlus size={16} aria-hidden="true" />
            Nova conversa
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
          <Link to="/ask" className="ask-mobile-bar__link">
            Conversas
          </Link>
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
