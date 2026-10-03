import client from './client'
import type { ApiResponse } from '../types/api'

export interface ListeningMaterial {
  id: number
  title: string
  section_type: string
  audio_url: string | null
  transcript: string | null
  difficulty: number
  duration: number
  source: string | null
  exercise_count: number
}

export interface ListeningExercise {
  id: number
  material_id: number
  question_text: string | null
  options: string[]
  correct_answer: string | null
  explanation: string | null
  timestamp: number
  sort_order: number | null
}

export interface ListeningDetail {
  material: ListeningMaterial
  exercises: ListeningExercise[]
}

export const listeningApi = {
  list: (sectionType?: string, difficulty?: number) =>
    client.get<ApiResponse<ListeningMaterial[]>>('/listening/materials', {
      params: { section_type: sectionType || '', difficulty: difficulty || 0 },
    }),

  getDetail: (id: number) =>
    client.get<ApiResponse<ListeningDetail>>(`/listening/materials/${id}`),
}
