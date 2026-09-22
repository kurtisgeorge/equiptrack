import { EquipmentStatus, RentalStatus } from "../db/enums"
import db from "../lib/db"

const OCCUPYING_RENTAL_STATUSES: RentalStatus[] = ["APPROVED", "RESERVED", "CHECKED_OUT", "OVERDUE"]
const HARD_BLOCK_EQUIPMENT_STATUSES: EquipmentStatus[] = ["IN_MAINTENANCE", "OUT_OF_SERVICE"]
const SOFT_BLOCK_EQUIPMENT_STATUSES: EquipmentStatus[] = ["DUE_SOON_MAINTENANCE"]

export type AvailabilityWindow = {
  start: Date
  end: Date
}

type UnitOverlapRental = {
  id: string
  requestedStart: Date
  requestedEnd: Date
  status: RentalStatus
}

type UnitForAvailability = {
  id: string
  assetTag: string
  status: EquipmentStatus
  equipmentTypeId: string
  locationId: string
  nextMaintenanceDue: Date | null
  rentals: UnitOverlapRental[]
}

type AvailabilityReason =
  | "MAINTENANCE_STATUS"
  | "MAINTENANCE_DUE_DURING_WINDOW"
  | "OVERLAPPING_RENTAL"
  | "LOCATION_MISMATCH"

export type UnitAvailabilityResult = {
  isAvailable: boolean
  reason?: AvailabilityReason
  message?: string
  nextAvailableDate?: string
}

export type TypeAvailabilityRow = {
  equipmentTypeId: string
  equipmentTypeName: string
  categoryName: string
  totalUnits: number
  availableUnits: number
  unavailableUnits: number
  available: boolean
  nextAvailableDate?: string
  noAvailabilityReason?: "NO_UNITS_MATCHED_LOCATION" | "NO_UNITS_AVAILABLE_IN_WINDOW"
}

function toIso(value: Date | null | undefined): string | undefined {
  if (!value) return undefined
  return value.toISOString()
}

export function parseAvailabilityWindow(startDate: string, endDate?: string): AvailabilityWindow {
  const start = new Date(startDate)
  const end = new Date(endDate ?? startDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date range")
  }

  if (end < start) {
    throw new Error("endDate must be on or after startDate")
  }

  return { start, end }
}

function overlapsRange(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA <= endB && startB <= endA
}

function nextDate(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000)
}

function getEarliestFrom(values: Date[]): Date | undefined {
  if (values.length === 0) return undefined
  let next = values[0]
  for (let i = 1; i < values.length; i++) {
    if (values[i] < next) next = values[i]
  }
  return next
}

function evaluateUnitAvailability(unit: UnitForAvailability, window: AvailabilityWindow, locationId?: string): UnitAvailabilityResult {
  if (locationId && unit.locationId !== locationId) {
    return {
      isAvailable: false,
      reason: "LOCATION_MISMATCH",
      message: "Unit is assigned to a different location",
    }
  }

  if (HARD_BLOCK_EQUIPMENT_STATUSES.includes(unit.status)) {
    return {
      isAvailable: false,
      reason: "MAINTENANCE_STATUS",
      message: "Unit is unavailable due to maintenance status",
    }
  }

  if (
    SOFT_BLOCK_EQUIPMENT_STATUSES.includes(unit.status) ||
    (unit.nextMaintenanceDue && unit.nextMaintenanceDue <= window.end)
  ) {
    return {
      isAvailable: false,
      reason: "MAINTENANCE_DUE_DURING_WINDOW",
      message: "Booking blocked because maintenance is due during the requested window",
      nextAvailableDate: toIso(unit.nextMaintenanceDue),
    }
  }

  const overlaps = unit.rentals.some((rental) =>
    overlapsRange(rental.requestedStart, rental.requestedEnd, window.start, window.end),
  )
  if (overlaps) {
    const overlapEndDates = unit.rentals
      .filter((rental) => overlapsRange(rental.requestedStart, rental.requestedEnd, window.start, window.end))
      .map((rental) => rental.requestedEnd)
    const latestOverlapEnd = overlapEndDates.length > 0 ? new Date(Math.max(...overlapEndDates.map((d) => d.getTime()))) : null

    return {
      isAvailable: false,
      reason: "OVERLAPPING_RENTAL",
      message: "Unit is already reserved or checked out during the requested window",
      nextAvailableDate: toIso(latestOverlapEnd ? nextDate(latestOverlapEnd) : undefined),
    }
  }

  return { isAvailable: true }
}

