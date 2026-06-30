import type { DashboardPeriod } from './projects-api'

export function formatDateBR(value: string | undefined | null) {
  if (!value) return '—'

  const [year, month, day] = value.split('-')

  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

export function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function defaultDashboardPeriod(reference = new Date()) {
  const year = reference.getFullYear()
  const month = reference.getMonth()
  return {
    from: toISODate(new Date(year, month - 2, 1)),
    to: toISODate(new Date(year, month + 1, 0)),
  }
}

export function currentMonthRange(reference = new Date()) {
  const year = reference.getFullYear()
  const month = reference.getMonth()
  return {
    from: toISODate(new Date(year, month, 1)),
    to: toISODate(new Date(year, month + 1, 0)),
  }
}

export function formatPeriodLabel(from: string, to: string) {
  return `${formatDateBR(from)} — ${formatDateBR(to)}`
}

export function datePart(value: string | undefined | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

export function isWithinPeriod(value: string | undefined | null, period: DashboardPeriod) {
  const date = datePart(value)
  if (!date) return false
  return date >= period.from && date <= period.to
}
