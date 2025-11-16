import { Event as EventType } from '@/lib/supabase'
import { format, isSameDay } from 'date-fns'
import { getCategoryColor } from '@/lib/utils'
import { Conflict } from '@/lib/conflicts/detectConflicts'

interface CustomDayProps {
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

export default function CustomDay({ events, date, onSelectEvent, onSelectSlot, conflicts }: CustomDayProps) {
  // Time slots from 6:00 to 23:00
  const hours = Array.from({ length: 18 }, (_, i) => i + 6) // 6 to 23

  const isToday = isSameDay(date, new Date())

  const getEventsForDay = () => {
    return events.filter(event => isSameDay(event.start, date) && !event.resource?.all_day)
  }

  const getAllDayEvents = () => {
    return events.filter(event => isSameDay(event.start, date) && event.resource?.all_day)
  }

  const getEventPosition = (event: { start: Date; end: Date }) => {
    const eventStart = event.start
    const eventEnd = event.end

    // Calculate which hour the event starts
    const startHour = eventStart.getHours()
    const startMinute = eventStart.getMinutes()

    // Calculate duration in hours
    const durationMs = eventEnd.getTime() - eventStart.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)

    // Calculate position
    const topOffset = (startHour - 6) * 100 + (startMinute / 60) * 100 // 100px per hour
    const height = durationHours * 100 // Height based on duration

    return {
      top: topOffset,
      height: Math.max(height, 50), // Minimum 50px height
      startHour
    }
  }

  const hasConflict = (eventId: string) => {
    return conflicts.some(conflict => conflict.eventIds.includes(eventId))
  }

  const handleTimeSlotClick = (hour: number) => {
    const start = new Date(date)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(date)
    end.setHours(hour + 1, 0, 0, 0)
    onSelectSlot({ start, end })
  }

  return (
    <div className="h-full flex flex-col">
      {/* All-Day Events Section - No label, appears only when events exist */}
      {getAllDayEvents().length > 0 && (
        <div className="border-b bg-background p-3">
          <div className="space-y-2">
            {getAllDayEvents().map((event) => {
              const category = event.resource?.category || 'other'
              const backgroundColor = getCategoryColor(category)
              return (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectEvent(event)
                  }}
                  className="text-sm rounded px-3 py-2 cursor-pointer hover:opacity-90 transition-opacity border border-current"
                  style={{
                    backgroundColor: `${backgroundColor}20`,
                    color: backgroundColor,
                  }}
                  title={`${event.title} (Tutto il giorno)`}
                >
                  <div className="font-semibold">{event.title}</div>
                  {event.resource?.description && (
                    <div className="text-xs mt-1 opacity-80">{event.resource.description}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Time Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          {/* Hour Labels Column */}
          <div className="w-20 flex-shrink-0">
            {hours.map((hour) => (
              <div key={hour} className="border-b border-r h-[100px] p-3 text-sm font-medium text-muted-foreground bg-muted/20">
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Event Area with absolute positioning */}
          <div className={`flex-1 relative ${isToday ? 'bg-primary/5' : ''}`}>
            {/* Hour Cells for clicking */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="border-b h-[100px] cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleTimeSlotClick(hour)}
              />
            ))}

            {/* Events positioned absolutely */}
            {getEventsForDay().map((event) => {
              const { top, height } = getEventPosition(event)
              const category = event.resource?.category || 'other'
              const backgroundColor = getCategoryColor(category)
              const isConflicted = hasConflict(event.id)

              return (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectEvent(event)
                  }}
                  className={`absolute left-2 right-2 rounded-lg p-3 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ${
                    isConflicted ? 'ring-2 ring-red-500' : ''
                  }`}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    backgroundColor,
                    color: 'white',
                    zIndex: 5,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 h-full">
                    <div className="flex-1 min-h-0">
                      {/* Title and time on same line with bullet separator */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-base">{event.title}</span>
                        <span className="text-sm opacity-75 font-normal">
                          • {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                        </span>
                      </div>
                      {event.resource?.description && height > 80 && (
                        <div className="text-sm opacity-80 mt-2 line-clamp-2">
                          {event.resource.description}
                        </div>
                      )}
                      {event.resource?.location && height > 60 && (
                        <div className="text-sm opacity-90 mt-1">
                          📍 {event.resource.location}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/20">
                        {category.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