type UnitRow = {
  id: string
  assetTag: string
  status: EquipmentStatus
  equipmentTypeId: string
  locationId: string
  nextMaintenanceDue: string | null
  typeName: string
  categoryName: string
}

type RentalRow = {
  id: string
  requestedStart: string
  requestedEnd: string
  status: RentalStatus
  equipmentUnitId: string
}

async function loadUnitsForAvailability(input: {
  window: AvailabilityWindow
  locationId?: string
  equipmentTypeId?: string
  equipmentUnitId?: string
  excludeRentalId?: string
}) {
  const conditions: string[] = ["eu.isActive = 1"]
  const params: unknown[] = []

  if (input.locationId) {
    conditions.push("eu.locationId = ?")
    params.push(input.locationId)
  }
  if (input.equipmentTypeId) {
    conditions.push("eu.equipmentTypeId = ?")
    params.push(input.equipmentTypeId)
  }
  if (input.equipmentUnitId) {
    conditions.push("eu.id = ?")
    params.push(input.equipmentUnitId)
  }

  const unitRows = db.prepare(`
    SELECT eu.id, eu.assetTag, eu.status, eu.equipmentTypeId, eu.locationId,
           eu.nextMaintenanceDue, et.name AS typeName, ec.name AS categoryName
    FROM EquipmentUnit eu
    JOIN EquipmentType et ON eu.equipmentTypeId = et.id
    JOIN EquipmentCategory ec ON et.categoryId = ec.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY et.name ASC, eu.assetTag ASC
  `).all(...params) as UnitRow[]

  if (unitRows.length === 0) return []

  const unitIds = unitRows.map((u) => u.id)
  const placeholders = unitIds.map(() => "?").join(",")

  const rentalConditions = [
    `r.equipmentUnitId IN (${placeholders})`,
    `r.status IN (${OCCUPYING_RENTAL_STATUSES.map(() => "?").join(",")})`,
    "r.requestedStart <= ?",
    "r.requestedEnd >= ?",
  ]
  const rentalParams: unknown[] = [
    ...unitIds,
    ...OCCUPYING_RENTAL_STATUSES,
    input.window.end.toISOString(),
    input.window.start.toISOString(),
  ]

  if (input.excludeRentalId) {
    rentalConditions.push("r.id != ?")
    rentalParams.push(input.excludeRentalId)
  }

  const rentalRows = db.prepare(`
    SELECT r.id, r.requestedStart, r.requestedEnd, r.status, r.equipmentUnitId
    FROM Rental r
    WHERE ${rentalConditions.join(" AND ")}
  `).all(...rentalParams) as RentalRow[]

  const rentalsByUnit = new Map<string, UnitOverlapRental[]>()
  for (const r of rentalRows) {
    const list = rentalsByUnit.get(r.equipmentUnitId) ?? []
    list.push({
      id: r.id,
      requestedStart: new Date(r.requestedStart),
      requestedEnd: new Date(r.requestedEnd),
      status: r.status,
    })
    rentalsByUnit.set(r.equipmentUnitId, list)
  }

  return unitRows.map((u) => ({
    id: u.id,
    assetTag: u.assetTag,
    status: u.status,
    equipmentTypeId: u.equipmentTypeId,
    locationId: u.locationId,
    nextMaintenanceDue: u.nextMaintenanceDue ? new Date(u.nextMaintenanceDue) : null,
    rentals: rentalsByUnit.get(u.id) ?? [],
    equipmentType: {
      name: u.typeName,
      category: { name: u.categoryName },
    },
  }))
}

function getUnitNextDate(unit: UnitForAvailability, window: AvailabilityWindow): Date | undefined {
  const candidates: Date[] = []

  if (unit.rentals.length > 0) {
    const overlapEndDates = unit.rentals
      .filter((rental) => overlapsRange(rental.requestedStart, rental.requestedEnd, window.start, window.end))
      .map((rental) => rental.requestedEnd)
    if (overlapEndDates.length > 0) {
      candidates.push(nextDate(new Date(Math.max(...overlapEndDates.map((d) => d.getTime())))))
    }
  }

  if (unit.nextMaintenanceDue) {
    candidates.push(nextDate(unit.nextMaintenanceDue))
  }

  return getEarliestFrom(candidates)
}

