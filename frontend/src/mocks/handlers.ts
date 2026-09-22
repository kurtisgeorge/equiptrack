import { http, HttpResponse } from 'msw'
import type { ActivityEvent } from '../types/activity'
import type { Session } from '../types/auth'
import type { AdminSummary, FieldSummary, MaintenanceSummary } from '../types/dashboard'
import type { CreateEquipmentDTO, Equipment, EquipmentStatus, UpdateEquipmentDTO } from '../types/equipment'
import type {
  CreateRentalRequestDTO,
  Rental,
  RentalDetail,
  RentalStatus,
  RentalStatusEvent,
  UpdateRentalStatusDTO,
} from '../types/rental'
import type { CreateServiceLogEntryDTO, ServiceLogEntry } from '../types/serviceLog'

type MockUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'field' | 'maintenance'
}

const users: MockUser[] = [
  { id: 'admin-1', name: 'Avery Sloan', email: 'avery@equiptrack.io', role: 'admin' },
  { id: 'field-1', name: 'Jordan Vega', email: 'jordan@equiptrack.io', role: 'field' },
  { id: 'field-2', name: 'Samir Patel', email: 'samir@equiptrack.io', role: 'field' },
  { id: 'maintenance-1', name: 'Maya Chen', email: 'maya@equiptrack.io', role: 'maintenance' },
]

