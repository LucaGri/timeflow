import { useState, useRef, useEffect } from 'react'
import { Event as EventType } from '@/lib/supabase'
import { format, startOfDay, endOfDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { getCategoryColor, calculateDuration, formatDuration } from '@/lib/utils'
import { Plus, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
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
  currentView: 'day' | 'agenda'
  onViewChange: (view: 'day' | 'agenda') => void
}

export default function MobileDayView({
  events,
  date,
  onDateChange,
  onDirectDateChange,
  onEventClick,
  onCreateEvent,
  currentView,
  onViewChange,
}: MobileDayViewProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showViewDropdown, setShowViewDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Filter events for the next 7 days (for agenda view)
  const today = startOfDay(new Date())
  const sevenDaysFromNow = endOfDay(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000))
  const agendaEvents = events
    .filter((event) => event.start >= today && event.start <= sevenDaysFromNow)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  // Group agenda events by day
  const groupedAgendaEvents = agendaEvents.reduce((groups, event) => {
    const dateKey = format(startOfDay(event.start), 'yyyy-MM-dd')
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(event)
    return groups
  }, {} as Record<string, typeof agendaEvents>)

  // Check if today
  const isToday = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => onDateChange('next'),
    onSwipedRight: () => onDateChange('prev'),
    preventScrollOnSwipe: true,
    trackMouse: false,
  })

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowViewDropdown(false)
      }
    }

    if (showViewDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showViewDropdown])

  // Helper to create default event for selected date
  const handleCreateEventForDate = () => {
    // Set default time to 9:00 AM - 10:00 AM on the selected date
    const startTime = new Date(date)
    startTime.setHours(9, 0, 0, 0)

    const endTime = new Date(date)
    endTime.setHours(10, 0, 0, 0)

    // Create a default event with the selected date
    const defaultEvent = {
      id: '',
      title: '',
      start: startTime,
      end: endTime,
      resource: {
        id: '',
        title: '',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        category: 'other' as const,
        importance: 3,
        user_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    onEventClick(defaultEvent)
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

        <div className="flex items-center gap-2">
          {/* View Dropdown Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors"
              aria-label="Seleziona vista"
            >
              <span>{currentView === 'day' ? 'Giorno' : 'Agenda'}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showViewDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showViewDropdown && (
              <div className="absolute top-full right-0 mt-1 w-[120px] rounded-lg border border-input bg-popover shadow-lg z-50 py-1">
                <button
                  onClick={() => {
                    onViewChange('day')
                    setShowViewDropdown(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                    currentView === 'day' ? 'bg-accent font-medium' : ''
                  }`}
                >
                  Giorno
                </button>
                <button
                  onClick={() => {
                    onViewChange('agenda')
                    setShowViewDropdown(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                    currentView === 'agenda' ? 'bg-accent font-medium' : ''
                  }`}
                >
                  Agenda
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleCreateEventForDate}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            aria-label="Nuovo evento"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Date Display */}
      <div className="px-4 py-3 border-b bg-card flex-shrink-0">
        <h2 className="text-lg font-semibold capitalize">
          {format(date, 'EEEE d MMMM yyyy', { locale: it })}
        </h2>
      </div>

      {/* Day View Content */}
      {currentView === 'day' && (
        <>
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
            <Button onClick={handleCreateEventForDate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Crea Evento
            </Button>
          </div>
        ) : (
          // Events Cards
          <div className="p-4 space-y-2 pb-20">
            {dayEvents.map((event) => {
              const category = event.resource?.category || 'other'
              const backgroundColor = getCategoryColor(category)

              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="flex flex-col gap-1 p-3 rounded-lg border-l-4 bg-card hover:bg-accent cursor-pointer transition-colors shadow-sm"
                  style={{ borderLeftColor: backgroundColor }}
                >
                  {/* Time and Title on same line */}
                  <div className="flex items-baseline gap-2">
                    <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      {format(event.start, 'HH:mm')}
                    </div>
                    <h3 className="font-medium text-sm leading-tight truncate">{event.title}</h3>
                  </div>

                  {/* Duration and Location */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDuration(calculateDuration(event.start, event.end))}</span>
                    {event.resource?.location && (
                      <>
                        <span>•</span>
                        <span className="truncate">📍 {event.resource.location}</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
          </div>
        </>
      )}

      {/* Agenda View Content */}
      {currentView === 'agenda' && (
        <div className="flex-1 overflow-y-auto">
          {agendaEvents.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <div className="text-4xl mb-4">📅</div>
              <p className="text-muted-foreground mb-4">Nessun evento nei prossimi 7 giorni</p>
              <Button onClick={handleCreateEventForDate} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Crea Evento
              </Button>
            </div>
          ) : (
            // Grouped Events by Day
            <div className="p-4 space-y-4 pb-20">
              {Object.keys(groupedAgendaEvents)
                .sort()
                .map((dateKey) => {
                  const dayDate = new Date(dateKey)
                  const dayEvents = groupedAgendaEvents[dateKey]
                  const isToday = format(new Date(), 'yyyy-MM-dd') === dateKey
                  const isTomorrow = format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd') === dateKey

                  return (
                    <div key={dateKey}>
                      {/* Day Header */}
                      <div className="mb-2 pb-1 border-b">
                        <h3 className="text-sm font-semibold">
                          {isToday ? '🔵 Oggi' : isTomorrow ? 'Domani' : format(dayDate, 'EEEE d MMMM', { locale: it })}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventi'}
                        </p>
                      </div>

                      {/* Events for this day */}
                      <div className="space-y-2">
                        {dayEvents.map((event) => {
                          const category = event.resource?.category || 'other'
                          const backgroundColor = getCategoryColor(category)

                          return (
                            <div
                              key={event.id}
                              onClick={() => onEventClick(event)}
                              className="flex flex-col gap-1 p-3 rounded-lg border-l-4 bg-card hover:bg-accent cursor-pointer transition-colors shadow-sm"
                              style={{ borderLeftColor: backgroundColor }}
                            >
                              {/* Time and Title on same line */}
                              <div className="flex items-baseline gap-2">
                                <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                  {format(event.start, 'HH:mm')}
                                </div>
                                <h3 className="font-medium text-sm leading-tight truncate">{event.title}</h3>
                              </div>

                              {/* Duration and Location */}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatDuration(calculateDuration(event.start, event.end))}</span>
                                {event.resource?.location && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">📍 {event.resource.location}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

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
