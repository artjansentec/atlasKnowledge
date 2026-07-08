import { useProjectStatuses } from '../lib/project-status'
import { type ProjectStatus } from '../lib/projects'
import './status-badge.css'

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { getStatusMeta } = useProjectStatuses()
  const meta = getStatusMeta(status)

  return (
    <span
      className={`status-badge status-badge--${status}`}
      style={{ color: meta.color, background: meta.background }}
    >
      {meta.label}
    </span>
  )
}