let equipmentDb: Equipment[] = [
  { id: 'eq-1', name: 'Mini Excavator E35', category: 'Earthmoving', status: 'available', qrCode: 'QR-EQ-001', lastServiceDate: '2025-12-10', maintenanceIntervalDays: 90, nextServiceDueDate: '2026-03-10', notes: 'Primary trenching unit' },
  { id: 'eq-2', name: 'Wheel Loader 244L', category: 'Earthmoving', status: 'in_use', qrCode: 'QR-EQ-002', lastServiceDate: '2025-11-20', maintenanceIntervalDays: 60, nextServiceDueDate: '2026-02-10' },
  { id: 'eq-3', name: 'Scissor Lift 26ft', category: 'Access', status: 'maintenance', qrCode: 'QR-EQ-003', lastServiceDate: '2025-10-12', maintenanceIntervalDays: 90, nextServiceDueDate: '2026-02-02', notes: 'Hydraulic leak follow-up' },
  { id: 'eq-4', name: 'Crawler Dozer D2', category: 'Earthmoving', status: 'available', qrCode: 'QR-EQ-004', lastServiceDate: '2025-09-20', maintenanceIntervalDays: 120, nextServiceDueDate: '2026-03-19' },
  { id: 'eq-5', name: 'Backhoe Loader 420', category: 'Earthmoving', status: 'available', qrCode: 'QR-EQ-005', lastServiceDate: '2025-12-28', maintenanceIntervalDays: 60, nextServiceDueDate: '2026-02-26' },
  { id: 'eq-6', name: 'Skid Steer S66', category: 'Earthmoving', status: 'in_use', qrCode: 'QR-EQ-006', lastServiceDate: '2025-11-18', maintenanceIntervalDays: 45, nextServiceDueDate: '2026-02-02' },
  { id: 'eq-7', name: 'Compactor CS12', category: 'Compaction', status: 'available', qrCode: 'QR-EQ-007', lastServiceDate: '2025-12-22', maintenanceIntervalDays: 90, nextServiceDueDate: '2026-03-22' },
  { id: 'eq-8', name: 'Forklift FL-20', category: 'Material Handling', status: 'maintenance', qrCode: 'QR-EQ-008', lastServiceDate: '2025-10-05', maintenanceIntervalDays: 60, nextServiceDueDate: '2026-01-31', notes: 'Brake replacement pending' },
  { id: 'eq-9', name: 'Concrete Mixer MX-9', category: 'Concrete', status: 'available', qrCode: 'QR-EQ-009', lastServiceDate: '2026-01-01', maintenanceIntervalDays: 60, nextServiceDueDate: '2026-03-02' },
  { id: 'eq-10', name: 'Telehandler TH-3510', category: 'Material Handling', status: 'available', qrCode: 'QR-EQ-010', lastServiceDate: '2025-11-15', maintenanceIntervalDays: 90, nextServiceDueDate: '2026-02-13' },
  { id: 'eq-11', name: 'Dump Truck DT-12', category: 'Transportation', status: 'in_use', qrCode: 'QR-EQ-011', lastServiceDate: '2025-11-29', maintenanceIntervalDays: 60, nextServiceDueDate: '2026-01-28' },
  { id: 'eq-12', name: 'Trencher TRX-16', category: 'Earthmoving', status: 'available', qrCode: 'QR-EQ-012', lastServiceDate: '2025-12-15', maintenanceIntervalDays: 60, nextServiceDueDate: '2026-02-13' },
  { id: 'eq-13', name: 'Boom Lift Z-45', category: 'Access', status: 'available', qrCode: 'QR-EQ-013', lastServiceDate: '2025-11-25', maintenanceIntervalDays: 90, nextServiceDueDate: '2026-02-23' },
  { id: 'eq-14', name: 'Plate Compactor PC-80', category: 'Compaction', status: 'available', qrCode: 'QR-EQ-014', lastServiceDate: '2026-01-10', maintenanceIntervalDays: 60, nextServiceDueDate: '2026-03-11' },
  { id: 'eq-15', name: 'Generator G-45', category: 'Power', status: 'available', qrCode: 'QR-EQ-015', lastServiceDate: '2025-11-21', maintenanceIntervalDays: 30, nextServiceDueDate: '2026-02-05' },
  { id: 'eq-16', name: 'Light Tower LT-4000', category: 'Power', status: 'available', qrCode: 'QR-EQ-016', lastServiceDate: '2025-12-30', maintenanceIntervalDays: 45, nextServiceDueDate: '2026-02-13' },
  { id: 'eq-17', name: 'Water Truck WT-2000', category: 'Transportation', status: 'in_use', qrCode: 'QR-EQ-017', lastServiceDate: '2025-11-19', maintenanceIntervalDays: 60, nextServiceDueDate: '2026-01-18' },
  { id: 'eq-18', name: 'Asphalt Roller AR-90', category: 'Compaction', status: 'available', qrCode: 'QR-EQ-018', lastServiceDate: '2025-12-01', maintenanceIntervalDays: 60, nextServiceDueDate: '2026-01-30' },
  { id: 'eq-19', name: 'Air Compressor AC-185', category: 'Power', status: 'maintenance', qrCode: 'QR-EQ-019', lastServiceDate: '2025-10-25', maintenanceIntervalDays: 60, nextServiceDueDate: '2026-01-23' },
  { id: 'eq-20', name: 'Survey Drone SD-3', category: 'Survey', status: 'available', qrCode: 'QR-EQ-020', lastServiceDate: '2026-01-14', notes: 'No fixed interval yet' },
]

let serviceLogsDb: ServiceLogEntry[] = [
  { id: 'log-1', equipmentId: 'eq-3', date: '2026-01-20', note: 'Hydraulic hose replaced', performedByUserId: 'maintenance-1' },
  { id: 'log-2', equipmentId: 'eq-8', date: '2026-01-18', note: 'Brake inspection and adjustment', performedByUserId: 'maintenance-1' },
  { id: 'log-3', equipmentId: 'eq-11', date: '2026-01-10', note: 'Oil and filter change', performedByUserId: 'maintenance-1' },
  { id: 'log-4', equipmentId: 'eq-15', date: '2026-01-15', note: 'Routine generator tune-up', performedByUserId: 'maintenance-1' },
]

