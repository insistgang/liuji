import client from './client'
import type { ApiResponse } from '../types/api'

export interface ExamPaper {
  id: number
  title: string
  exam_date: string | null
  exam_type: string
  total_score: number
  question_count: number
}

export interface ExamQuestion {
  id: number
  paper_id: number
  section: string
  question_num: number
  question_type: string
  content: string | null
  options: string[]
  correct_answer: string | null
  explanation: string | null
  audio_url: string | null
  points: number
}

export interface ExamAttempt {
  id: number
  paper_id: number
  score: number | null
  status: string
  started_at: string | null
  completed_at: string | null
}

export interface ExamResult {
  attempt_id: number
  paper_title: string
  total_score: number
  score: number
  section_scores: Record<string, number>
  time_spent: number
  questions: {
    question_id: number
    section: string
    question_num: number
    content: string
    user_answer: string
    correct_answer: string
    is_correct: boolean
    points: number
    earned_points: number
    explanation: string | null
  }[]
}

export const examApi = {
  list: () => client.get<ApiResponse<ExamPaper[]>>('/exams'),

  getPaper: (id: number) => client.get<ApiResponse<ExamPaper & { sections: Record<string, number> }>>(`/exams/${id}`),

  getSection: (paperId: number, section: string) =>
    client.get<ApiResponse<ExamQuestion[]>>(`/exams/${paperId}/sections/${section}`),

  start: (paperId: number) =>
    client.post<ApiResponse<ExamAttempt>>(`/exams/${paperId}/start`),

  submitAnswer: (attemptId: number, questionId: number, answer: string) =>
    client.post(`/exams/attempts/${attemptId}/answer`, { question_id: questionId, answer }),

  submitExam: (attemptId: number) =>
    client.post<ApiResponse<ExamResult>>(`/exams/attempts/${attemptId}/submit`),

  getResult: (attemptId: number) =>
    client.get<ApiResponse<ExamResult>>(`/exams/attempts/${attemptId}/result`),

  history: () => client.get<ApiResponse<ExamAttempt[]>>('/exams/history/list'),
}
