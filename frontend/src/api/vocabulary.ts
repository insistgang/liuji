import client from './client'
import { isStaticMode } from './runtime'
import { offlineApi } from './offline'
import type { ApiResponse, PaginatedResponse } from '../types/api'
import type { VocabularyWord, WordProgress, VocabProgressStats } from '../types/vocabulary'

export const vocabApi = {
  getWords: (page = 1, perPage = 20, search = '') => {
    if (isStaticMode) return offlineApi.getWords(page, perPage, search)
    return client.get<PaginatedResponse<VocabularyWord>>('/vocabulary/words', {
      params: { page, per_page: perPage, search },
    })
  },

  getNewWords: (count?: number) => {
    if (isStaticMode) return offlineApi.getNewWords(count)
    return client.get<ApiResponse<WordProgress[]>>('/vocabulary/learn/new', {
      params: count ? { count } : {},
    })
  },

  startLearning: (wordIds: number[]) => {
    if (isStaticMode) return offlineApi.startLearning(wordIds)
    return client.post<ApiResponse<WordProgress[]>>('/vocabulary/learn/start', wordIds)
  },

  getReviewWords: (limit?: number) => {
    if (isStaticMode) return offlineApi.getReviewWords(limit)
    return client.get<ApiResponse<WordProgress[]>>('/vocabulary/learn/review', {
      params: limit ? { limit } : {},
    })
  },

  submitReview: (wordId: number, quality: number) => {
    if (isStaticMode) return offlineApi.submitReview(wordId, quality)
    return client.post<ApiResponse<WordProgress>>('/vocabulary/review/submit', {
      word_id: wordId,
      quality,
    })
  },

  startQuiz: (count = 10) =>
    client.post<ApiResponse<Array<{ word_id: number; word: string; phonetic: string; part_of_speech: string; question_type: string; prompt: string; options: string[]; correct_answer: string }>>>('/vocabulary/quiz/start', null, {
      params: { count },
    }),

  getProgress: () => {
    if (isStaticMode) return offlineApi.getProgress()
    return client.get<ApiResponse<VocabProgressStats>>('/vocabulary/progress')
  },

  getWeakWords: (limit = 20) => {
    if (isStaticMode) return offlineApi.getWeakWords(limit)
    return client.get<ApiResponse<WordProgress[]>>('/vocabulary/progress/weak', {
      params: { limit },
    })
  },
}
