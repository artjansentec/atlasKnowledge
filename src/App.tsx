import { SpeedInsights } from '@vercel/speed-insights/react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/app-shell'
import { AuthProvider, useAuth } from './lib/auth'
import { ProjectStatusProvider } from './lib/project-status'
import './index.css'
import DashboardPage from './pages/dashboard'
import LessonsPage from './pages/lessons'
import LoginPage from './pages/login'
import ProjectCreatePage from './pages/project-create'
import ProjectDetailPage from './pages/project-detail'
import ProjectsPage from './pages/projects'
import SearchPage from './pages/search'

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-loading" style={{ padding: '2rem', textAlign: 'center' }}>
        Carregando...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <ProjectStatusProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProjectStatusProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/new" element={<ProjectCreatePage />} />
            <Route path="/projects/:slug" element={<ProjectDetailPage />} />
            <Route path="/lessons" element={<LessonsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <SpeedInsights />
    </AuthProvider>
  )
}

export default App
