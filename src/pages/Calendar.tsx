import { useState, useEffect, useCallback } from 'react'
import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/it'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { supabase } from '@/lib/supabase'
import { Event as EventType } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Plus, RefreshCw } from 'lucide-react'
import EventModal from '@/components/calendar/EventModal'
import ConflictBanner from '@/components/calendar/ConflictBanner'
import ConflictList from '@/components/calendar/ConflictList'
import { getCategoryColor } from '@/lib/utils'
import { syncFromGoogle } from '@/lib/google/calendar'
import { detectAllConflicts, Conflict } from '@/lib/conflicts/detectConflicts'

moment.locale('it')
// Imposta lunedì come primo giorno della settimana
moment.updateLocale('it', {
  week: {
    dow: 1, // Monday is the first day of the week (0 = Sunday, 1 = Monday)
  },
})
const localizer = momentLocalizer(moment)

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
  const scrollToTime = new Date()
  scrollToTime.setHours(7, 0, 0, 0) // Inizia alle 7:00 AM
  const [syncing, setSyncing] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [showConflictList, setShowConflictList] = useState(false)

  // Load profile to check if Google is connected
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error loading events:', error)
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

  const eventStyleGetter = (event: CalendarEvent) => {
    const category = event.resource?.category || 'other'
    const backgroundColor = getCategoryColor(category)
    
    // Check if this event is in a conflict
    const hasConflict = conflicts.some(conflict => 
      conflict.eventIds.includes(event.id)
    )
    
    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: hasConflict ? '2px solid #ef4444' : '0',
        display: 'block',
        padding: '2px 5px',
        boxShadow: hasConflict ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none',
      },
    }
  }

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendario</h1>
          <p className="mt-2 text-muted-foreground">
            Gestisci i tuoi eventi e sincronizza con Google Calendar
          </p>
        </div>
        <div className="flex gap-2">
          {profile?.google_calendar_connected && (
            <Button
              variant="outline"
              onClick={handleSyncFromGoogle}
              disabled={syncing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizzazione...' : 'Sincronizza'}
            </Button>
          )}
          <Button onClick={() => {
            setSelectedEvent(null)
            setIsModalOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Evento
          </Button>
        </div>
      </div>

      {/* Conflict Banner */}
      <ConflictBanner 
        conflicts={conflicts} 
        onViewDetails={() => setShowConflictList(true)} 
      />

      <div className="rounded-lg border bg-card p-6" style={{ height: 'calc(100vh - 320px)', minHeight: '600px' }}>
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          scrollToTime={scrollToTime}
          min={new Date(1970, 1, 1, 6, 0, 0)}  // ← NUOVA RIGA: Inizia da 6:00
          max={new Date(1970, 1, 1, 23, 0, 0)} // ← NUOVA RIGA: Finisce a 23:00
          components={{
          timeGutterHeader: view === 'day' ? () => null : undefined,
          }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={eventStyleGetter}
          style={{ height: '100%' }}
          messages={{
            next: 'Avanti',
            previous: 'Indietro',
            today: 'Oggi',
            month: 'Mese',
            week: 'Settimana',
            day: 'Giorno',
            agenda: 'Agenda',
            date: 'Data',
            time: 'Ora',
            event: 'Evento',
            noEventsInRange: 'Nessun evento in questo periodo',
            showMore: (total) => `+ altri ${total}`,
          }}
        />
      </div>

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
    </div>
  )
}
