export type AskSource = {
  project_id: string
  project_name?: string
  kind: string
  source_type: string
  source_id: string
  title: string
  score: number
}

export type AskMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: AskSource[]
  chunksUsed?: number
  score?: number
  error?: boolean
  createdAt: string
}

export type AskThread = {
  id: string
  title: string
  messages: AskMessage[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'atlas:ask-threads'
export const ASK_THREADS_EVENT = 'ask:threads-updated'

function notify() {
  window.dispatchEvent(new Event(ASK_THREADS_EVENT))
}

function readAll(): AskThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AskThread[]
    if (!Array.isArray(parsed)) return []
    return parsed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch {
    return []
  }
}

function writeAll(threads: AskThread[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads))
}

export function loadThreads(): AskThread[] {
  return readAll()
}

export function getThread(id: string): AskThread | null {
  return readAll().find((thread) => thread.id === id) ?? null
}

export function createThread(title = 'Nova conversa'): AskThread {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function upsertThread(thread: AskThread) {
  const threads = readAll().filter((item) => item.id !== thread.id)
  threads.unshift({ ...thread, updatedAt: new Date().toISOString() })
  writeAll(threads)
  notify()
}

export function deleteThread(id: string) {
  writeAll(readAll().filter((thread) => thread.id !== id))
  notify()
}

export function appendMessage(threadId: string, message: AskMessage): AskThread | null {
  const thread = getThread(threadId)
  if (!thread) return null

  const next: AskThread = {
    ...thread,
    messages: [...thread.messages, message],
    title:
      thread.messages.length === 0 && message.role === 'user'
        ? message.content.slice(0, 72) || thread.title
        : thread.title,
    updatedAt: new Date().toISOString(),
  }

  upsertThread(next)
  return next
}

export function initialPromptKey(threadId: string) {
  return `ask.initial.${threadId}`
}
