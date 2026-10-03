export interface ApiResponse<T> {
  code: number
  data: T | null
  message: string
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}

export interface PaginatedResponse<T> {
  code: number
  data: PaginatedData<T> | null
  message: string
}