export async function getAvailableQuantityByType(input: {
  startDate: string
  endDate?: string
  locationId?: string
}) {
  const window = parseAvailabilityWindow(input.startDate, input.endDate)
  const units = await loadUnitsForAvailability({
    window,
    locationId: input.locationId,
  })

  const byType = new Map<
    string,
    TypeAvailabilityRow & {
      nextDates: Date[]
    }
  >()

  for (const unit of units) {
    const existing = byType.get(unit.equipmentTypeId) ?? {
      equipmentTypeId: unit.equipmentTypeId,
      equipmentTypeName: unit.equipmentType.name,
      categoryName: unit.equipmentType.category.name,
      totalUnits: 0,
      availableUnits: 0,
      unavailableUnits: 0,
      available: false,
      nextDates: [],
    }

    existing.totalUnits += 1

    const evaluation = evaluateUnitAvailability(
      {
        id: unit.id,
        assetTag: unit.assetTag,
        status: unit.status,
        equipmentTypeId: unit.equipmentTypeId,
        locationId: unit.locationId,
        nextMaintenanceDue: unit.nextMaintenanceDue,
        rentals: unit.rentals,
      },
      window,
      input.locationId,
    )

    if (evaluation.isAvailable) {
      existing.availableUnits += 1
    } else {
      existing.unavailableUnits += 1
      const next = getUnitNextDate(
        {
          id: unit.id,
          assetTag: unit.assetTag,
          status: unit.status,
          equipmentTypeId: unit.equipmentTypeId,
          locationId: unit.locationId,
          nextMaintenanceDue: unit.nextMaintenanceDue,
          rentals: unit.rentals,
        },
        window,
      )
      if (next) existing.nextDates.push(next)
    }

    byType.set(unit.equipmentTypeId, existing)
  }

  const results: TypeAvailabilityRow[] = Array.from(byType.values()).map((row) => {
    const nextAvailableDate = getEarliestFrom(row.nextDates)

    return {
      equipmentTypeId: row.equipmentTypeId,
      equipmentTypeName: row.equipmentTypeName,
      categoryName: row.categoryName,
      totalUnits: row.totalUnits,
      availableUnits: row.availableUnits,
      unavailableUnits: row.unavailableUnits,
      available: row.availableUnits > 0,
      nextAvailableDate: toIso(nextAvailableDate),
      noAvailabilityReason:
        row.totalUnits === 0
          ? "NO_UNITS_MATCHED_LOCATION"
          : row.availableUnits === 0
            ? "NO_UNITS_AVAILABLE_IN_WINDOW"
            : undefined,
    }
  })

  return {
    startDate: window.start.toISOString(),
    endDate: window.end.toISOString(),
    locationId: input.locationId,
    results,
  }
}

export async function getAvailableUnitsForType(input: {
  equipmentTypeId: string
  startDate: string
  endDate?: string
  locationId?: string
}) {
  const window = parseAvailabilityWindow(input.startDate, input.endDate)
  const units = await loadUnitsForAvailability({
    window,
    equipmentTypeId: input.equipmentTypeId,
    locationId: input.locationId,
  })

  const unitResults = units.map((unit) => {
    const evaluation = evaluateUnitAvailability(
      {
        id: unit.id,
        assetTag: unit.assetTag,
        status: unit.status,
        equipmentTypeId: unit.equipmentTypeId,
        locationId: unit.locationId,
        nextMaintenanceDue: unit.nextMaintenanceDue,
        rentals: unit.rentals,
      },
      window,
      input.locationId,
    )

    return {
      id: unit.id,
      assetTag: unit.assetTag,
      status: unit.status,
      locationId: unit.locationId,
      nextMaintenanceDue: toIso(unit.nextMaintenanceDue),
      isAvailable: evaluation.isAvailable,
      reason: evaluation.reason,
      message: evaluation.message,
      nextAvailableDate: evaluation.nextAvailableDate,
    }
  })

  const availableUnits = unitResults.filter((item) => item.isAvailable)
  const unavailableUnits = unitResults.filter((item) => !item.isAvailable)
  const nextAvailableDate = getEarliestFrom(
    unavailableUnits
      .map((item) => (item.nextAvailableDate ? new Date(item.nextAvailableDate) : undefined))
      .filter((item): item is Date => Boolean(item)),
  )

  return {
    equipmentTypeId: input.equipmentTypeId,
    startDate: window.start.toISOString(),
    endDate: window.end.toISOString(),
    locationId: input.locationId,
    totalUnits: unitResults.length,
    availableCount: availableUnits.length,
    unavailableCount: unavailableUnits.length,
    noUnitsAvailable: availableUnits.length === 0,
    noAvailabilityReason: availableUnits.length === 0 ? "NO_UNITS_AVAILABLE_IN_WINDOW" : undefined,
    nextAvailableDate: toIso(nextAvailableDate),
    message:
      availableUnits.length === 0
        ? "No units are available for this type in the requested date range and location"
        : undefined,
    units: unitResults,
  }
}

