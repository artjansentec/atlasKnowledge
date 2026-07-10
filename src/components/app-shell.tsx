import { type ReactNode, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Search,
  Sparkles,
  UserCircle,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import './app-shell.css'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projetos', icon: FolderKanban },
  { to: '/lessons', label: 'Lições', icon: Lightbulb },
  { to: '/search', label: 'Buscar', icon: Search },
] as const

function isNavActive(pathname: string, to: string) {
  if (to === '/') return pathname === '/'
  return pathname.startsWith(to)
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [q, setQ] = useState('')

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
      <aside className="app-shell__sidebar">
        <Link to="/" className="app-shell__brand" aria-label="Ir para o dashboard">
          <div className="app-shell__brand-icon bg-gradient-primary">
            <Sparkles size={16} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="app-shell__brand-text">
            <div className="app-shell__brand-title">Atlas Knowledge</div>
            <div className="app-shell__brand-subtitle">knowledge base</div>
          </div>
        </Link>

        <nav className="app-shell__sidebar-nav app-shell__nav" aria-label="Navegação principal">
          <div className="app-shell__nav-label">Navegação</div>
          <ul className="app-shell__nav-list">
            {navItems.map((item) => {
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
          <div className="app-shell__profile-card">
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
          </div>

          <button type="button" className="app-shell__logout-button" onClick={() => void handleLogout()}>
            <LogOut size={16} aria-hidden="true" />
            Sair
          </button>

          <div className="app-shell__ai-card bg-gradient-subtle">
            <div className="app-shell__ai-label">
              <Sparkles size={12} aria-hidden="true" />
              IA · em breve
            </div>
            <p className="app-shell__ai-text">
              Transcrições de reuniões gerarão documentação automaticamente.
            </p>
          </div>
        </div>
      </aside>

      <div className="app-shell__main">
        <header className="app-shell__header">
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
        </header>

        <main className="app-shell__content">
          <div key={pathname} className="app-shell__route-view">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  )
}
