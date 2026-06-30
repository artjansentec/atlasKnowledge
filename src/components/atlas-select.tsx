import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material'
import { type ReactNode, useId } from 'react'

export type AtlasSelectOption = {
  value: string
  label: ReactNode
  disabled?: boolean
}

export const atlasSelectFormControlSx = {
  '& .MuiInputLabel-root': {
    color: 'var(--muted-foreground)',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 600,
    transform: 'translate(12px, 11px) scale(1)',
    '&.MuiInputLabel-shrink': {
      transform: 'translate(12px, -7px) scale(0.78)',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
    '&.Mui-focused': {
      color: 'var(--primary)',
    },
  },
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    color: 'var(--foreground)',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    minHeight: 42,
    font: '500 14px/1.45 var(--font-sans)',
    transition: 'box-shadow 0.15s ease',
    '& fieldset': {
      borderColor: 'var(--border)',
      transition: 'border-color 0.15s ease',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(56, 173, 72, 0.42)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'var(--primary)',
      borderWidth: 1,
      boxShadow: '0 0 0 3px rgba(56, 173, 72, 0.12)',
    },
  },
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
    py: '10px',
    px: '12px',
  },
  '& .MuiSelect-icon': {
    color: 'var(--muted-foreground)',
    right: 10,
    transition: 'transform 0.15s ease',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiSelect-icon': {
    color: 'var(--primary)',
  },
}

export const atlasMenuItemSx = {
  mx: 0.75,
  my: 0.25,
  borderRadius: '8px',
  color: 'var(--foreground)',
  font: '500 14px/1.4 var(--font-sans)',
  minHeight: 40,
  '&.Mui-selected': {
    color: 'var(--primary)',
    backgroundColor: 'var(--accent-bg)',
    fontWeight: 600,
  },
  '&.Mui-selected:hover, &:hover': {
    backgroundColor: 'rgba(56, 173, 72, 0.08)',
  },
}

export const atlasSelectMenuProps = {
  slotProps: {
    paper: {
      sx: {
        border: '1px solid var(--border)',
        borderRadius: '12px',
        backgroundColor: 'var(--surface)',
        boxShadow: '0 18px 42px rgba(8, 6, 13, 0.14)',
        mt: 0.75,
        maxHeight: 320,
        '& .MuiList-root': {
          py: 0.5,
        },
      },
    },
  },
} as const

type AtlasSelectProps = {
  value: string
  onChange: (value: string) => void
  label?: string
  labelMode?: 'floating' | 'external'
  placeholder?: string
  options?: AtlasSelectOption[]
  children?: ReactNode
  fullWidth?: boolean
  size?: 'small' | 'medium'
  className?: string
  displayEmpty?: boolean
  disabled?: boolean
  required?: boolean
  renderValue?: (value: string) => ReactNode
}

export function AtlasSelect({
  value,
  onChange,
  label,
  labelMode = 'external',
  placeholder = 'Selecione...',
  options,
  children,
  fullWidth = true,
  size = 'small',
  className,
  displayEmpty = false,
  disabled = false,
  required = false,
  renderValue,
}: AtlasSelectProps) {
  const generatedId = useId()
  const labelId = `${generatedId}-label`
  const showFloatingLabel = labelMode === 'floating' && Boolean(label)

  function handleChange(event: SelectChangeEvent<string>) {
    onChange(event.target.value)
  }

  const defaultRenderValue =
    displayEmpty && !value
      ? () => <span style={{ color: 'var(--muted-foreground)' }}>{placeholder}</span>
      : undefined

  return (
    <FormControl
      className={className}
      fullWidth={fullWidth}
      size={size}
      required={required}
      disabled={disabled}
      sx={atlasSelectFormControlSx}
    >
      {showFloatingLabel && (
        <InputLabel id={labelId} shrink={displayEmpty ? true : undefined}>
          {label}
        </InputLabel>
      )}
      <Select
        labelId={showFloatingLabel ? labelId : undefined}
        label={showFloatingLabel ? label : undefined}
        value={value}
        displayEmpty={displayEmpty}
        onChange={handleChange}
        renderValue={renderValue ?? defaultRenderValue}
        MenuProps={atlasSelectMenuProps}
        inputProps={{
          'aria-label': !showFloatingLabel ? label : undefined,
        }}
      >
        {options
          ? options.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                sx={atlasMenuItemSx}
              >
                {option.label}
              </MenuItem>
            ))
          : children}
      </Select>
    </FormControl>
  )
}
