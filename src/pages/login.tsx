import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import logoLogin from '../assets/logo-login.png'
import './css/login.css'

function LoginPage() {
  const navigate = useNavigate()
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Entrar · Atlas Knowledge'
  }, [])

  if (!loading && user) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-visual" aria-label="Apresentação do Atlas Knowledge">
        <div className="login-visual__glow" aria-hidden="true" />

        <div className="login-visual__content">
          <div className="login-logo-wrap">
            <img
              src={logoLogin}
              alt="Atlas sustentando um globo com rede de constelações"
              className="login-logo"
            />
          </div>

          <div className="login-copy">
            <div className="eyebrow">// Atlas Knowledge</div>
            <h1>Todo o conhecimento da empresa em um único lugar.</h1>
            <p>
              Centralize projetos, documentação, decisões e lições aprendidas. Encontre tudo com uma
              busca.
            </p>
          </div>
        </div>
      </aside>

      <main className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
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
                autoComplete="email"
              />
            </label>

            <label className="field">
              <span className="field-row">
                Senha
                <button type="button">Esqueci</button>
              </span>
              <span className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>

            {error && (
              <div className="login-note" role="alert" style={{ color: 'var(--destructive, #c0392b)' }}>
                {error}
              </div>
            )}

            <button type="submit" className="submit-button" disabled={submitting}>
              {submitting ? 'Entrando...' : 'Entrar'} <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default LoginPage
