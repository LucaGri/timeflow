import { Event as EventType } from '@/lib/supabase'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { getCategoryColor } from '@/lib/utils'
import { Conflict } from '@/lib/conflicts/detectConflicts'

interface CustomWeekProps {
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

export default function CustomWeek({ events, date, onSelectEvent, onSelectSlot, conflicts }: CustomWeekProps) {
  // Get week start (Monday)
  const weekStart = startOfWeek(date, { locale: it, weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Time slots from 6:00 to 23:00
  const hours = Array.from({ length: 18 }, (_, i) => i + 6) // 6 to 23

  const isToday = (day: Date) => isSameDay(day, new Date())

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.start, day) && !event.resource?.all_day)
  }

  const getAllDayEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.start, day) && event.resource?.all_day)
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
    const topOffset = (startHour - 6) * 80 + (startMinute / 60) * 80 // 80px per hour
    const height = durationHours * 80 // Height based on duration

    return {
      top: topOffset,
      height: Math.max(height, 40), // Minimum 40px height
      startHour
    }
  }

  const hasConflict = (eventId: string) => {
    return conflicts.some(conflict => conflict.eventIds.includes(eventId))
  }

  const handleTimeSlotClick = (day: Date, hour: number) => {
    const start = new Date(day)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(day)
    end.setHours(hour + 1, 0, 0, 0)
    onSelectSlot({ start, end })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Wrapper for aligned grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full">
          {/* Sticky Header Container */}
          <div className="sticky top-0 z-10">
            {/* Days Header - Compact Single Line */}
            <div className="grid border-b bg-gray-50" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
              <div className="py-2 border-r font-medium text-sm text-center">Ora</div>
              {days.map((day, index) => (
                <div
                  key={day.toISOString()}
                  className={`py-2 text-center font-medium text-sm border-b-0 ${index < 6 ? 'border-r' : ''} ${
                    isToday(day) ? 'bg-blue-500 text-white font-bold border-t-4 border-blue-600' : ''
                  }`}
                >
                  {format(day, 'EEE d', { locale: it }).toUpperCase()}
                </div>
              ))}
            </div>

            {/* All-Day Events Row */}
            <div className="grid border-b bg-background" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
              <div className="p-2 border-r text-xs font-medium text-muted-foreground bg-muted">
                Tutto il giorno
              </div>
              {days.map((day, dayIndex) => {
                const allDayEvents = getAllDayEventsForDay(day)
                return (
                  <div
                    key={`allday-${day.toISOString()}`}
                    className={`p-2 space-y-1 min-h-[50px] ${dayIndex < 6 ? 'border-r' : ''} ${
                      isToday(day) ? 'bg-primary/5' : ''
                    }`}
                  >
                    {allDayEvents.map((event) => {
                      const category = event.resource?.category || 'other'
                      const backgroundColor = getCategoryColor(category)
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectEvent(event)
                          }}
                          className="text-xs rounded px-2 py-1 cursor-pointer hover:opacity-90 transition-opacity truncate border border-current"
                          style={{
                            backgroundColor: `${backgroundColor}20`,
                            color: backgroundColor,
                          }}
                          title={`${event.title} (Tutto il giorno)`}
                        >
                          {event.title}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Day Columns with Events Overlay */}
          <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            {/* Hour Labels Column */}
            <div>
              {hours.map((hour) => (
                <div key={hour} className="border-b border-r h-[80px] p-2 text-sm font-medium text-muted-foreground bg-muted/20">
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {days.map((day, dayIndex) => {
              const dayEvents = getEventsForDay(day)

              return (
                <div
                  key={day.toISOString()}
                  className={`relative ${dayIndex < 6 ? 'border-r' : ''} ${
                    isToday(day) ? 'bg-primary/5' : ''
                  }`}
                >
                  {/* Hour Cells for clicking */}
                  {hours.map((hour) => (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="border-b h-[80px] cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleTimeSlotClick(day, hour)}
                    />
                  ))}

                  {/* Events positioned absolutely */}
                  {dayEvents.map((event) => {
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
                        className={`absolute left-1 right-1 rounded p-2 text-xs cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ${
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
                        <div className="font-semibold truncate">{event.title}</div>
                        <div className="text-xs opacity-90">
                          {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                        </div>
                        {event.resource?.location && height > 60 && (
                          <div className="text-xs opacity-80 truncate">📍 {event.resource.location}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
