import { Event as EventType } from '@/lib/supabase'
import { format, startOfDay, endOfDay, addDays } from 'date-fns'
import { it } from 'date-fns/locale'
import { getCategoryColor } from '@/lib/utils'

interface CustomAgendaProps {
  events: Array<{
    id: string
    title: string
    start: Date
    end: Date
    resource?: EventType
  }>
  date: Date
  onSelectEvent: (event: any) => void
}

export default function CustomAgenda({ events, date, onSelectEvent }: CustomAgendaProps) {
  // Generate next 30 days
  const days: Date[] = []
  for (let i = 0; i < 30; i++) {
    days.push(addDays(date, i))
  }

  // Group events by day
  const eventsByDay = new Map<string, typeof events>()

  days.forEach((day) => {
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)
    const dayKey = format(day, 'yyyy-MM-dd')

    const dayEvents = events.filter((event) => {
      return event.start >= dayStart && event.start <= dayEnd
    })

    if (dayEvents.length > 0) {
      eventsByDay.set(dayKey, dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime()))
    }
  })

  if (eventsByDay.size === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nessun evento nei prossimi 30 giorni
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      {Array.from(eventsByDay.entries()).map(([dayKey, dayEvents]) => {
        const day = new Date(dayKey)
        const isToday = format(new Date(), 'yyyy-MM-dd') === dayKey

        return (
          <div key={dayKey} className="space-y-3">
            {/* Date Header - Sticky positioned below compact header (50px) */}
            <div className={`sticky top-0 z-20 py-3 px-4 rounded-lg font-semibold shadow-sm ${
              isToday
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}>
              {format(day, 'EEEE d MMMM yyyy', { locale: it })}
            </div>

            {/* Events for this day */}
            <div className="space-y-2">
              {dayEvents.map((event) => {
                const category = event.resource?.category || 'other'
                const backgroundColor = getCategoryColor(category)

                return (
                  <div
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                  >
                    {/* Time */}
                    <div className="flex-shrink-0 w-32 text-sm font-medium">
                      {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor }}
                        />
                        <h4 className="font-semibold truncate">{event.title}</h4>
                      </div>
                      {event.resource?.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.resource.description}
                        </p>
                      )}
                      {event.resource?.location && (
                        <p className="text-sm text-muted-foreground mt-1">
                          📍 {event.resource.location}
                        </p>
                      )}
                    </div>

                    {/* Category Badge */}
                    <div className="flex-shrink-0">
                      <span
                        className="text-xs px-2 py-1 rounded-full text-white font-medium"
                        style={{ backgroundColor }}
                      >
                        {category.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
