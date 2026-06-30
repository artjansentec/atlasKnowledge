import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/pt-br'
import { CalendarRange } from 'lucide-react'
import type { DashboardPeriod } from '../lib/projects-api'
import './dashboard-period-picker.css'

dayjs.locale('pt-br')

type DashboardPeriodPickerProps = {
  value: DashboardPeriod
  onChange: (period: DashboardPeriod) => void
}

function toISO(value: Dayjs | null) {
  return value?.isValid() ? value.format('YYYY-MM-DD') : ''
}

function commitPeriod(current: DashboardPeriod, from: string, to: string, onChange: (period: DashboardPeriod) => void) {
  if (!from || !to) return

  let nextFrom = from
  let nextTo = to
  if (nextFrom > nextTo) {
    nextTo = nextFrom
  }

  if (nextFrom === current.from && nextTo === current.to) return
  onChange({ from: nextFrom, to: nextTo })
}

function buildSlotProps(label: string) {
  return {
    popper: {
      className: 'dashboard-period-picker-popper',
    },
    desktopPaper: {
      className: 'dashboard-period-picker-paper',
    },
    layout: {
      className: 'dashboard-period-picker-layout',
    },
    day: {
      className: 'dashboard-period-picker-day',
    },
    calendarHeader: {
      className: 'dashboard-period-picker-header',
    },
    textField: {
      size: 'small' as const,
      className: 'dashboard-period-picker-field',
      'aria-label': label,
    },
    openPickerButton: {
      className: 'dashboard-period-picker-button',
      'aria-label': 'Abrir calendário',
    },
    field: { clearable: false },
  }
}

export function DashboardPeriodPicker({ value, onChange }: DashboardPeriodPickerProps) {
  const fromValue = dayjs(value.from)
  const toValue = dayjs(value.to)

  function updateFrom(next: Dayjs | null) {
    const from = toISO(next)
    if (!from) return
    commitPeriod(value, from, value.to, onChange)
  }

  function updateTo(next: Dayjs | null) {
    const to = toISO(next)
    if (!to) return
    commitPeriod(value, value.from, to, onChange)
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      <div className="dashboard-period" aria-label="Filtrar dashboard por período">
        <span className="dashboard-period__icon" aria-hidden="true">
          <CalendarRange size={15} />
        </span>

        <DatePicker
          value={fromValue}
          onChange={updateFrom}
          format="DD/MM/YYYY"
          closeOnSelect
          slotProps={buildSlotProps('Data inicial do período')}
        />

        <span className="dashboard-period__divider" aria-hidden="true">
          —
        </span>

        <DatePicker
          value={toValue}
          onChange={updateTo}
          format="DD/MM/YYYY"
          minDate={fromValue}
          closeOnSelect
          slotProps={buildSlotProps('Data final do período')}
        />
      </div>
    </LocalizationProvider>
  )
}
