import { Autocomplete, Chip, TextField } from '@mui/material'
import { Check } from 'lucide-react'
import type { UserListItem } from '../lib/projects-api'

const controlSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    color: 'var(--foreground)',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    font: '500 14px/1.45 var(--font-sans)',
    padding: '5px 8px',
    transition: 'box-shadow 0.15s ease',
    '& fieldset': {
      borderColor: 'var(--border)',
      transition: 'border-color 0.15s ease',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(139, 92, 246, 0.42)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'oklch(0.62 0.19 300)',
      borderWidth: 1,
      boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.14)',
    },
  },
  '& .MuiChip-root': {
    height: 26,
    borderRadius: '999px',
    color: 'oklch(0.5 0.19 300)',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    border: '1px solid rgba(139, 92, 246, 0.24)',
    font: '600 12px/1 var(--font-sans)',
    '& .MuiChip-deleteIcon': {
      color: 'oklch(0.55 0.16 300)',
      fontSize: 16,
      '&:hover': { color: 'oklch(0.45 0.2 300)' },
    },
  },
}

const listboxSx = {
  border: '1px solid var(--border)',
  borderRadius: '12px',
  backgroundColor: 'var(--surface)',
  boxShadow: '0 18px 42px rgba(8, 6, 13, 0.14)',
  '& .MuiAutocomplete-option': {
    borderRadius: '8px',
    mx: 0.75,
    my: 0.25,
    color: 'var(--foreground)',
    font: '500 14px/1.4 var(--font-sans)',
    minHeight: 40,
    '&[aria-selected="true"]': {
      color: 'oklch(0.5 0.19 300)',
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
      fontWeight: 600,
    },
    '&.Mui-focused': {
      backgroundColor: 'rgba(139, 92, 246, 0.08)',
    },
  },
}

export function DevResponsibleSelect({
  users,
  value,
  onChange,
  disabled = false,
  placeholder = 'Buscar e selecionar desenvolvedores responsáveis',
}: {
  users: UserListItem[]
  value: string[]
  onChange: (userIds: string[]) => void
  disabled?: boolean
  placeholder?: string
}) {
  const selectedUsers = value
    .map((id) => users.find((user) => user.id === id))
    .filter((user): user is UserListItem => Boolean(user))

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      options={users}
      value={selectedUsers}
      disabled={disabled}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      onChange={(_event, next) => onChange(next.map((user) => user.id))}
      noOptionsText="Nenhum usuário encontrado"
      sx={controlSx}
      slotProps={{
        paper: { sx: listboxSx },
        chip: { size: 'small' },
      }}
      renderOption={(props, option, { selected }) => {
        const { key, ...optionProps } = props as { key: string } & Record<string, unknown>
        return (
          <li key={key} {...optionProps} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                width: 16,
                height: 16,
                opacity: selected ? 1 : 0,
                color: 'oklch(0.5 0.19 300)',
              }}
            >
              <Check size={16} />
            </span>
            {option.name}
          </li>
        )
      }}
      renderValue={(selected, getItemProps) =>
        selected.map((option, index) => {
          const { key, ...itemProps } = getItemProps({ index })
          return <Chip key={key} label={option.name} {...itemProps} />
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={selectedUsers.length === 0 ? placeholder : undefined}
          variant="outlined"
        />
      )}
    />
  )
}
