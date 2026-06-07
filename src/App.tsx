import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/app-shell'
import './index.css'
import DashboardPage from './pages/dashboard'
import LessonsPage from './pages/lessons'
import LoginPage from './pages/login'
import ProjectCreatePage from './pages/project-create'
import ProjectDetailPage from './pages/project-detail'
import ProjectsPage from './pages/projects'
import SearchPage from './pages/search'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
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
  )
}

export default App
