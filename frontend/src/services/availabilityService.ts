import { apiClient } from './apiClient'

export type UnitAvailabilityItem = {
  id: string
  assetTag: string
  status: string
  locationId: string | null
  nextMaintenanceDue: string | null
  isAvailable: boolean
  reason?: string
  message?: string
  nextAvailableDate?: string
}

export type TypeAvailabilityResponse = {
  equipmentTypeId: string
  startDate: string
  endDate: string
  locationId?: string
  totalUnits: number
  availableCount: number
  unavailableCount: number
  noUnitsAvailable: boolean
  noAvailabilityReason?: string
  nextAvailableDate?: string
  message?: string
  units: UnitAvailabilityItem[]
}

export function getAvailableUnitsForType(params: {
  equipmentTypeId: string
  startDate: string
  endDate?: string
  locationId?: string
}): Promise<TypeAvailabilityResponse> {
  const searchParams = new URLSearchParams()
  searchParams.set('startDate', params.startDate)
  if (params.endDate) searchParams.set('endDate', params.endDate)
  if (params.locationId) searchParams.set('locationId', params.locationId)

  const queryString = searchParams.toString()
  return apiClient.get<TypeAvailabilityResponse>(
    `/api/availability/types/${params.equipmentTypeId}/units?${queryString}`
  )
}
