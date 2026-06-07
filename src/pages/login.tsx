import { useEffect, useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import './css/login.css'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('marina@empresa.com')
  const [password, setPassword] = useState('••••••••')

  useEffect(() => {
    document.title = 'Entrar · Atlas Knowledge'
  }, [])

  return (
    <div className="login-page">
      <aside className="login-visual" aria-label="Apresentação do Atlas Knowledge">
        <div className="login-visual__glow" />

        <Link to="/" className="brand-link" aria-label="Ir para a página inicial">
          <div className="brand-icon">
            <Sparkles size={20} aria-hidden="true" />
          </div>
          <span>Atlas Knowledge</span>
        </Link>

        <div className="login-copy">
          <div className="eyebrow">// Atlas Knowledge</div>
          <h1>Todo o conhecimento da empresa em um único lugar.</h1>
          <p>
            Centralize projetos, documentação, decisões e lições aprendidas. Encontre tudo com uma
            busca.
          </p>
        </div>

        <div className="metrics-grid" aria-label="Métricas do Atlas Knowledge">
          {[
            ['12+', 'projetos'],
            ['340', 'documentos'],
            ['89', 'lições'],
          ].map(([value, label]) => (
            <div key={label} className="metric-card">
              <div>{value}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="login-panel">
        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault()
            navigate('/')
          }}
        >
          <div className="eyebrow eyebrow--accent">// entrar</div>
          <div>
            <h2>Bem-vindo de volta</h2>
            <p>Acesse o Atlas.</p>
          </div>

          <div className="form-fields">
            <label className="field">
              <span>Email corporativo</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="field-row">
                Senha
                <button type="button">Esqueci</button>
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <button type="submit" className="submit-button">
              Entrar <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="login-note">Demonstração: qualquer credencial entra.</div>
        </form>
      </main>
    </div>
  )
}

export default LoginPage
