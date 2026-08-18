import { useEffect, useId, useState, type FormEvent } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import { showToast } from './app-alerts'
import { ApiError } from '../lib/api'
import { changePassword } from '../lib/users-api'
import './change-password-modal.css'

const MIN_PASSWORD_LENGTH = 8

const emptyForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

type ChangePasswordModalProps = {
  onClose: () => void
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const titleId = useId()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function updateField<Key extends keyof typeof emptyForm>(key: Key, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`A nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }

    if (form.newPassword === form.currentPassword) {
      setError('A nova senha deve ser diferente da senha atual.')
      return
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setSubmitting(true)
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      showToast('Senha alterada com sucesso')
      onClose()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível alterar a senha.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="change-password-modal"
      onClick={() => {
        if (!submitting) onClose()
      }}
    >
      <div
        className="change-password-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="change-password-modal__header">
          <div>
            <h3 id={titleId}>Alterar senha</h3>
            <p>Informe a senha atual e escolha uma nova.</p>
          </div>
          <button
            type="button"
            className="change-password-modal__close"
            onClick={onClose}
            aria-label="Fechar"
            disabled={submitting}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form className="change-password-modal__form" onSubmit={(event) => void handleSubmit(event)}>
          <PasswordField
            label="Senha atual"
            value={form.currentPassword}
            onChange={(value) => updateField('currentPassword', value)}
            visible={showCurrent}
            onToggleVisible={() => setShowCurrent((visible) => !visible)}
            autoComplete="current-password"
          />

          <PasswordField
            label="Nova senha"
            value={form.newPassword}
            onChange={(value) => updateField('newPassword', value)}
            visible={showNew}
            onToggleVisible={() => setShowNew((visible) => !visible)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
          />

          <PasswordField
            label="Confirmar nova senha"
            value={form.confirmPassword}
            onChange={(value) => updateField('confirmPassword', value)}
            visible={showConfirm}
            onToggleVisible={() => setShowConfirm((visible) => !visible)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
          />

          {error ? (
            <div className="change-password-modal__error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="change-password-modal__actions">
            <button
              type="button"
              className="change-password-modal__secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button type="submit" className="change-password-modal__primary" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  autoComplete,
  minLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggleVisible: () => void
  autoComplete: string
  minLength?: number
}) {
  return (
    <label className="change-password-modal__field">
      <span>{label}</span>
      <span className="change-password-modal__password-wrap">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />
        <button
          type="button"
          className="change-password-modal__toggle"
          onClick={onToggleVisible}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </span>
    </label>
  )
}
