import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ExternalLink, Plus, X } from 'lucide-react'
import { listCalendarEvents, type CalendarEvent } from '../../../services/calendarService'

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function pad(n: number) { return String(n).padStart(2, '0') }

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

export default function CalendarPopup({
  onClose,
  onCreateEvent,
  isAdmin,
}: {
  onClose: () => void
  onCreateEvent: (date: string) => void
  isAdmin: boolean
}) {
  const navigate = useNavigate()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(todayStr)

  const monthKey = `${viewYear}-${pad(viewMonth + 1)}`

  const eventsQuery = useQuery({
    queryKey: ['calendar-events', monthKey],
    queryFn: () => listCalendarEvents(monthKey),
    staleTime: 30_000,
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
    <div
      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'rgb(var(--brand-navy-rgb))' }}>
        <span className="text-white font-semibold text-xs tracking-wide uppercase">Calendar</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { navigate('/calendar'); onClose() }}
            className="flex items-center gap-1 text-white/70 hover:text-white transition-colors text-xs px-1.5 py-0.5 rounded hover:bg-white/10"
          >
            <ExternalLink className="h-3 w-3" />
            Full view
          </button>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-0.5 rounded hover:bg-white/10">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
          </button>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{monthName} {viewYear}</span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <ChevronRight className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-slate-400 py-0.5">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {grid.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} />
            const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`
            const dayEvents = eventsByDate[dateStr] ?? []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center justify-start py-0.5 rounded-lg transition-colors ${
                  isSelected ? 'bg-slate-900' : isToday ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <span className={`text-xs font-medium leading-5 ${
                  isSelected ? 'text-white' : isToday ? 'text-blue-600 font-bold' : 'text-slate-700 dark:text-slate-300'
                }`}>{day}</span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map(ev => (
                      <span key={ev.id} className="w-1.5 h-1.5 rounded-full" style={{ background: ev.color }} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-700 px-3 pb-3 pt-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('default', { month: 'short', day: 'numeric' })}
          </span>
          {isAdmin && (
            <button
              onClick={() => { onCreateEvent(selectedDate); onClose() }}
              className="flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add event
            </button>
          )}
        </div>

        {selectedEvents.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">No events</p>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {selectedEvents.map(ev => (
              <div key={ev.id} className="flex items-center gap-2 py-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ev.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{ev.title}</p>
                  {ev.startTime && <p className="text-[10px] text-slate-400">{ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
