import { useState, useEffect, useCallback } from 'react'
import { View } from 'react-big-calendar'
import { supabase } from '@/lib/supabase'
import { Event as EventType } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Plus, RefreshCw, ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import EventModal from '@/components/calendar/EventModal'
import { ConflictIndicatorButton } from '@/components/calendar/ConflictIndicatorButton'
import ConflictList from '@/components/calendar/ConflictList'
import CustomAgenda from '@/components/calendar/CustomAgenda'
import CustomWeek from '@/components/calendar/CustomWeek'
import CustomDay from '@/components/calendar/CustomDay'
import CustomMonth from '@/components/calendar/CustomMonth'
import MobileDayView from '@/components/calendar/MobileDayView'
import { syncFromGoogle } from '@/lib/google/calendar'
import { detectAllConflicts, Conflict } from '@/lib/conflicts/detectConflicts'
import { addDays, addWeeks, addMonths, startOfWeek, format } from 'date-fns'
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

  // Get title for current view
  const getViewTitle = () => {
    switch (view) {
      case 'month':
        return format(date, 'MMMM yyyy', { locale: it })
      case 'week':
        const weekStart = startOfWeek(date, { locale: it, weekStartsOn: 1 })
        return format(weekStart, "'Settimana del' d MMMM yyyy", { locale: it })
      case 'day':
        return format(date, 'EEEE d MMMM yyyy', { locale: it })
      case 'agenda':
        return 'Prossimi eventi'
    }
  }

  // Load profile to check if Google is connected
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data } = await supabase
          .from('profiles')
          .select('google_calendar_connected')
          .eq('id', user.id)
          .single()
        setProfile(data)
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

  // Handle sync from Google
  const handleSyncFromGoogle = async () => {
    setSyncing(true)
    try {
      const result = await syncFromGoogle()
      alert(`Sincronizzazione completata! ${result.imported} nuovi eventi importati.`)
      await loadEvents()
    } catch (error) {
      console.error('Sync error:', error)
      alert('Errore durante la sincronizzazione. Verifica di essere connesso a Google Calendar.')
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
        />
      </div>

      {/* Desktop View (>= 768px) */}
      <div className="hidden md:flex h-full flex-col p-4 sm:p-6 md:p-8">
        <div className="mb-4 md:mb-6 pt-12 md:pt-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Calendario</h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground">
                Gestisci i tuoi eventi e sincronizza con Google Calendar
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ConflictIndicatorButton
              conflicts={conflicts}
              onClick={() => setShowConflictList(true)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryModal(true)}
              title="Gestisci Categorie"
            >
              <Settings className="mr-0 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Categorie</span>
            </Button>
            {profile?.google_calendar_connected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncFromGoogle}
                disabled={syncing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{syncing ? 'Sincronizzazione...' : 'Sincronizza'}</span>
                <span className="sm:hidden">Sync</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setSelectedEvent(null)
                setIsModalOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nuovo Evento</span>
              <span className="sm:hidden">Nuovo</span>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card flex-1 flex flex-col min-h-0">
          <div className="h-full flex flex-col">
            {/* Unified Toolbar for All Views */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border-b bg-muted/30">
              {/* Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate('prev')}
                  className="min-h-[44px] sm:min-h-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate('today')}
                  className="min-h-[44px] sm:min-h-0"
                >
                  Oggi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate('next')}
                  className="min-h-[44px] sm:min-h-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="font-semibold text-sm sm:text-base lg:text-lg capitalize truncate">
                {getViewTitle()}
              </div>

              {/* View Switcher */}
              <div className="flex gap-1 sm:gap-2 overflow-x-auto">
                <Button
                  variant={view === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('month')}
                  className="min-h-[44px] sm:min-h-0 text-xs sm:text-sm whitespace-nowrap hidden md:inline-flex"
                >
                  Mese
                </Button>
                <Button
                  variant={view === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('week')}
                  className="min-h-[44px] sm:min-h-0 text-xs sm:text-sm whitespace-nowrap hidden sm:inline-flex"
                >
                  Settimana
                </Button>
                <Button
                  variant={view === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('day')}
                  className="min-h-[44px] sm:min-h-0 text-xs sm:text-sm whitespace-nowrap"
                >
                  Giorno
                </Button>
                <Button
                  variant={view === 'agenda' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('agenda')}
                  className="min-h-[44px] sm:min-h-0 text-xs sm:text-sm whitespace-nowrap"
                >
                  Agenda
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
