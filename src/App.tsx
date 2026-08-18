import { SpeedInsights } from '@vercel/speed-insights/react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/app-shell'
import { AuthProvider, useAuth } from './lib/auth'
import { ProjectStatusProvider } from './lib/project-status'
import './index.css'
import AiGeneratorPage from './pages/ai-generator'
import AiMonitorPage from './pages/ai-monitor'
import AskIndexPage from './pages/ask-index'
import AskLayoutPage from './pages/ask-layout'
import AskThreadPage from './pages/ask-thread'
import LessonsPage from './pages/lessons'
import LoginPage from './pages/login'
import ProjectCreatePage from './pages/project-create'
import ProjectDetailPage from './pages/project-detail'
import ProjectsPage from './pages/projects'
import SearchPage from './pages/search'
import UsersPage from './pages/users'

function LoadingScreen() {
  return (
    <div className="app-loading" style={{ padding: '2rem', textAlign: 'center' }}>
      Carregando...
    </div>
  )
}

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />

  return (
    <ProjectStatusProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProjectStatusProvider>
  )
}

function AdminRoute() {
  const { loading, isCurrentUserAdmin } = useAuth()

  if (loading) return <LoadingScreen />
  if (!isCurrentUserAdmin()) return <Navigate to="/projects" replace />

  return <Outlet />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/new" element={<ProjectCreatePage />} />
            <Route path="/projects/:slug/ai-generator" element={<AiGeneratorPage />} />
            <Route path="/projects/:slug" element={<ProjectDetailPage />} />
            <Route path="/ai-generator" element={<AiGeneratorPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/ai-monitor" element={<AiMonitorPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
            <Route path="/lessons" element={<LessonsPage />} />
            <Route path="/ask" element={<AskLayoutPage />}>
              <Route index element={<AskIndexPage />} />
              <Route path=":threadId" element={<AskThreadPage />} />
            </Route>
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      {import.meta.env.VITE_VERCEL === '1' ? <SpeedInsights /> : null}
    </AuthProvider>
  )
}

export default App
