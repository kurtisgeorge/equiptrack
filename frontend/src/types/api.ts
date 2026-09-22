export type ApiError = {
  message: string
  status: number
  details?: unknown
}

export type ApiSuccess<T> = {
  data: T
}

export type Nullable<T> = T | null
