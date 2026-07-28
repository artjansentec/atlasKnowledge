import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import {
  createThread,
  initialPromptKey,
  loadThreads,
  upsertThread,
} from '../lib/ask-threads'

const SUGGESTIONS = [
  'Quais projetos usam PostgreSQL?',
  'Resuma as lições aprendidas do ERP Educacional.',
  'Quais decisões arquiteturais foram tomadas em projetos ativos?',
  'Quem é o responsável por cada projeto em andamento?',
]

function AskIndexPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const existing = loadThreads()
    if (existing.length > 0) {
      navigate(`/ask/${existing[0].id}`, { replace: true })
    }
  }, [navigate])

  function startWith(prompt?: string) {
    const thread = createThread()
    upsertThread(thread)
    if (prompt) sessionStorage.setItem(initialPromptKey(thread.id), prompt)
    navigate(`/ask/${thread.id}`)
  }

  return (
    <div className="ask-index">
      <div className="ask-index__card">
        <div className="ask-index__logo bg-gradient-primary" aria-hidden="true">
          <Sparkles size={36} />
        </div>

        <div>
          <div className="eyebrow eyebrow--accent">// busca semântica rag</div>
          <h1 className="font-display">Pergunte ao Atlas</h1>
          <p>
            Faça perguntas em linguagem natural sobre os projetos. As respostas usam a
            documentação real indexada via RAG no Atlas.
          </p>
        </div>

        <button
          type="button"
          className="ask-index__cta bg-gradient-primary shadow-elevated"
          onClick={() => startWith()}
        >
          <Sparkles size={16} aria-hidden="true" />
          Iniciar nova conversa
        </button>

        <div className="ask-index__suggestions">
          <div className="ask-index__suggestions-label">Ideias para começar</div>
          <div className="ask-index__suggestions-grid">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="ask-suggestion"
                onClick={() => startWith(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AskIndexPage
