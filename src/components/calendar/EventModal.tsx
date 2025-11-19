import { useState, useEffect } from 'react'
import { supabase, Event as EventType, UserCategory } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { X, Trash2, MapPin, Video } from 'lucide-react'
import { WORKING_HOURS } from '@/lib/constants'
import { DailyProvider } from '@daily-co/daily-react'
import { DailyVideoRoom } from '../VideoCall/DailyVideoRoom'
import { createVideoRoomForEvent } from '@/services/videoService'

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
  const [categoryId, setCategoryId] = useState<string>('')
  const [categories, setCategories] = useState<UserCategory[]>([])
  const [importance, setImportance] = useState(3)
  const [location, setLocation] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Video call states
  const [isVideoMeeting, setIsVideoMeeting] = useState(false)
  const [inCall, setInCall] = useState(false)
  const [videoRoomUrl, setVideoRoomUrl] = useState<string>('')
  const [creatingRoom, setCreatingRoom] = useState(false)

  useEffect(() => {
    loadCategories()
    if (event) {
      setTitle(event.title || '')
      setDescription(event.description || '')
      setStartTime(event.start_time || '')
      setEndTime(event.end_time || '')
      setCategoryId(event.category_id || '')
      setImportance(event.importance || 3)
      setLocation(event.location || '')
      setIsAllDay(event.all_day || false)
      setIsVideoMeeting(event.is_video_meeting || false)
      setVideoRoomUrl(event.video_room_url || '')
    }
  }, [event])

  async function loadCategories() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    if (data) setCategories(data)
  }

  const handleAllDayToggle = (checked: boolean) => {
  setIsAllDay(checked)
  if (checked) {
    const dateStr = startTime.split('T')[0] || new Date().toISOString().split('T')[0]
    // Formatta 9 → '09:00', 18 → '18:00'
    const startHour = String(WORKING_HOURS.START).padStart(2, '0')
    const endHour = String(WORKING_HOURS.END).padStart(2, '0')
    setStartTime(`${dateStr}T${startHour}:00`)
    setEndTime(`${dateStr}T${endHour}:00`)
  }
}

  const handleJoinMeeting = async () => {
    try {
      setCreatingRoom(true)
      
      // Se non esiste room, creala
      if (!videoRoomUrl && event?.id) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const room = await createVideoRoomForEvent(
          event.id,
          event.title || 'Meeting',
          user.id
        )
        setVideoRoomUrl(room.url)
      }
      
      setInCall(true)
    } catch (error) {
      console.error('Failed to join meeting:', error)
      setError('Impossibile avviare il meeting. Riprova.')
    } finally {
      setCreatingRoom(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Il titolo è obbligatorio')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')

      const eventData = {
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        category_id: categoryId || null,
        importance,
        location,
        all_day: isAllDay,
        user_id: user.id,
        is_video_meeting: isVideoMeeting,
      }

      if (event?.id) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id)

        if (updateError) throw updateError
      } else {
        // Create new event
        const { data: newEvent, error: insertError } = await supabase
          .from('events')
          .insert([eventData])
          .select()
          .single()

        if (insertError) throw insertError

        // Se è un video meeting, crea subito la room
        if (isVideoMeeting && newEvent) {
          try {
            const room = await createVideoRoomForEvent(
              newEvent.id,
              newEvent.title,
              user.id
            )
            setVideoRoomUrl(room.url)
          } catch (roomError) {
            console.error('Failed to create video room:', roomError)
            // Non bloccare il salvataggio se fallisce la room
          }
        }
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error saving event:', error)
      setError(error.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event?.id || !confirm('Sei sicuro di voler eliminare questo evento?')) return

    setLoading(true)
    try {
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)

      if (deleteError) throw deleteError

      onSave()
      onClose()
    } catch (error: any) {
      setError(error.message || 'Errore durante l\'eliminazione')
    } finally {
      setLoading(false)
    }
  }

  // Se siamo in chiamata, mostra il video full-screen
  if (inCall && videoRoomUrl) {
    return (
      <DailyProvider>
        <DailyVideoRoom 
          roomUrl={videoRoomUrl}
          onLeave={() => {
            setInCall(false)
            onClose()
          }}
        />
      </DailyProvider>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 sm:px-6 py-4">
          <h2 className="text-lg sm:text-xl font-semibold">
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

            {/* Video Meeting Toggle - mostra SOLO se è nuovo evento O già abilitato */}
            {(!event?.id || isVideoMeeting) && (
              <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <input
                  type="checkbox"
                  id="video-meeting"
                  checked={isVideoMeeting}
                  onChange={(e) => setIsVideoMeeting(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <label htmlFor="video-meeting" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  <Video className="h-4 w-4 text-blue-600" />
                  Abilita video meeting
                </label>
              </div>
            )}

            {/* Join Meeting Button - mostra SOLO se evento già esiste e ha video */}
            {event?.id && (isVideoMeeting || videoRoomUrl) && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Video meeting disponibile</span>
                  </div>
                  <Button
                    type="button"
                    onClick={handleJoinMeeting}
                    disabled={creatingRoom}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {creatingRoom ? 'Preparazione...' : '🎥 Join Meeting'}
                  </Button>
                </div>
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
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Nessuna categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Importanza: {importance}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={importance}
                onChange={(e) => setImportance(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Bassa</span>
                <span>Alta</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Luogo
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Es: Ufficio, Zoom, ecc."
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t px-4 sm:px-6 py-4">
          <Button
            type="submit"
            form="event-form"
            disabled={loading}
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            {loading ? 'Salvataggio...' : 'Salva'}
          </Button>
          {event?.id && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="min-h-[44px] flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="sm:inline">Elimina</span>
            </Button>
          )}
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            Annulla
          </Button>
        </div>
      </div>
    </div>
  )
}