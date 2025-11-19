import { useState, useEffect, useCallback } from 'react'
import { View } from 'react-big-calendar'
import { supabase } from '@/lib/supabase'
import { Event as EventType } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Plus, RefreshCw, ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import EventModal from '@/components/calendar/EventModal'
import { CompactConflictIndicator } from '@/components/calendar/CompactConflictIndicator'
import { ViewSelector } from '@/components/calendar/ViewSelector'
import ConflictList from '@/components/calendar/ConflictList'
import CustomAgenda from '@/components/calendar/CustomAgenda'
import CustomWeek from '@/components/calendar/CustomWeek'
import CustomDay from '@/components/calendar/CustomDay'
import CustomMonth from '@/components/calendar/CustomMonth'
import MobileDayView from '@/components/calendar/MobileDayView'
import { detectAllConflicts, Conflict } from '@/lib/conflicts/detectConflicts'
import { syncAllCalendars } from '@/lib/sync'
import { addDays, addWeeks, addMonths, startOfWeek, endOfWeek, format } from 'date-fns'
import { it } from 'date-fns/locale'
import { CategoryManageModal } from '@/components/categories/CategoryManageModal'

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource?: EventType
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())
  const [syncing, setSyncing] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [showConflictList, setShowConflictList] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [mobileView, setMobileView] = useState<'day' | 'agenda'>('day')

  // Navigation handlers
  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setDate(new Date())
      return
    }

    const newDate = new Date(date)
    const increment = direction === 'next' ? 1 : -1

    switch (view) {
      case 'month':
        setDate(addMonths(newDate, increment))
        break
      case 'week':
        setDate(addWeeks(newDate, increment))
        break
      case 'day':
        setDate(addDays(newDate, increment))
        break
      case 'agenda':
        setDate(addDays(newDate, increment * 30))
        break
    }
  }

  // Mobile day navigation (always increments by day)
  const handleMobileDayNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(date)
    const increment = direction === 'next' ? 1 : -1
    setDate(addDays(newDate, increment))
  }

  // Get compact date for Day view (no year, capitalized)
  const getCompactDayTitle = () => {
    return format(date, 'EEEE d MMMM', { locale: it })
  }

  // Get week range for Week view (e.g., "10-16 Novembre")
  const getWeekRange = () => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1, locale: it })
    const weekEnd = endOfWeek(date, { weekStartsOn: 1, locale: it })

    const startDay = format(weekStart, 'd')
    const endDay = format(weekEnd, 'd')
    const startMonth = format(weekStart, 'MMMM', { locale: it })
    const endMonth = format(weekEnd, 'MMMM', { locale: it })
    const startYear = format(weekStart, 'yyyy')
    const endYear = format(weekEnd, 'yyyy')

    // Same month: "10-16 Novembre"
    if (startMonth === endMonth && startYear === endYear) {
      return `${startDay}-${endDay} ${startMonth}`
    }

    // Different months, same year: "27 Novembre - 3 Dicembre"
    if (startYear === endYear) {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth}`
    }

    // Different years: "28 Dicembre 2024 - 3 Gennaio 2025"
    return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`
  }

  // Check if current date is today
  const isToday = () => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Load profile to check if any calendar providers are connected
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)

        // Check for any active calendar providers
        const { data: providers } = await supabase
          .from('calendar_providers')
          .select('provider')
          .eq('user_id', user.id)
          .eq('is_active', true)

        // Set profile to indicate if any providers are connected
        setProfile({
          google_calendar_connected: providers?.some(p => p.provider === 'google') || false
        })
      }
    }
    loadProfile()
  }, [])

  // Load events from Supabase
  const loadEvents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error loading events:', error)
        // Don't throw - just log and continue with empty events
        return
      }

      if (data) {
        const calendarEvents: CalendarEvent[] = data.map((event: EventType) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.start_time),
          end: new Date(event.end_time),
          resource: event,
        }))
        setEvents(calendarEvents)

        // Detect conflicts
        const detectedConflicts = detectAllConflicts(data)
        setConflicts(detectedConflicts)
      }
    } catch (err) {
      console.error('Exception loading events:', err)
      // Continue with empty events instead of crashing
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Auto-switch to day view on mobile if incompatible view is selected
  useEffect(() => {
    const isMobile = window.innerWidth < 768
    if (isMobile && (view === 'week' || view === 'month')) {
      setView('day')
    }
  }, [view])

  // Handle sync for all connected calendars
  const handleSyncAllCalendars = async () => {
    setSyncing(true)
    try {
      const result = await syncAllCalendars({ parallel: false })

      let message = 'Sync completed!\n'

      if (result.google) {
        const totalGoogle = result.google.toTimeFlow.created + result.google.toGoogle.created
        message += `Google: ${totalGoogle} events synced\n`
      }

      if (result.microsoft) {
        const totalMicrosoft = result.microsoft.toTimeFlow.created + result.microsoft.toMicrosoft.created
        message += `Microsoft: ${totalMicrosoft} events synced\n`
      }

      if (result.overallSuccess) {
        alert(message)
      } else {
        alert('Sync completed with errors. Check console for details.')
        console.error('Sync errors:', result)
      }

      await loadEvents()
    } catch (error) {
      console.error('Sync error:', error)
      alert('Error during sync. Please check your calendar connections.')
    }
    setSyncing(false)
  }

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    // Create new event with selected time slot
    const newEvent: Partial<EventType> = {
      title: '',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      category: 'other',
      importance: 3,
    }
    setSelectedEvent(newEvent as EventType)
    setIsModalOpen(true)
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event.resource || null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEvent(null)
  }

  const handleSaveEvent = async () => {
    await loadEvents() // Reload events after save (will also redetect conflicts)
    handleCloseModal()
  }

  return (
    <>
      {/* Mobile View (< 768px) */}
      <div className="md:hidden h-full">
        <MobileDayView
          events={events}
          date={date}
          onDateChange={handleMobileDayNavigate}
          onDirectDateChange={setDate}
          onEventClick={handleSelectEvent}
          onCreateEvent={() => {
            setSelectedEvent(null)
            setIsModalOpen(true)
          }}
          currentView={mobileView}
          onViewChange={setMobileView}
        />
      </div>

      {/* Desktop View (>= 768px) */}
      <div className="hidden md:flex h-full flex-col p-4 sm:p-6 md:p-8">
        {/* Compact header spacing for all views */}
        <div className="mb-4 pt-2 md:pt-0" />

        <div className="rounded-lg border bg-card flex-1 flex flex-col min-h-0">
          <div className="h-full flex flex-col">
            {/* Compact Single-Row Toolbar for All Views */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-background h-[50px]">
              {/* Left section: View selector + Date navigation */}
              <div className="flex items-center gap-3">
                <ViewSelector currentView={view} onViewChange={setView} />

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigate('prev')}
                    className="h-10 w-10 p-0"
                    title={view === 'day' ? 'Giorno precedente' : view === 'week' ? 'Settimana precedente' : view === 'month' ? 'Mese precedente' : 'Periodo precedente'}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <button
                    onClick={() => handleNavigate('today')}
                    className={`px-3 py-2 h-10 text-sm font-medium rounded-lg hover:bg-accent transition-colors ${
                      isToday() ? 'font-bold text-primary' : ''
                    }`}
                    title="Vai a oggi"
                  >
                    {view === 'day' ? getCompactDayTitle() : view === 'week' ? getWeekRange() : view === 'month' ? format(date, 'MMMM yyyy', { locale: it }) : 'Prossimi Eventi'}
                  </button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigate('next')}
                    className="h-10 w-10 p-0"
                    title={view === 'day' ? 'Giorno successivo' : view === 'week' ? 'Settimana successiva' : view === 'month' ? 'Mese successivo' : 'Periodo successivo'}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Right section: Action buttons */}
              <div className="flex items-center gap-2">
                <CompactConflictIndicator
                  conflicts={conflicts}
                  onClick={() => setShowConflictList(true)}
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCategoryModal(true)}
                  className="h-10"
                  title="Gestisci Categorie"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  <span>Categorie</span>
                </Button>

                {profile?.google_calendar_connected && (
                  <button
                    onClick={handleSyncAllCalendars}
                    disabled={syncing}
                    className="inline-flex items-center justify-center h-10 w-10 p-0 rounded-lg border border-input bg-background hover:bg-accent transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring"
                    title={syncing ? 'Syncing...' : 'Sync all calendars'}
                    aria-label="Sync"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  </button>
                )}

                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedEvent(null)
                    setIsModalOpen(true)
                  }}
                  className="h-10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Nuovo</span>
                </Button>
              </div>
            </div>

            {/* Calendar Views */}
            <div className={`flex-1 min-h-0 ${view === 'agenda' ? 'overflow-y-auto' : 'overflow-hidden'}`}>
              {view === 'month' && (
                <CustomMonth
                  events={events}
                  date={date}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  conflicts={conflicts}
                />
              )}
              {view === 'week' && (
                <CustomWeek
                  events={events}
                  date={date}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  conflicts={conflicts}
                />
              )}
              {view === 'day' && (
                <CustomDay
                  events={events}
                  date={date}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  conflicts={conflicts}
                />
              )}
              {view === 'agenda' && (
                <div className="p-3 sm:p-4 md:p-6">
                  <CustomAgenda
                    events={events}
                    date={date}
                    onSelectEvent={handleSelectEvent}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals (shared between mobile and desktop) */}
      {isModalOpen && (
        <EventModal
          event={selectedEvent}
          onClose={handleCloseModal}
          onSave={handleSaveEvent}
        />
      )}

      {showConflictList && (
        <ConflictList
          conflicts={conflicts}
          onClose={() => setShowConflictList(false)}
        />
      )}

      {showCategoryModal && userId && (
        <CategoryManageModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          userId={userId}
          onUpdate={loadEvents}
        />
      )}
    </>
  )
}