let activityDb: ActivityEvent[] = [
  { id: 'act-1', equipmentId: 'eq-2', type: 'checkout', timestamp: '2026-01-25T12:00:00.000Z', actorUserId: 'admin-1', summary: 'Assigned to active rental request' },
  { id: 'act-2', equipmentId: 'eq-3', type: 'service', timestamp: '2026-01-20T09:30:00.000Z', actorUserId: 'maintenance-1', summary: 'Hydraulic hose replaced' },
  { id: 'act-3', equipmentId: 'eq-8', type: 'issue', timestamp: '2026-01-17T13:10:00.000Z', actorUserId: 'field-2', summary: 'Reported intermittent brake response' },
  { id: 'act-4', equipmentId: 'eq-11', type: 'checkout', timestamp: '2026-01-21T11:20:00.000Z', actorUserId: 'admin-1', summary: 'Approved for active use' },
  { id: 'act-5', equipmentId: 'eq-17', type: 'checkout', timestamp: '2026-01-15T08:00:00.000Z', actorUserId: 'field-1', summary: 'Checked out by field user' },
]

let rentalsDb: Rental[] = [
  {
    id: 'rent-1',
    equipmentId: 'eq-2',
    equipmentTypeId: 'type-1',
    equipmentName: 'Wheel Loader 244L',
    requestedBy: 'field-1',
    requestedByName: 'Jordan Vega',
    status: 'active',
    startDate: '2026-01-28',
    endDate: '2026-02-10',
    createdAt: '2026-01-24T10:15:00.000Z',
    updatedAt: '2026-01-25T12:00:00.000Z',
  },
  {
    id: 'rent-2',
    equipmentId: 'eq-6',
    equipmentTypeId: 'type-2',
    equipmentName: 'Skid Steer S66',
    requestedBy: 'field-2',
    requestedByName: 'Samir Patel',
    status: 'active',
    startDate: '2026-01-30',
    endDate: '2026-02-08',
    notes: 'Site prep for block C',
    createdAt: '2026-01-21T09:00:00.000Z',
    updatedAt: '2026-01-22T08:05:00.000Z',
  },
  {
    id: 'rent-3',
    equipmentId: 'eq-11',
    equipmentTypeId: 'type-3',
    equipmentName: 'Dump Truck DT-12',
    requestedBy: 'field-1',
    requestedByName: 'Jordan Vega',
    status: 'active',
    startDate: '2026-01-27',
    endDate: '2026-02-05',
    createdAt: '2026-01-20T13:20:00.000Z',
    updatedAt: '2026-01-21T11:20:00.000Z',
  },
  {
    id: 'rent-4',
    equipmentId: 'eq-5',
    equipmentTypeId: 'type-4',
    equipmentName: 'Backhoe Loader 420',
    requestedBy: 'field-2',
    requestedByName: 'Samir Patel',
    status: 'pending',
    startDate: '2026-02-08',
    endDate: '2026-02-14',
    createdAt: '2026-02-03T08:00:00.000Z',
    updatedAt: '2026-02-03T08:00:00.000Z',
  },
]

const rentalTimelineDb: Record<string, RentalStatusEvent[]> = {
  'rent-1': [
    { label: 'Requested', at: '2026-01-24T10:15:00.000Z' },
    { label: 'Approved', at: '2026-01-25T12:00:00.000Z' },
  ],
  'rent-2': [
    { label: 'Requested', at: '2026-01-21T09:00:00.000Z' },
    { label: 'Approved', at: '2026-01-22T08:05:00.000Z' },
  ],
  'rent-3': [
    { label: 'Requested', at: '2026-01-20T13:20:00.000Z' },
    { label: 'Approved', at: '2026-01-21T11:20:00.000Z' },
  ],
  'rent-4': [{ label: 'Requested', at: '2026-02-03T08:00:00.000Z' }],
}

function nowIso() {
  return new Date().toISOString()
}

