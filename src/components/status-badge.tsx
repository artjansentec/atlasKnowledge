import { statusLabels, type ProjectStatus } from '../lib/projects'
import './status-badge.css'

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{statusLabels[status]}</span>
}
