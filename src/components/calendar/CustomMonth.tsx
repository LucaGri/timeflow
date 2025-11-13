import { Event as EventType } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { getCategoryColor } from '@/lib/utils'
import { Conflict } from '@/lib/conflicts/detectConflicts'

interface CustomMonthProps {
  events: Array<{
    id: string
    title: string
    start: Date
    end: Date
    resource?: EventType
  }>
  date: Date
  onSelectEvent: (event: any) => void
  onSelectSlot: (slot: { start: Date; end: Date }) => void
  conflicts: Conflict[]
}

export default function CustomMonth({ events, date, onSelectEvent, onSelectSlot, conflicts }: CustomMonthProps) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calendarStart = startOfWeek(monthStart, { locale: it, weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { locale: it, weekStartsOn: 1 })

  // Generate all days to display
  const days: Date[] = []
  let currentDay = calendarStart
  while (currentDay <= calendarEnd) {
    days.push(currentDay)
    currentDay = addDays(currentDay, 1)
  }

  const isToday = (day: Date) => isSameDay(day, new Date())
  const isCurrentMonth = (day: Date) => isSameMonth(day, date)

  const getEventsForDay = (day: Date) => {
    const dayEvents = events.filter(event => isSameDay(event.start, day))

    // Separa eventi giornalieri da eventi con orario
    const allDayEvents = dayEvents.filter(event => event.resource?.all_day)
    const timedEvents = dayEvents.filter(event => !event.resource?.all_day)

    // Ordina eventi con orario per ora di inizio
    timedEvents.sort((a, b) => a.start.getTime() - b.start.getTime())

    // Restituisci prima gli eventi giornalieri, poi quelli con orario
    return [...allDayEvents, ...timedEvents]
  }

  const hasConflict = (eventId: string) => {
    return conflicts.some(conflict => conflict.eventIds.includes(eventId))
  }

  const handleDayClick = (day: Date) => {
    const start = new Date(day)
    start.setHours(9, 0, 0, 0) // Default to 9 AM
    const end = new Date(day)
    end.setHours(10, 0, 0, 0) // Default 1 hour duration
    onSelectSlot({ start, end })
  }

  // Split days into weeks
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Wrapper for aligned grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full">
          {/* Weekday Headers - Compact Style */}
          <div className="grid border-b bg-gray-50 sticky top-0 z-10" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekDays.map((day, index) => (
              <div key={day} className={`py-2 text-center font-medium text-sm text-gray-600 ${index < 6 ? 'border-r' : ''}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid border-b" style={{ gridTemplateColumns: 'repeat(7, 1fr)', height: '140px' }}>
              {week.map((day, dayIndex) => {
              const dayEvents = getEventsForDay(day)
              const displayEvents = dayEvents.slice(0, 3) // Show max 3 events
              const moreCount = dayEvents.length - displayEvents.length

              return (
                <div
                  key={day.toISOString()}
                  className={`p-2 cursor-pointer hover:bg-accent/50 transition-colors ${dayIndex < 6 ? 'border-r' : ''} ${
                    !isCurrentMonth(day) ? 'bg-muted/20 text-muted-foreground' : ''
                  } ${isToday(day) ? 'bg-primary/10' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  {/* Day Number */}
                  <div className={`text-sm font-semibold mb-1 ${
                    isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''
                  }`}>
                    {format(day, 'd')}
                  </div>

                  {/* Events */}
                  <div className="space-y-1">
                    {displayEvents.map((event) => {
                      const category = event.resource?.category || 'other'
                      const backgroundColor = getCategoryColor(category)
                      const isConflicted = hasConflict(event.id)
                      const isAllDay = event.resource?.all_day

                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectEvent(event)
                          }}
                          className={`text-xs rounded px-2 py-1 cursor-pointer hover:opacity-90 transition-opacity line-clamp-2 ${
                            isConflicted ? 'ring-1 ring-red-500' : ''
                          } ${isAllDay ? 'border border-current' : ''}`}
                          style={{
                            backgroundColor: isAllDay ? `${backgroundColor}20` : backgroundColor,
                            color: isAllDay ? backgroundColor : 'white',
                          }}
                          title={`${event.title}${isAllDay ? ' (Tutto il giorno)' : ` - ${format(event.start, 'HH:mm')}`}`}
                        >
                          {!isAllDay && <span className="font-medium">{format(event.start, 'HH:mm')} </span>}
                          {event.title}
                        </div>
                      )
                    })}

                    {moreCount > 0 && (
                      <div className="text-xs text-muted-foreground font-medium px-2">
                        +{moreCount} {moreCount === 1 ? 'altro' : 'altri'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        </div>
      </div>
    </div>
  )
}