function dateOnly(isoDate: string) {
  return isoDate.slice(0, 10)
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function calculateNextDueDate(item: Equipment, overrideNextDueDate?: string) {
  if (overrideNextDueDate) return overrideNextDueDate
  if (item.maintenanceIntervalDays) {
    return dateOnly(addDays(new Date(), item.maintenanceIntervalDays).toISOString())
  }
  return undefined
}

function countEquipmentByStatus() {
  return equipmentDb.reduce(
    (acc, item) => {
      acc[item.status] += 1
      return acc
    },
    {
      available: 0,
      in_use: 0,
      maintenance: 0,
    } as Record<EquipmentStatus, number>,
  )
}

function addActivityEvent(payload: Omit<ActivityEvent, 'id'>) {
  const event: ActivityEvent = {
    id: `act-${crypto.randomUUID()}`,
    ...payload,
  }
  activityDb = [event, ...activityDb]
  return event
}

function getEquipmentName(equipmentId: string) {
  return equipmentDb.find((item) => item.id === equipmentId)?.name ?? 'Equipment'
}

export const handlers = [
  http.post('*/api/auth/login', async ({ request }) => {
    const payload = (await request.json()) as { role?: MockUser['role'] }

    if (!payload.role) {
      return HttpResponse.json({ message: 'Role is required.' }, { status: 400 })
    }

    const user = users.find((entry) => entry.role === payload.role)

    if (!user) {
      return HttpResponse.json({ message: 'User not found for role.' }, { status: 404 })
    }

    const session: Session = {
      token: `mock-token-${user.role}`,
      user,
    }

    return HttpResponse.json(session, { status: 200 })
  }),

  http.get('*/api/users', ({ request }) => {
    const url = new URL(request.url)
    const role = url.searchParams.get('role') as MockUser['role'] | null

    const filteredUsers = role ? users.filter((user) => user.role === role) : users
    return HttpResponse.json(filteredUsers)
  }),

  http.get('*/api/dashboard/admin-summary', () => {
    const byStatus = countEquipmentByStatus()

    const response: AdminSummary = {
      totalEquipment: equipmentDb.length,
      byStatus,
      pendingRentalRequests: rentalsDb.filter((rental) => rental.status === 'pending').length,
      activeRentals: rentalsDb.filter((rental) => rental.status === 'active').length,
    }

    return HttpResponse.json(response)
  }),

  http.get('*/api/dashboard/field-summary', ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return HttpResponse.json({ message: 'userId is required.' }, { status: 400 })
    }

    const response: FieldSummary = {
      myPendingRequests: rentalsDb.filter(
        (rental) => rental.requestedBy === userId && rental.status === 'pending',
      ).length,
      myActiveRentals: rentalsDb.filter(
        (rental) => rental.requestedBy === userId && rental.status === 'active',
      ).length,
      recommendedEquipmentIds: equipmentDb
        .filter((equipment) => equipment.status === 'available')
        .slice(0, 4)
        .map((equipment) => equipment.id),
    }

    return HttpResponse.json(response)
  }),

  http.get('*/api/dashboard/maintenance-summary', () => {
    const byStatus = countEquipmentByStatus()

    const response: MaintenanceSummary = {
      maintenanceEquipment: byStatus.maintenance,
      availableEquipment: byStatus.available,
      inUseEquipment: byStatus.in_use,
    }

    return HttpResponse.json(response)
  }),

  http.get('*/api/equipment', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase().trim() ?? ''
    const status = url.searchParams.get('status') as EquipmentStatus | null
    const category = url.searchParams.get('category')?.toLowerCase().trim() ?? ''

    const filtered = equipmentDb.filter((item) => {
      const matchesSearch = search.length === 0 || item.name.toLowerCase().includes(search)
      const matchesStatus = !status || item.status === status
      const matchesCategory = category.length === 0 || item.category.toLowerCase() === category
      return matchesSearch && matchesStatus && matchesCategory
    })

    return HttpResponse.json(filtered)
  }),

  http.get('*/api/equipment/:id', ({ params }) => {
    const id = String(params.id)
    const equipment = equipmentDb.find((item) => item.id === id)

    if (!equipment) {
      return HttpResponse.json({ message: 'Equipment not found.' }, { status: 404 })
    }

    return HttpResponse.json(equipment)
  }),

  http.post('*/api/equipment', async ({ request }) => {
    const payload = (await request.json()) as CreateEquipmentDTO

    if (!payload.name?.trim() || !payload.category?.trim() || !payload.qrCode?.trim()) {
      return HttpResponse.json({ message: 'Name, category, and QR code are required.' }, { status: 400 })
    }

    const newEquipment: Equipment = {
      id: `eq-${crypto.randomUUID()}`,
      name: payload.name.trim(),
      category: payload.category.trim(),
      status: payload.status,
      qrCode: payload.qrCode.trim(),
      lastServiceDate: payload.lastServiceDate,
      maintenanceIntervalDays: payload.maintenanceIntervalDays,
      nextServiceDueDate: payload.nextServiceDueDate,
      notes: payload.notes,
    }

    equipmentDb = [newEquipment, ...equipmentDb]

    addActivityEvent({
      equipmentId: newEquipment.id,
      type: 'status_change',
      timestamp: nowIso(),
      actorUserId: 'admin-1',
      summary: 'Equipment record created',
    })

    return HttpResponse.json(newEquipment, { status: 201 })
  }),

  http.put('*/api/equipment/:id', async ({ params, request }) => {
    const id = String(params.id)
    const updates = (await request.json()) as UpdateEquipmentDTO

    const index = equipmentDb.findIndex((item) => item.id === id)
    if (index < 0) {
      return HttpResponse.json({ message: 'Equipment not found.' }, { status: 404 })
    }

    equipmentDb[index] = {
      ...equipmentDb[index],
      ...updates,
      name: updates.name?.trim() || equipmentDb[index].name,
      category: updates.category?.trim() || equipmentDb[index].category,
      qrCode: updates.qrCode?.trim() || equipmentDb[index].qrCode,
    }

    addActivityEvent({
      equipmentId: id,
      type: 'status_change',
      timestamp: nowIso(),
      actorUserId: 'admin-1',
      summary: 'Equipment profile updated',
    })

    return HttpResponse.json(equipmentDb[index])
  }),

  http.patch('*/api/equipment/:id/status', async ({ params, request }) => {
    const id = String(params.id)
    const payload = (await request.json()) as { status?: EquipmentStatus; actorUserId?: string }

    const index = equipmentDb.findIndex((item) => item.id === id)
    if (index < 0) {
      return HttpResponse.json({ message: 'Equipment not found.' }, { status: 404 })
    }

    if (!payload.status) {
      return HttpResponse.json({ message: 'Status is required.' }, { status: 400 })
    }

    equipmentDb[index] = {
      ...equipmentDb[index],
      status: payload.status,
    }

    addActivityEvent({
      equipmentId: id,
      type: 'status_change',
      timestamp: nowIso(),
      actorUserId: payload.actorUserId ?? 'admin-1',
      summary: `Status changed to ${payload.status.replace('_', ' ')}`,
    })

    return HttpResponse.json(equipmentDb[index])
  }),

  http.post('*/api/equipment/:id/checkout', async ({ params, request }) => {
    const id = String(params.id)
    const payload = (await request.json()) as { actorUserId?: string }
    const equipmentIndex = equipmentDb.findIndex((item) => item.id === id)

    if (equipmentIndex < 0) {
      return HttpResponse.json({ message: 'Equipment not found.' }, { status: 404 })
    }

    if (equipmentDb[equipmentIndex].status !== 'available') {
      return HttpResponse.json({ message: 'Only available equipment can be checked out.' }, { status: 400 })
    }

    equipmentDb[equipmentIndex] = {
      ...equipmentDb[equipmentIndex],
      status: 'in_use',
    }

    addActivityEvent({
      equipmentId: id,
      type: 'checkout',
      timestamp: nowIso(),
      actorUserId: payload.actorUserId ?? 'field-1',
      summary: 'Checked out for field use',
    })

    return HttpResponse.json(equipmentDb[equipmentIndex])
  }),

  http.post('*/api/equipment/:id/checkin', async ({ params, request }) => {
    const id = String(params.id)
    const payload = (await request.json()) as { actorUserId?: string }
    const equipmentIndex = equipmentDb.findIndex((item) => item.id === id)

    if (equipmentIndex < 0) {
      return HttpResponse.json({ message: 'Equipment not found.' }, { status: 404 })
    }

    if (equipmentDb[equipmentIndex].status !== 'in_use') {
      return HttpResponse.json({ message: 'Only in-use equipment can be checked in.' }, { status: 400 })
    }

    equipmentDb[equipmentIndex] = {
      ...equipmentDb[equipmentIndex],
      status: 'available',
    }

    addActivityEvent({
      equipmentId: id,
      type: 'checkin',
      timestamp: nowIso(),
      actorUserId: payload.actorUserId ?? 'field-1',
      summary: 'Checked in and returned to availability',
    })

    return HttpResponse.json(equipmentDb[equipmentIndex])
  }),

  http.post('*/api/equipment/:id/mark-serviced', async ({ params, request }) => {
    const id = String(params.id)
    const payload = (await request.json()) as { performedByUserId?: string; nextServiceDueDate?: string }
    const equipmentIndex = equipmentDb.findIndex((item) => item.id === id)

    if (equipmentIndex < 0) {
      return HttpResponse.json({ message: 'Equipment not found.' }, { status: 404 })
    }

    const equipment = equipmentDb[equipmentIndex]
    const nextServiceDueDate = calculateNextDueDate(equipment, payload.nextServiceDueDate)

    if (!nextServiceDueDate) {
      return HttpResponse.json(
        { message: 'Provide nextServiceDueDate when maintenanceIntervalDays is not set.' },
        { status: 400 },
      )
    }

    const today = dateOnly(nowIso())

    equipmentDb[equipmentIndex] = {
      ...equipment,
      status: equipment.status === 'maintenance' ? 'available' : equipment.status,
      lastServiceDate: today,
      nextServiceDueDate,
    }

    serviceLogsDb = [
      {
        id: `log-${crypto.randomUUID()}`,
        equipmentId: id,
        date: today,
        note: 'Routine service completed',
        performedByUserId: payload.performedByUserId ?? 'maintenance-1',
      },
      ...serviceLogsDb,
    ]

    addActivityEvent({
      equipmentId: id,
      type: 'service',
      timestamp: nowIso(),
      actorUserId: payload.performedByUserId ?? 'maintenance-1',
      summary: 'Marked serviced and updated next due date',
    })

    return HttpResponse.json(equipmentDb[equipmentIndex])
  }),

  http.get('*/api/equipment/:id/service-logs', ({ params }) => {
    const id = String(params.id)
    const logs = serviceLogsDb
      .filter((entry) => entry.equipmentId === id)
      .sort((a, b) => (a.date < b.date ? 1 : -1))

    return HttpResponse.json(logs)
  }),

  http.post('*/api/equipment/:id/service-logs', async ({ params, request }) => {
    const id = String(params.id)
    const payload = (await request.json()) as CreateServiceLogEntryDTO
    const equipmentExists = equipmentDb.some((item) => item.id === id)

    if (!equipmentExists) {
      return HttpResponse.json({ message: 'Equipment not found.' }, { status: 404 })
    }

    if (!payload.note?.trim() || !payload.date) {
      return HttpResponse.json({ message: 'Date and note are required.' }, { status: 400 })
    }

    const entry: ServiceLogEntry = {
      id: `log-${crypto.randomUUID()}`,
      equipmentId: id,
      date: payload.date,
      note: payload.note.trim(),
      performedByUserId: payload.performedByUserId,
    }

    serviceLogsDb = [entry, ...serviceLogsDb]

    addActivityEvent({
      equipmentId: id,
      type: 'service',
      timestamp: nowIso(),
      actorUserId: payload.performedByUserId,
      summary: payload.note.trim(),
    })

    return HttpResponse.json(entry, { status: 201 })
  }),

  http.get('*/api/equipment/:id/activity', ({ params, request }) => {
    const id = String(params.id)
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '10')

    const events = activityDb
      .filter((event) => event.equipmentId === id)
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      .slice(0, Number.isNaN(limit) ? 10 : limit)

    return HttpResponse.json(events)
  }),

  http.get('*/api/maintenance/queue', ({ request }) => {
    const url = new URL(request.url)
    const days = Number(url.searchParams.get('days') ?? '14')
    const now = new Date()
    const cutoff = addDays(now, Number.isNaN(days) ? 14 : days)

    const queue = equipmentDb.filter((item) => {
      if (!item.nextServiceDueDate) return false
      const due = new Date(item.nextServiceDueDate)
      if (Number.isNaN(due.getTime())) return false
      return due <= cutoff
    })

    return HttpResponse.json(queue)
  }),

  http.delete('*/api/equipment/:id', ({ params }) => {
    const id = String(params.id)
    const index = equipmentDb.findIndex((item) => item.id === id)

    if (index < 0) {
      return HttpResponse.json({ message: 'Equipment not found.' }, { status: 404 })
    }

    const hasOpenRental = rentalsDb.some(
      (rental) => rental.equipmentId === id && ['pending', 'active'].includes(rental.status),
    )

    if (hasOpenRental) {
      return HttpResponse.json(
        { message: 'Cannot delete equipment with pending or active rentals.' },
        { status: 409 },
      )
    }

    equipmentDb.splice(index, 1)

    addActivityEvent({
      equipmentId: id,
      type: 'status_change',
      timestamp: nowIso(),
      actorUserId: 'admin-1',
      summary: `Equipment ${getEquipmentName(id)} deleted`,
    })

    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/rentals', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as RentalStatus | null
    const requestedBy = url.searchParams.get('requestedBy')

    const filtered = rentalsDb.filter((rental) => {
      const matchesStatus = !status || rental.status === status
      const matchesRequester = !requestedBy || rental.requestedBy === requestedBy
      return matchesStatus && matchesRequester
    })

    return HttpResponse.json(filtered)
  }),

  http.get('*/api/rentals/:id', ({ params }) => {
    const id = String(params.id)
    const rental = rentalsDb.find((item) => item.id === id)

    if (!rental) {
      return HttpResponse.json({ message: 'Rental not found.' }, { status: 404 })
    }

    const detail: RentalDetail = {
      ...rental,
      timeline: rentalTimelineDb[id] ?? [{ label: 'Requested', at: rental.createdAt }],
    }

    return HttpResponse.json(detail)
  }),

  http.post('*/api/rentals', async ({ request }) => {
    const payload = (await request.json()) as CreateRentalRequestDTO
    const equipment = equipmentDb.find((item) => item.id === payload.equipmentId)
    const requester = users.find((user) => user.id === payload.requestedBy)

    if (!equipment) {
      return HttpResponse.json({ message: 'Equipment not found.' }, { status: 404 })
    }

    if (!requester || requester.role !== 'field') {
      return HttpResponse.json({ message: 'Only a field user can request rentals.' }, { status: 403 })
    }

    if (equipment.status !== 'available') {
      return HttpResponse.json({ message: 'Equipment is not available for rental.' }, { status: 400 })
    }

    const createdAt = nowIso()
    const rental: Rental = {
      id: `rent-${crypto.randomUUID()}`,
      equipmentId: equipment.id,
      equipmentTypeId: 'mock-type',
      equipmentName: equipment.name,
      requestedBy: requester.id,
      requestedByName: requester.name,
      status: 'pending',
      startDate: payload.startDate,
      endDate: payload.endDate,
      notes: payload.notes,
      createdAt,
      updatedAt: createdAt,
    }

    rentalsDb = [rental, ...rentalsDb]
    rentalTimelineDb[rental.id] = [{ label: 'Requested', at: createdAt }]

    return HttpResponse.json(rental, { status: 201 })
  }),

  http.patch('*/api/rentals/:id/status', async ({ params, request }) => {
    const id = String(params.id)
    const payload = (await request.json()) as UpdateRentalStatusDTO
    const rentalIndex = rentalsDb.findIndex((item) => item.id === id)

    if (rentalIndex < 0) {
      return HttpResponse.json({ message: 'Rental not found.' }, { status: 404 })
    }

    const rental = rentalsDb[rentalIndex]
    const equipmentIndex = equipmentDb.findIndex((item) => item.id === rental.equipmentId)

    if (equipmentIndex < 0) {
      return HttpResponse.json({ message: 'Linked equipment not found.' }, { status: 404 })
    }

    if (payload.status === 'active') {
      if (rental.status !== 'pending') {
        return HttpResponse.json({ message: 'Only pending rentals can be approved.' }, { status: 400 })
      }

      if (equipmentDb[equipmentIndex].status !== 'available') {
        return HttpResponse.json(
          { message: 'Equipment is no longer available for approval.' },
          { status: 409 },
        )
      }

      equipmentDb[equipmentIndex] = {
        ...equipmentDb[equipmentIndex],
        status: 'in_use',
      }

      rentalsDb[rentalIndex] = {
        ...rental,
        status: 'active',
        updatedAt: nowIso(),
      }
      rentalTimelineDb[id] = [
        ...(rentalTimelineDb[id] ?? []),
        { label: 'Approved', at: rentalsDb[rentalIndex].updatedAt },
      ]

      addActivityEvent({
        equipmentId: rental.equipmentId,
        type: 'checkout',
        timestamp: nowIso(),
        actorUserId: 'admin-1',
        summary: 'Rental approved and equipment checked out',
      })

      return HttpResponse.json(rentalsDb[rentalIndex])
    }

    if (payload.status === 'rejected') {
      if (rental.status !== 'pending') {
        return HttpResponse.json({ message: 'Only pending rentals can be rejected.' }, { status: 400 })
      }

      rentalsDb[rentalIndex] = {
        ...rental,
        status: 'rejected',
        updatedAt: nowIso(),
      }
      rentalTimelineDb[id] = [
        ...(rentalTimelineDb[id] ?? []),
        { label: 'Rejected', at: rentalsDb[rentalIndex].updatedAt },
      ]

      return HttpResponse.json(rentalsDb[rentalIndex])
    }

    if (payload.status === 'returned') {
      if (rental.status !== 'active') {
        return HttpResponse.json({ message: 'Only active rentals can be returned.' }, { status: 400 })
      }

      equipmentDb[equipmentIndex] = {
        ...equipmentDb[equipmentIndex],
        status: 'available',
      }

      rentalsDb[rentalIndex] = {
        ...rental,
        status: 'returned',
        updatedAt: nowIso(),
      }
      rentalTimelineDb[id] = [
        ...(rentalTimelineDb[id] ?? []),
        { label: 'Returned', at: rentalsDb[rentalIndex].updatedAt },
      ]

      addActivityEvent({
        equipmentId: rental.equipmentId,
        type: 'checkin',
        timestamp: nowIso(),
        actorUserId: 'admin-1',
        summary: 'Rental returned and equipment checked in',
      })

      return HttpResponse.json(rentalsDb[rentalIndex])
    }

    return HttpResponse.json({ message: 'Unsupported status transition.' }, { status: 400 })
  }),
]
