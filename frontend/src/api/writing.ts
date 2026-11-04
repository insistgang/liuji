import client from './client'
import type { ApiResponse } from '../types/api'

export interface WritingPrompt {
  id: number
  title: string
  prompt_text: string | null
  prompt_cn: string | null
  word_limit: string | null
  essay_type: string | null
  sample_essay: string | null
  tips: string | null
  difficulty: number
}

export interface WritingSubmission {
  id: number
  prompt_id: number
  prompt_title: string
  essay_text: string
  word_count: number | null
  ai_score: number | null
  ai_feedback: string | null
  grammar_issues: string | null
  vocabulary_suggestions: string | null
  structure_feedback: string | null
  created_at: string | null
}

export const writingApi = {
  listPrompts: (essayType?: string, difficulty?: number) =>
    client.get<ApiResponse<WritingPrompt[]>>('/writing/prompts', {
      params: { essay_type: essayType || '', difficulty: difficulty || 0 },
    }),

  getPrompt: (id: number) =>
    client.get<ApiResponse<WritingPrompt>>(`/writing/prompts/${id}`),

  submit: (promptId: number, essayText: string) =>
    client.post<ApiResponse<WritingSubmission>>('/writing/submit', {
      prompt_id: promptId,
      essay_text: essayText,
    }),

  getSubmission: (id: number) =>
    client.get<ApiResponse<WritingSubmission>>(`/writing/submissions/${id}`),

  listSubmissions: () =>
    client.get<ApiResponse<WritingSubmission[]>>('/writing/submissions'),
}
