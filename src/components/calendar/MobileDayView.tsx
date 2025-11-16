import { useState } from 'react'
import { Event as EventType } from '@/lib/supabase'
import { format, startOfDay, endOfDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { getCategoryColor, calculateDuration, formatDuration } from '@/lib/utils'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useSwipeable } from 'react-swipeable'
import MiniCalendar from './MiniCalendar'

interface MobileDayViewProps {
  events: Array<{
    id: string
    title: string
    start: Date
    end: Date
    resource?: EventType
  }>
  date: Date
  onDateChange: (direction: 'prev' | 'next') => void
  onDirectDateChange: (date: Date) => void
  onEventClick: (event: any) => void
  onCreateEvent: () => void
}

export default function MobileDayView({
  events,
  date,
  onDateChange,
  onDirectDateChange,
  onEventClick,
  onCreateEvent,
}: MobileDayViewProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Filter events for the selected day
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)
  const dayEvents = events
    .filter((event) => event.start >= dayStart && event.start <= dayEnd)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  // Calculate daily stats
  const eventCount = dayEvents.length
  const totalTime = dayEvents.reduce((acc, event) => {
    return acc + calculateDuration(event.start, event.end)
  }, 0)

  // Check if today
  const isToday = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => onDateChange('next'),
    onSwipedRight: () => onDateChange('prev'),
    preventScrollOnSwipe: true,
    trackMouse: false,
  })

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      meeting: '👥',
      deep_work: '💼',
      admin: '📋',
      personal: '🏠',
      break: '☕',
      other: '📌',
    }
    return icons[category] || icons.other
  }

  return (
    <div className="flex flex-col h-full bg-background pt-14">
      {/* Minimal Header */}
      <div className="flex items-center justify-between px-4 h-[56px] border-b bg-card flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDateChange('prev')}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            aria-label="Giorno precedente"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={() => setShowDatePicker(true)}
            className="px-4 py-2 font-semibold uppercase text-sm hover:bg-accent rounded-md transition-colors min-w-[90px] text-center"
          >
            {isToday ? 'OGGI' : format(date, 'dd MMM', { locale: it }).toUpperCase()}
          </button>

          <button
            onClick={() => onDateChange('next')}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            aria-label="Giorno successivo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={onCreateEvent}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          aria-label="Nuovo evento"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Date Display */}
      <div className="px-4 py-3 border-b bg-card flex-shrink-0">
        <h2 className="text-lg font-semibold capitalize">
          {format(date, 'EEEE d MMMM yyyy', { locale: it })}
        </h2>
      </div>

      {/* Daily Summary */}
      {eventCount > 0 && (
        <div className="px-4 py-2 border-b bg-muted/30 flex-shrink-0">
          <p className="text-sm text-muted-foreground">
            ⚡ {eventCount} {eventCount === 1 ? 'evento' : 'eventi'} oggi • {formatDuration(totalTime)} totali
          </p>
        </div>
      )}

      {/* Events List */}
      <div {...swipeHandlers} className="flex-1 overflow-y-auto">
        {dayEvents.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-muted-foreground mb-4">Nessun evento oggi</p>
            <Button onClick={onCreateEvent} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Crea Evento
            </Button>
          </div>
        ) : (
          // Events Cards
          <div className="p-4 space-y-3 pb-20">
            {dayEvents.map((event) => {
              const category = event.resource?.category || 'other'
              const backgroundColor = getCategoryColor(category)
              const categoryIcon = getCategoryIcon(category)

              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="flex flex-col gap-2 p-4 rounded-lg border-l-4 bg-card hover:bg-accent cursor-pointer transition-colors shadow-sm min-h-[80px]"
                  style={{ borderLeftColor: backgroundColor }}
                >
                  {/* Time */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-muted-foreground">
                      {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                    </div>
                    <div className="text-lg">{categoryIcon}</div>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-base leading-tight">{event.title}</h3>

                  {/* Location */}
                  {event.resource?.location && (
                    <p className="text-sm text-muted-foreground">
                      📍 {event.resource.location}
                    </p>
                  )}

                  {/* Description */}
                  {event.resource?.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.resource.description}
                    </p>
                  )}

                  {/* Duration */}
                  <div className="text-xs text-muted-foreground">
                    {formatDuration(calculateDuration(event.start, event.end))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
          onClick={() => setShowDatePicker(false)}
        >
          <div
            className="bg-card rounded-lg shadow-lg p-4 m-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <MiniCalendar
              selectedDate={date}
              onSelectDate={(newDate) => {
                onDirectDateChange(newDate)
                setShowDatePicker(false)
              }}
              onClose={() => setShowDatePicker(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
