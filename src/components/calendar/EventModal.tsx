import { useState, useEffect } from 'react'
import { supabase, Event as EventType } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { X, Trash2, MapPin } from 'lucide-react'
import { createGoogleEvent, updateGoogleEvent, deleteGoogleEvent } from '@/lib/google/calendar'
import { setWorkingHours } from '@/lib/constants'

interface EventModalProps {
  event: EventType | null
  onClose: () => void
  onSave: () => void
}

export default function EventModal({ event, onClose, onSave }: EventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [category, setCategory] = useState<EventType['category']>('other')
  const [importance, setImportance] = useState(3)
  const [location, setLocation] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (event) {
      setTitle(event.title || '')
      setDescription(event.description || '')
      setStartTime(formatDateTimeLocal(event.start_time))
      setEndTime(formatDateTimeLocal(event.end_time))
      setCategory(event.category || 'other')
      setImportance(event.importance || 3)
      setLocation(event.location || '')
      setIsAllDay(event.all_day || false)
    } else {
      // New event - set default times
      const now = new Date()
      now.setMinutes(0, 0, 0)
      const later = new Date(now)
      later.setHours(later.getHours() + 1)

      setStartTime(formatDateTimeLocal(now.toISOString()))
      setEndTime(formatDateTimeLocal(later.toISOString()))
    }
  }, [event])

  const formatDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleAllDayToggle = (checked: boolean) => {
    setIsAllDay(checked)

    if (checked) {
      // Set to working hours (9 AM - 6 PM)
      const startDate = new Date(startTime)
      const endDate = new Date(startTime) // Use same date as start

      const workStart = setWorkingHours(startDate, true)
      const workEnd = setWorkingHours(endDate, false)

      setStartTime(formatDateTimeLocal(workStart.toISOString()))
      setEndTime(formatDateTimeLocal(workEnd.toISOString()))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!title.trim()) {
      setError('Il titolo è obbligatorio')
      setLoading(false)
      return
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    if (end <= start) {
      setError('La data di fine deve essere successiva alla data di inizio')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Utente non autenticato')
      setLoading(false)
      return
    }

    const eventData = {
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      category,
      importance,
      location: location.trim() || null,
      all_day: isAllDay,
      // Preserve Google Calendar sync fields when updating
      ...(event?.id && event.google_event_id ? {
        google_event_id: event.google_event_id,
        google_calendar_id: event.google_calendar_id
      } : {})
    }

    let result

    if (event?.id) {
      // Update existing event
      result = await supabase
        .from('events')
        .update(eventData)
        .eq('id', event.id)
        .select()
        .single()

      // Sync to Google if connected
      if (result.data && event.google_event_id) {
        try {
          await updateGoogleEvent(event.google_event_id, result.data)
        } catch (error) {
          console.error('Failed to sync to Google:', error)
        }
      }
    } else {
      // Create new event
      result = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single()

      // Sync to Google if connected AND event doesn't already have a google_event_id
      // (to avoid duplicates from events that were synced from Google)
      if (result.data && !result.data.google_event_id) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('google_calendar_connected')
            .eq('id', user.id)
            .single()

          if (profile?.google_calendar_connected) {
            const googleEventId = await createGoogleEvent(result.data)
            if (googleEventId) {
              // Save Google event ID
              await supabase
                .from('events')
                .update({ google_event_id: googleEventId })
                .eq('id', result.data.id)
            }
          }
        } catch (error) {
          console.error('Failed to sync to Google:', error)
        }
      }
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onSave()
  }

  const handleDelete = async () => {
    if (!event?.id) return
    if (!confirm('Sei sicuro di voler eliminare questo evento?')) return

    setLoading(true)

    // Delete from Google if it exists there
    if (event.google_event_id) {
      try {
        await deleteGoogleEvent(event.google_event_id)
      } catch (error) {
        console.error('Failed to delete from Google:', error)
      }
    }

    // Delete from Supabase
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', event.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="w-full h-full md:h-auto md:max-w-2xl md:rounded-lg bg-card shadow-lg flex flex-col md:max-h-[90vh]">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-card border-b px-4 sm:px-6 py-4 flex items-center justify-between md:rounded-t-lg">
          <h2 className="text-xl sm:text-2xl font-bold">
            {event?.id ? 'Modifica Evento' : 'Nuovo Evento'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-accent min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-4" id="event-form">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Titolo *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Es: Meeting con il team"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Descrizione
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Aggiungi dettagli..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-input bg-muted/30 px-4 py-3">
            <input
              type="checkbox"
              id="all-day"
              checked={isAllDay}
              onChange={(e) => handleAllDayToggle(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="all-day" className="text-sm font-medium cursor-pointer">
              Evento giornaliero (9:00 - 18:00)
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Inizio *
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Fine *
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventType['category'])}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="meeting">Meeting</option>
              <option value="deep_work">Deep Work</option>
              <option value="admin">Admin</option>
              <option value="personal">Personale</option>
              <option value="break">Pausa</option>
              <option value="other">Altro</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Importanza (1-5)
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Bassa</span>
              <span className="font-medium">{importance}</span>
              <span>Alta</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Luogo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Es: Via Roma 123, Milano"
              />
              {location.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    const query = encodeURIComponent(location.trim())
                    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
                  }}
                  className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 hover:bg-accent transition-colors"
                  title="Apri in Google Maps"
                >
                  <MapPin className="h-4 w-4" />
                  Indicazioni
                </button>
              )}
            </div>
          </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1 min-h-[44px]">
                {loading ? 'Salvataggio...' : 'Salva'}
              </Button>
              {event?.id && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                  className="min-h-[44px]"
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="sm:inline">Elimina</span>
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose} className="min-h-[44px]">
                Annulla
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}