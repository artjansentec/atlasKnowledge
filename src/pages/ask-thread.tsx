import { type FormEvent, useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Loader2, SendHorizontal, Sparkles, User } from 'lucide-react'
import { MarkdownView } from '../components/markdown-view'
import {
  appendMessage,
  getThread,
  initialPromptKey,
  type AskMessage,
  type AskThread,
} from '../lib/ask-threads'
import { ragErrorMessage, searchRag } from '../lib/rag-api'

function AskThreadPage() {
  const { threadId } = useParams<{ threadId: string }>()
  const [thread, setThread] = useState<AskThread | null>(null)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sendingRef = useRef(false)
  const bootstrappedRef = useRef<string | null>(null)

  const sendQuestion = useEffectEvent(async (raw: string) => {
    if (!threadId || sendingRef.current) return

    const text = raw.trim()
    if (!text) return

    sendingRef.current = true
    setLoading(true)
    setQuestion('')

    const userMessage: AskMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }

    const withUser = appendMessage(threadId, userMessage)
    if (withUser) setThread(withUser)

    try {
      const result = await searchRag({ question: text })
      const assistantMessage: AskMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer,
        sources: result.sources ?? [],
        chunksUsed: result.chunks_used,
        score: result.score,
        createdAt: new Date().toISOString(),
      }
      const withAssistant = appendMessage(threadId, assistantMessage)
      if (withAssistant) setThread(withAssistant)
    } catch (error) {
      const assistantMessage: AskMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: ragErrorMessage(error),
        error: true,
        createdAt: new Date().toISOString(),
      }
      const withError = appendMessage(threadId, assistantMessage)
      if (withError) setThread(withError)
    } finally {
      setLoading(false)
      sendingRef.current = false
      inputRef.current?.focus()
    }
  })

  useEffect(() => {
    if (!threadId) return
    setThread(getThread(threadId))
    setQuestion('')
  }, [threadId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages, loading])

  useEffect(() => {
    if (!threadId || !thread) return
    if (bootstrappedRef.current === threadId) return

    bootstrappedRef.current = threadId
    const key = initialPromptKey(threadId)
    const initial = sessionStorage.getItem(key)
    if (!initial) return

    sessionStorage.removeItem(key)
    void sendQuestion(initial)
  }, [threadId, thread])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void sendQuestion(question)
  }

  if (!threadId) return <Navigate to="/ask" replace />
  if (!thread) {
    return (
      <div className="ask-missing">
        <strong>Conversa não encontrada</strong>
        <span>Ela pode ter sido removida neste navegador.</span>
        <Link to="/ask">Voltar</Link>
      </div>
    )
  }

  return (
    <div className="ask-thread">
      <div className="ask-thread__messages" aria-live="polite">
        {thread.messages.length === 0 && !loading && (
          <div className="ask-thread__empty">
            <div className="ask-thread__empty-icon bg-gradient-primary" aria-hidden="true">
              <Sparkles size={22} />
            </div>
            <strong>Faça uma pergunta</strong>
            <span>O Atlas busca na documentação indexada e devolve a resposta com fontes.</span>
          </div>
        )}

        {thread.messages.map((message) => (
          <article
            key={message.id}
            className={`ask-bubble ask-bubble--${message.role}${message.error ? ' ask-bubble--error' : ''}`}
          >
            <div className="ask-bubble__avatar" aria-hidden="true">
              {message.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
            </div>
            <div className="ask-bubble__content">
              <div className="ask-bubble__role">
                {message.role === 'user' ? 'Você' : 'Atlas RAG'}
              </div>
              {message.role === 'assistant' && !message.error ? (
                <MarkdownView content={message.content} />
              ) : (
                <p className="ask-bubble__text">{message.content}</p>
              )}

              {message.role === 'assistant' && !message.error && (
                <div className="ask-meta">
                  {typeof message.score === 'number' && (
                    <span>Score {message.score.toFixed(2)}</span>
                  )}
                  {typeof message.chunksUsed === 'number' && (
                    <span>{message.chunksUsed} chunks</span>
                  )}
                </div>
              )}

              {!!message.sources?.length && (
                <div className="ask-sources">
                  <div className="ask-sources__label">Fontes</div>
                  <ul>
                    {message.sources.map((source) => (
                      <li key={`${source.project_id}-${source.source_id}-${source.score}`}>
                        <strong>{source.title || source.source_id}</strong>
                        <span>
                          {[source.project_name, source.kind || source.source_type]
                            .filter(Boolean)
                            .join(' · ')}
                          {typeof source.score === 'number' ? ` · ${source.score.toFixed(2)}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </article>
        ))}

        {loading && (
          <div className="ask-bubble ask-bubble--assistant ask-bubble--pending">
            <div className="ask-bubble__avatar" aria-hidden="true">
              <Loader2 size={16} className="ask-spin" />
            </div>
            <div className="ask-bubble__content">
              <div className="ask-bubble__role">Atlas RAG</div>
              <p className="ask-bubble__text">Consultando a documentação...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="ask-composer" onSubmit={handleSubmit}>
        <label className="ask-composer__field">
          <span className="sr-only">Pergunta</span>
          <textarea
            ref={inputRef}
            rows={2}
            value={question}
            disabled={loading}
            placeholder="Pergunte algo sobre os projetos..."
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void sendQuestion(question)
              }
            }}
          />
        </label>
        <button
          type="submit"
          className="ask-composer__send bg-gradient-primary"
          disabled={loading || !question.trim()}
          aria-label="Enviar pergunta"
        >
          {loading ? <Loader2 size={18} className="ask-spin" /> : <SendHorizontal size={18} />}
        </button>
      </form>
    </div>
  )
}

export default AskThreadPage
