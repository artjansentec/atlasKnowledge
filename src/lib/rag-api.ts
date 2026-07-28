import { apiRequest, ApiError } from './api'
import type { AskSource } from './ask-threads'

export type RagSearchRequest = {
  question: string
  project_ids?: string[]
}

export type RagSearchResponse = {
  answer: string
  sources: AskSource[]
  chunks_used: number
  score: number
}

export async function searchRag(input: RagSearchRequest): Promise<RagSearchResponse> {
  const question = input.question.trim()
  if (!question) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'A pergunta não pode estar vazia.')
  }

  const body: RagSearchRequest = { question }
  if (input.project_ids?.length) {
    body.project_ids = input.project_ids
  }

  return apiRequest<RagSearchResponse>('/rag/search', {
    method: 'POST',
    body,
  })
}

export function ragErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 422) return 'Envie uma pergunta válida.'
    if (error.status === 403) {
      return 'Você não tem acesso a projetos para consulta, ou nenhum dos projetos selecionados é acessível.'
    }
    if (error.status === 502) {
      return 'O serviço de RAG está indisponível no momento. Tente novamente em instantes.'
    }
    return error.message
  }

  if (error instanceof Error) return error.message
  return 'Falha ao consultar o Atlas RAG.'
}
