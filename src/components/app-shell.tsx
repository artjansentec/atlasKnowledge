import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  FolderKanban,
  Lightbulb,
  LogOut,
  Menu,
  MessagesSquare,
  Search,
  Settings,
  Sparkles,
  UserCircle,
  UserPlus,
  X,
} from 'lucide-react'
import { AiSettingsModal } from './ai-settings-modal'
import { ChangePasswordModal } from './change-password-modal'
import { useAuth } from '../lib/auth'
import { OPEN_AI_SETTINGS_EVENT, useAiSettingsStatus } from '../lib/ai-settings-status'
import './app-shell.css'

const navItems = [
  { to: '/projects', label: 'Projetos', icon: FolderKanban, adminOnly: false },
  { to: '/ai-generator', label: 'Gerar com IA', icon: Sparkles, adminOnly: false },
  { to: '/ai-monitor', label: 'Monitor de IA', icon: Activity, adminOnly: true },
  { to: '/users', label: 'Usuários', icon: UserPlus, adminOnly: true },
  { to: '/ask', label: 'Busca semântica RAG', icon: MessagesSquare, adminOnly: false },
  { to: '/lessons', label: 'Lições', icon: Lightbulb, adminOnly: false },
  { to: '/search', label: 'Buscar', icon: Search, adminOnly: false },
] as const

function isNavActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout, isCurrentUserAdmin } = useAuth()
  const { blocked: aiCredentialsMissing } = useAiSettingsStatus()
  const [q, setQ] = useState('')
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const closePasswordModal = useCallback(() => setPasswordModalOpen(false), [])
  const closeAiSettings = useCallback(() => setAiSettingsOpen(false), [])
  const openAiSettings = useCallback(() => setAiSettingsOpen(true), [])
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isCurrentUserAdmin())
  const canOpenAiSettings = isCurrentUserAdmin()

  useEffect(() => {
    if (!canOpenAiSettings) return

    function onOpenSettings() {
      setAiSettingsOpen(true)
    }

    window.addEventListener(OPEN_AI_SETTINGS_EVENT, onOpenSettings)
    return () => window.removeEventListener(OPEN_AI_SETTINGS_EVENT, onOpenSettings)
  }, [canOpenAiSettings])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setMobileNavOpen(false)
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!mobileNavOpen) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  const currentUserInitials = (user?.name ?? '')
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const roleLabels: Record<string, string> = {
    admin: 'Admin logado',
    consultor: 'Consultor logado',
    desenvolvedor: 'Desenvolvedor logado',
  }
  const currentUserRoleLabel = user ? (roleLabels[user.role] ?? 'Usuário logado') : 'Usuário logado'

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      {mobileNavOpen ? (
        <button
          type="button"
          className="app-shell__backdrop"
          aria-label="Fechar menu"
          onClick={closeMobileNav}
        />
      ) : null}

      <aside
        id="app-shell-sidebar"
        className={`app-shell__sidebar${mobileNavOpen ? ' app-shell__sidebar--open' : ''}`}
      >
        <div className="app-shell__sidebar-head">
          <Link to="/projects" className="app-shell__brand" aria-label="Ir para projetos">
            <div className="app-shell__brand-icon bg-gradient-primary">
              <Sparkles size={16} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div className="app-shell__brand-text">
              <div className="app-shell__brand-title">Atlas Knowledge</div>
              <div className="app-shell__brand-subtitle">knowledge base</div>
            </div>
          </Link>
          <button
            type="button"
            className="app-shell__sidebar-close"
            onClick={closeMobileNav}
            aria-label="Fechar menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="app-shell__sidebar-nav app-shell__nav" aria-label="Navegação principal">
          <div className="app-shell__nav-label">Navegação</div>
          <ul className="app-shell__nav-list">
            {visibleNavItems.map((item) => {
              const active = isNavActive(pathname, item.to)
              const Icon = item.icon

              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`app-shell__nav-link${active ? ' app-shell__nav-link--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {item.label}
                    {active && <span className="app-shell__nav-dot" aria-hidden="true" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="app-shell__sidebar-footer">
          <button
            type="button"
            className="app-shell__profile-card"
            onClick={() => {
              closeMobileNav()
              setPasswordModalOpen(true)
            }}
            aria-label="Alterar senha"
          >
            <div className="app-shell__profile-avatar bg-gradient-primary" aria-hidden="true">
              {currentUserInitials}
            </div>
            <div>
              <strong>{user?.name}</strong>
              <span>
                <UserCircle size={12} aria-hidden="true" />
                {currentUserRoleLabel}
              </span>
            </div>
          </button>

          <button type="button" className="app-shell__logout-button" onClick={() => void handleLogout()}>
            <LogOut size={16} aria-hidden="true" />
            Sair
          </button>

          <Link to="/ai-generator" className="app-shell__ai-card bg-gradient-subtle">
            <div className="app-shell__ai-label">
              <Sparkles size={12} aria-hidden="true" />
              IA · beta
            </div>
            <p className="app-shell__ai-text">
              Envie arquivos e gere documentação estruturada automaticamente.
            </p>
          </Link>
        </div>
      </aside>

      <div className="app-shell__main">
        <header className="app-shell__header">
          <button
            type="button"
            className="app-shell__menu-btn"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label={mobileNavOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-controls="app-shell-sidebar"
            aria-expanded={mobileNavOpen}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <form
            className="app-shell__search-form"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              const query = q.trim()
              if (query) navigate(`/search?q=${encodeURIComponent(query)}`)
            }}
          >
            <div className="app-shell__search-wrap">
              <Search className="app-shell__search-icon" size={16} aria-hidden="true" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Buscar projetos, seções, lições, arquivos..."
                className="app-shell__search-input"
                aria-label="Buscar projetos, seções, lições e arquivos"
              />
            </div>
          </form>

          {canOpenAiSettings ? (
            <button
              type="button"
              className={`app-shell__settings-btn${aiCredentialsMissing ? ' app-shell__settings-btn--warn' : ''}`}
              onClick={openAiSettings}
              aria-haspopup="dialog"
              aria-expanded={aiSettingsOpen}
              aria-label={aiCredentialsMissing ? 'Configurações de IA — credencial não configurada' : 'Configurações de IA'}
              title={aiCredentialsMissing ? 'Credencial de IA não configurada' : 'Configurações de IA'}
            >
              <Settings size={16} aria-hidden="true" />
              <span>Configurações de IA</span>
              {aiCredentialsMissing ? <span className="app-shell__settings-dot" aria-hidden="true" /> : null}
            </button>
          ) : null}
        </header>

        <main className="app-shell__content">
          <div key={pathname} className="app-shell__route-view">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      {passwordModalOpen ? <ChangePasswordModal onClose={closePasswordModal} /> : null}
      {aiSettingsOpen ? <AiSettingsModal onClose={closeAiSettings} /> : null}
    </div>
  )
}
