import client from './client'
import type { ApiResponse, PaginatedResponse } from '../types/api'
import type { VocabularyWord, WordProgress, VocabProgressStats } from '../types/vocabulary'

export const vocabApi = {
  getWords: (page = 1, perPage = 20, search = '') =>
    client.get<PaginatedResponse<VocabularyWord>>('/vocabulary/words', {
      params: { page, per_page: perPage, search },
    }),

  getNewWords: (count?: number) =>
    client.get<ApiResponse<WordProgress[]>>('/vocabulary/learn/new', {
      params: count ? { count } : {},
    }),

  startLearning: (wordIds: number[]) =>
    client.post<ApiResponse<WordProgress[]>>('/vocabulary/learn/start', wordIds),

  getReviewWords: (limit?: number) =>
    client.get<ApiResponse<WordProgress[]>>('/vocabulary/learn/review', {
      params: limit ? { limit } : {},
    }),

  submitReview: (wordId: number, quality: number) =>
    client.post<ApiResponse<WordProgress>>('/vocabulary/review/submit', {
      word_id: wordId,
      quality,
    }),

  startQuiz: (count = 10) =>
    client.post<ApiResponse<any[]>>('/vocabulary/quiz/start', null, {
      params: { count },
    }),

  getProgress: () =>
    client.get<ApiResponse<VocabProgressStats>>('/vocabulary/progress'),

  getWeakWords: (limit = 20) =>
    client.get<ApiResponse<WordProgress[]>>('/vocabulary/progress/weak', {
      params: { limit },
    }),
}
