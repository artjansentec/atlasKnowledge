import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, Pencil, Plus, Save, Search, Trash2, Users, X } from 'lucide-react'
import { AtlasSelect } from '../components/atlas-select'
import { confirmDanger, showToast } from '../components/app-alerts'
import { ApiError } from '../lib/api'
import { useAuth, type UserRole } from '../lib/auth'
import {
  createUser,
  deleteUser,
  listManagedUsers,
  updateUser,
  type ManagedUser,
} from '../lib/users-api'
import './css/users.css'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'consultor', label: 'Consultor' },
  { value: 'desenvolvedor', label: 'Desenvolvedor' },
]

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  consultor: 'Consultor',
  desenvolvedor: 'Desenvolvedor',
}

const MIN_PASSWORD_LENGTH = 8

const emptyDraft = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'consultor' as UserRole,
}

type EditorState = { mode: 'create' } | { mode: 'edit'; user: ManagedUser }

function UsersPage() {
  const { user: currentUser, loading, isCurrentUserAdmin, applyCurrentUser } = useAuth()
  const canManageUsers = isCurrentUserAdmin()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [listError, setListError] = useState('')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Usuários · Atlas Knowledge'
    if (loading || !canManageUsers) return

    let cancelled = false
    void listManagedUsers()
      .then((next) => {
        if (cancelled) return
        setUsers(
          next.map((user) =>
            currentUser && user.id === currentUser.id ? { ...user, role: currentUser.role } : user,
          ),
        )
        setListError('')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof ApiError ? err.message : 'Não foi possível carregar os usuários.'
        setListError(message)
      })

    return () => {
      cancelled = true
    }
  }, [loading, canManageUsers, currentUser])

  const adminCount = useMemo(() => users.filter((user) => user.role === 'admin').length, [users])

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return users
    return users.filter((user) => {
      const roleLabel = ROLE_LABELS[user.role].toLowerCase()
      return (
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        roleLabel.includes(term)
      )
    })
  }, [query, users])

  if (loading) {
    return <div className="users-page users-page--loading">Carregando...</div>
  }

  if (!canManageUsers) return <Navigate to="/projects" replace />

  function isLastAdmin(user: ManagedUser) {
    return user.role === 'admin' && adminCount <= 1
  }

  async function handleDelete(user: ManagedUser) {
    if (user.id === currentUser?.id) {
      showToast('Você não pode excluir a própria conta', 'warning')
      return
    }

    if (isLastAdmin(user)) {
      showToast('Não é possível excluir o último administrador', 'warning')
      return
    }

    const confirmed = await confirmDanger({
      title: `Excluir ${user.name}?`,
      text: 'A conta será removida e a pessoa perderá o acesso ao Atlas. Essa ação não poderá ser desfeita.',
      confirmButtonText: 'Excluir usuário',
    })

    if (!confirmed) return

    setBusyId(user.id)
    try {
      await deleteUser(user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      if (editor?.mode === 'edit' && editor.user.id === user.id) setEditor(null)
      showToast('Usuário excluído')
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível excluir o usuário.', 'warning')
    } finally {
      setBusyId(null)
    }
  }

  function handleSaved(saved: ManagedUser, mode: EditorState['mode']) {
    setUsers((current) => {
      const exists = current.some((item) => item.id === saved.id)
      if (!exists) return [...current, saved].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      return current.map((item) => (item.id === saved.id ? saved : item))
    })

    if (saved.id === currentUser?.id) {
      applyCurrentUser(saved)
    }

    showToast(mode === 'create' ? 'Usuário cadastrado com sucesso' : 'Usuário atualizado')
    setEditor(null)
  }

  return (
    <div className="users-page">
      <div className="users-page__inner">
        <header className="users-page__hero">
          <div>
            <div className="eyebrow eyebrow--accent">// usuários</div>
            <h1>Gerencie o acesso ao Atlas</h1>
            <p>Cadastre, edite ou remova contas e defina o perfil de cada pessoa.</p>
          </div>
          <button type="button" className="users-page__hero-action" onClick={() => setEditor({ mode: 'create' })}>
            <Plus size={16} aria-hidden="true" />
            Novo usuário
          </button>
        </header>

        <section className="users-page__card" aria-label="Usuários cadastrados">
          <div className="users-page__toolbar">
            <div className="users-page__toolbar-title">
              <Users size={17} aria-hidden="true" />
              <div>
                <h2>Pessoas cadastradas</h2>
                <p>
                  {users.length === 1 ? '1 pessoa na base.' : `${users.length} pessoas na base.`}
                </p>
              </div>
            </div>
            <label className="users-page__search">
              <Search size={16} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome, e-mail ou perfil"
                aria-label="Buscar usuários"
              />
            </label>
          </div>

          {listError ? (
            <p className="users-page__list-empty" role="alert">
              {listError}
            </p>
          ) : filteredUsers.length === 0 ? (
            <p className="users-page__list-empty">
              {users.length === 0 ? 'Nenhum usuário cadastrado ainda.' : 'Nenhum usuário encontrado para essa busca.'}
            </p>
          ) : (
            <div className="users-page__table-wrap">
              <table className="users-page__table">
                <thead>
                  <tr>
                    <th>Pessoa</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>
                      <span className="users-page__sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const initials = userInitials(user.name)
                    const isSelf = user.id === currentUser?.id
                    const displayRole =
                      isSelf && currentUser ? currentUser.role : user.role
                    const lastAdmin = isLastAdmin({ ...user, role: displayRole })

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="users-page__person">
                            <span className="users-page__avatar" aria-hidden="true">
                              {initials}
                            </span>
                            <span>
                              <strong>{user.name}</strong>
                              {isSelf ? <em className="users-page__you">Você</em> : null}
                            </span>
                          </div>
                        </td>
                        <td className="users-page__email">{user.email}</td>
                        <td>
                          <span className={`users-page__role users-page__role--${displayRole}`}>
                            {ROLE_LABELS[displayRole]}
                          </span>
                        </td>
                        <td>
                          <div className="users-page__row-actions">
                            <button
                              type="button"
                              className="users-page__icon-btn"
                              onClick={() =>
                                setEditor({
                                  mode: 'edit',
                                  user:
                                    isSelf && currentUser
                                      ? { ...user, role: currentUser.role }
                                      : user,
                                })
                              }
                              aria-label={`Editar ${user.name}`}
                            >
                              <Pencil size={15} aria-hidden="true" />
                              Editar
                            </button>
                            <button
                              type="button"
                              className="users-page__icon-btn users-page__icon-btn--danger"
                              onClick={() => void handleDelete(user)}
                              disabled={isSelf || lastAdmin || busyId === user.id}
                              aria-label={`Excluir ${user.name}`}
                              title={
                                isSelf
                                  ? 'Você não pode excluir a própria conta'
                                  : lastAdmin
                                    ? 'Não é possível excluir o último administrador'
                                    : 'Excluir usuário'
                              }
                            >
                              <Trash2 size={15} aria-hidden="true" />
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {editor ? (
        <UserEditorModal
          key={editor.mode === 'edit' ? editor.user.id : 'create'}
          editor={editor}
          adminCount={adminCount}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  )
}

function UserEditorModal({
  editor,
  adminCount,
  onClose,
  onSaved,
}: {
  editor: EditorState
  adminCount: number
  onClose: () => void
  onSaved: (user: ManagedUser, mode: EditorState['mode']) => void
}) {
  const isEdit = editor.mode === 'edit'
  const [draft, setDraft] = useState(() =>
    isEdit
      ? {
          name: editor.user.name,
          email: editor.user.email,
          password: '',
          confirmPassword: '',
          role: editor.user.role,
        }
      : emptyDraft,
  )
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const lockRole = isEdit && editor.user.role === 'admin' && adminCount <= 1

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  function updateDraft<Key extends keyof typeof emptyDraft>(key: Key, value: (typeof emptyDraft)[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    const name = draft.name.trim()
    const email = draft.email.trim()
    const password = draft.password
    const confirmPassword = draft.confirmPassword

    if (!isEdit || password || confirmPassword) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setFormError(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`)
        return
      }

      if (password !== confirmPassword) {
        setFormError('As senhas não coincidem.')
        return
      }
    }

    setSubmitting(true)
    try {
      const saved = isEdit
        ? await updateUser(editor.user.id, {
            name,
            email,
            role: draft.role,
            password: password || undefined,
          })
        : await createUser({
            name,
            email,
            password,
            role: draft.role,
          })

      onSaved(saved, editor.mode)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : isEdit
            ? 'Não foi possível atualizar o usuário.'
            : 'Não foi possível cadastrar o usuário.'
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="users-page__modal"
      onClick={() => {
        if (!submitting) onClose()
      }}
    >
      <div
        className="users-page__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-editor-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="users-page__dialog-header">
          <div>
            <h3 id="user-editor-title">{isEdit ? 'Editar usuário' : 'Novo usuário'}</h3>
            <p>
              {isEdit
                ? 'Atualize identificação, perfil e, se quiser, a senha.'
                : 'Defina nome, e-mail, senha e perfil de acesso.'}
            </p>
          </div>
          <button
            type="button"
            className="users-page__icon-close"
            onClick={onClose}
            aria-label="Fechar"
            disabled={submitting}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form className="users-page__form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="users-page__grid">
            <label className="users-page__field">
              <span>Nome</span>
              <input
                value={draft.name}
                onChange={(event) => updateDraft('name', event.target.value)}
                placeholder="Ex: Ana Silva"
                autoComplete="name"
                required
              />
            </label>

            <label className="users-page__field">
              <span>E-mail</span>
              <input
                type="email"
                value={draft.email}
                onChange={(event) => updateDraft('email', event.target.value)}
                placeholder="ana@empresa.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="users-page__field">
              <span>{isEdit ? 'Nova senha (opcional)' : 'Senha'}</span>
              <span className="users-page__password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={draft.password}
                  onChange={(event) => updateDraft('password', event.target.value)}
                  autoComplete="new-password"
                  minLength={isEdit ? undefined : MIN_PASSWORD_LENGTH}
                  required={!isEdit}
                  placeholder={isEdit ? 'Deixe em branco para manter' : undefined}
                />
                <button
                  type="button"
                  className="users-page__password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </span>
            </label>

            <label className="users-page__field">
              <span>{isEdit ? 'Confirmar nova senha' : 'Confirmar senha'}</span>
              <span className="users-page__password-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={draft.confirmPassword}
                  onChange={(event) => updateDraft('confirmPassword', event.target.value)}
                  autoComplete="new-password"
                  minLength={isEdit ? undefined : MIN_PASSWORD_LENGTH}
                  required={!isEdit}
                />
                <button
                  type="button"
                  className="users-page__password-toggle"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>

            <label className="users-page__field users-page__field--wide users-page__field--select">
              <span>Perfil</span>
              <AtlasSelect
                value={draft.role}
                onChange={(value) => updateDraft('role', value as UserRole)}
                options={ROLE_OPTIONS}
                required
                disabled={lockRole}
              />
              {lockRole ? (
                <small className="users-page__hint">O último administrador não pode ter o perfil alterado.</small>
              ) : null}
            </label>
          </div>

          {formError ? (
            <div className="users-page__error" role="alert">
              {formError}
            </div>
          ) : null}

          <div className="users-page__actions">
            <button type="button" className="users-page__secondary-action" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="users-page__primary-action" disabled={submitting}>
              <Save size={16} aria-hidden="true" />
              {submitting ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function userInitials(name: string) {
  return (
    name
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

export default UsersPage
