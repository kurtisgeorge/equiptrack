import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, X } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { Button } from '../../components/ui/button'
import { getSession } from '../../lib/auth'
import {
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type CalendarEvent,
  type CreateEventPayload,
  type VisibilityType,
} from '../../services/calendarService'
import { listUsers } from '../../services/userService'

const EVENT_COLORS = ['#3b82f6', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#ec4899', '#64748b']
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ROLE_OPTIONS = [
  { value: 'field', label: 'Field Users' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'admin', label: 'Admins' },
]

function pad(n: number) { return String(n).padStart(2, '0') }

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

function VisibilityBadge({ ev }: { ev: CalendarEvent }) {
  if (ev.visibilityType === 'ALL')
    return <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">Everyone</span>
  if (ev.visibilityType === 'ROLES')
    return <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">{ev.visibilityRoles.join(', ') || 'No roles'}</span>
  return <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2 py-0.5">{ev.visibilityUserIds.length} user{ev.visibilityUserIds.length !== 1 ? 's' : ''}</span>
}

function EventDialog({
  initialDate,
  event,
  onClose,
  onSaved,
}: {
  initialDate: string
  event: CalendarEvent | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [date, setDate] = useState(event?.date ?? initialDate)
  const [startTime, setStartTime] = useState(event?.startTime ?? '')
  const [endTime, setEndTime] = useState(event?.endTime ?? '')
  const [color, setColor] = useState(event?.color ?? '#3b82f6')
  const [visibilityType, setVisibilityType] = useState<VisibilityType>(event?.visibilityType ?? 'ALL')
  const [visibilityRoles, setVisibilityRoles] = useState<string[]>(event?.visibilityRoles ?? [])
  const [visibilityUserIds, setVisibilityUserIds] = useState<string[]>(event?.visibilityUserIds ?? [])

  const usersQuery = useQuery({
    queryKey: ['users-for-calendar'],
    queryFn: () => listUsers(),
    enabled: visibilityType === 'USERS',
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateEventPayload) => createCalendarEvent(payload),
    onSuccess: () => { toast.success('Event created.'); onSaved() },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<CreateEventPayload>) => updateCalendarEvent(event!.id, payload),
    onSuccess: () => { toast.success('Event updated.'); onSaved() },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: CreateEventPayload = {
      title,
      description: description || undefined,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      color,
      visibilityType,
      visibilityRoles: visibilityType === 'ROLES' ? visibilityRoles : [],
      visibilityUserIds: visibilityType === 'USERS' ? visibilityUserIds : [],
    }
    if (event) updateMutation.mutate(payload)
    else createMutation.mutate(payload)
  }

  function toggleRole(r: string) {
    setVisibilityRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }

  function toggleUser(id: string) {
    setVisibilityUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'rgb(var(--brand-navy-rgb))' }}>
          <span className="text-white font-semibold text-sm">{event ? 'Edit Event' : 'New Event'}</span>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Title *</label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event name"
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Date *</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Start</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">End</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Description</label>
            <textarea
              value={description as string}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={2}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Color</label>
            <div className="mt-1.5 flex gap-2">
              {EVENT_COLORS.map(c => (
                <button type="button" key={c} onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-slate-600 scale-110' : 'hover:scale-105'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Visibility</label>
            <div className="mt-1.5 flex gap-2 flex-wrap">
              {(['ALL', 'ROLES', 'USERS'] as VisibilityType[]).map(v => (
                <button type="button" key={v} onClick={() => setVisibilityType(v)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${visibilityType === v ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                >
                  {v === 'ALL' ? 'Everyone' : v === 'ROLES' ? 'By Role' : 'Specific Users'}
                </button>
              ))}
            </div>

            {visibilityType === 'ROLES' && (
              <div className="mt-2.5 flex gap-4 flex-wrap p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                {ROLE_OPTIONS.map(r => (
                  <label key={r.value} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input type="checkbox" checked={visibilityRoles.includes(r.value)} onChange={() => toggleRole(r.value)} className="rounded border-slate-300" />
                    {r.label}
                  </label>
                ))}
              </div>
            )}

            {visibilityType === 'USERS' && (
              <div className="mt-2.5 max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg divide-y divide-slate-100 dark:divide-slate-700">
                {usersQuery.isLoading && <p className="text-xs text-slate-400 p-3">Loading users...</p>}
                {(usersQuery.data ?? []).map(u => (
                  <label key={u.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 select-none">
                    <input type="checkbox" checked={visibilityUserIds.includes(u.id)} onChange={() => toggleUser(u.id)} className="rounded border-slate-300" />
                    <span className="font-medium">{u.name}</span>
                    <span className="text-slate-400 ml-auto">{u.role}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending} style={{ backgroundColor: 'rgb(var(--brand-navy-rgb))', color: '#fff' }} className="hover:opacity-90">
              {isPending ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const session = getSession()
  const isAdmin = session?.user.role === 'admin'
  const queryClient = useQueryClient()

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [createOpen, setCreateOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)

  const monthKey = `${viewYear}-${pad(viewMonth + 1)}`

  const eventsQuery = useQuery({
    queryKey: ['calendar-events', monthKey],
    queryFn: () => listCalendarEvents(monthKey),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Event deleted.')
    },
  })

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const e of eventsQuery.data ?? []) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return map
  }, [eventsQuery.data])

  const selectedEvents = eventsByDate[selectedDate] ?? []
  const grid = buildGrid(viewYear, viewMonth)
  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long' })

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        subtitle="Scheduled events and important dates"
        actions={isAdmin ? (
          <Button onClick={() => setCreateOpen(true)} style={{ backgroundColor: 'rgb(var(--brand-navy-rgb))', color: '#fff' }} className="hover:opacity-90">
            <Plus className="h-4 w-4 mr-1.5" />
            New Event
          </Button>
        ) : undefined}
      />

      <div className="flex gap-6 items-start">
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{monthName} {viewYear}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
            {DAY_HEADERS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {grid.map((day, i) => {
              if (day === null) {
                return <div key={`e-${i}`} className="min-h-[90px] border-b border-r border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/50 last:border-r-0" />
              }
              const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`
              const dayEvents = eventsByDate[dateStr] ?? []
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`min-h-[90px] border-b border-r border-slate-100 dark:border-slate-700 p-1.5 cursor-pointer transition-colors last:border-r-0 ${
                    isSelected ? 'bg-slate-900' : isToday ? 'bg-blue-50/80' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                    isSelected ? 'bg-white text-slate-900' : isToday ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}>{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev.id} className="text-[10px] font-medium truncate rounded px-1 text-white leading-[1.4rem]" style={{ background: ev.color }}>
                        {ev.startTime ? `${ev.startTime} ` : ''}{ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className={`text-[10px] pl-1 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="w-72 shrink-0 space-y-3">
          <div className="flex items-center">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              No events scheduled.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(ev => (
                <div key={ev.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="h-1.5" style={{ background: ev.color }} />
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{ev.title}</p>
                        {(ev.startTime || ev.endTime) && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}
                          </p>
                        )}
                        {ev.description && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{ev.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <VisibilityBadge ev={ev} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">By {ev.createdByName}</p>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setEditEvent(ev)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(ev.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(createOpen || editEvent) && (
        <EventDialog
          initialDate={selectedDate}
          event={editEvent}
          onClose={() => { setCreateOpen(false); setEditEvent(null) }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
            setCreateOpen(false)
            setEditEvent(null)
          }}
        />
      )}
    </div>
  )
}
