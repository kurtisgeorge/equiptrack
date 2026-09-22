import { apiClient } from './apiClient'
import type {
  CreateRentalRequestDTO,
  Rental,
  RentalDetail,
  RentalStatus,
  UpdateRentalStatusDTO,
} from '../types/rental'

export type ListRentalsParams = {
  status?: RentalStatus | 'all'
  requestedBy?: string
}

export function listRentals(params?: ListRentalsParams): Promise<Rental[]> {
  const searchParams = new URLSearchParams()

  if (params?.status && params.status !== 'all') searchParams.set('status', params.status)
  if (params?.requestedBy) searchParams.set('requestedBy', params.requestedBy)

  const queryString = searchParams.toString()
  return apiClient.get<Rental[]>(`/api/rentals${queryString ? `?${queryString}` : ''}`)
}

export function getRentalById(id: string): Promise<RentalDetail> {
  return apiClient.get<RentalDetail>(`/api/rentals/${id}`)
}

export function createRentalRequest(dto: CreateRentalRequestDTO): Promise<Rental> {
  return apiClient.post<Rental, CreateRentalRequestDTO>('/api/rentals', dto)
}

export function updateRentalStatus(
  id: string,
  dto: UpdateRentalStatusDTO,
): Promise<Rental> {
  return apiClient.patch<Rental, UpdateRentalStatusDTO>(`/api/rentals/${id}/status`, dto)
}