export async function assertEquipmentUnitBookable(input: {
  equipmentUnitId: string
  startDate: Date
  endDate: Date
  locationId?: string
  excludeRentalId?: string
}) {
  const units = await loadUnitsForAvailability({
    window: { start: input.startDate, end: input.endDate },
    equipmentUnitId: input.equipmentUnitId,
    locationId: input.locationId,
    excludeRentalId: input.excludeRentalId,
  })

  const unit = units[0]
  if (!unit) {
    return {
      ok: false as const,
      statusCode: 404,
      message: "Equipment not found",
    }
  }

  const result = evaluateUnitAvailability(
    {
      id: unit.id,
      assetTag: unit.assetTag,
      status: unit.status,
      equipmentTypeId: unit.equipmentTypeId,
      locationId: unit.locationId,
      nextMaintenanceDue: unit.nextMaintenanceDue,
      rentals: unit.rentals,
    },
    { start: input.startDate, end: input.endDate },
    input.locationId,
  )

  if (!result.isAvailable) {
    return {
      ok: false as const,
      statusCode: 409,
      message: result.message ?? "Equipment unit is unavailable for requested window",
      reason: result.reason,
      nextAvailableDate: result.nextAvailableDate,
    }
  }

  return {
    ok: true as const,
    unit: {
      id: unit.id,
      equipmentTypeId: unit.equipmentTypeId,
      locationId: unit.locationId,
      status: unit.status,
    },
  }
}

export async function checkOverlap(unitId: string, start: Date, end: Date, excludeRentalId?: string): Promise<boolean> {
  const conditions = [
    "equipmentUnitId = ?",
    `status IN (${OCCUPYING_RENTAL_STATUSES.map(() => "?").join(",")})`,
    "requestedStart <= ?",
    "requestedEnd >= ?",
  ]
  const params: unknown[] = [unitId, ...OCCUPYING_RENTAL_STATUSES, end.toISOString(), start.toISOString()]

  if (excludeRentalId) {
    conditions.push("id != ?")
    params.push(excludeRentalId)
  }

  const row = db.prepare(
    `SELECT COUNT(*) as count FROM Rental WHERE ${conditions.join(" AND ")}`
  ).get(...params) as { count: number }

  return row.count > 0
}

export async function validateMaintenanceWindow(unitId: string, durationDays: number, startDate: Date = new Date()): Promise<boolean> {
  const unit = db.prepare(
    "SELECT nextMaintenanceDue, status FROM EquipmentUnit WHERE id = ?"
  ).get(unitId) as { nextMaintenanceDue: string | null; status: EquipmentStatus } | undefined

  if (!unit) return false

  if (HARD_BLOCK_EQUIPMENT_STATUSES.includes(unit.status) || SOFT_BLOCK_EQUIPMENT_STATUSES.includes(unit.status)) {
    return false
  }

  if (unit.nextMaintenanceDue) {
    const durationEnd = new Date(startDate)
    durationEnd.setDate(durationEnd.getDate() + durationDays)

    if (new Date(unit.nextMaintenanceDue) <= durationEnd) {
      return false
    }
  }

  return true
}

export { OCCUPYING_RENTAL_STATUSES }
