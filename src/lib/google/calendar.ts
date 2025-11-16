import { supabase, Event as EventType } from '@/lib/supabase'
import { getValidAccessToken } from './auth'

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

// Importa eventi da Google Calendar
export const syncFromGoogle = async (calendarId: string = 'primary') => {
  const accessToken = await getValidAccessToken()
  if (!accessToken) throw new Error('Non autenticato con Google')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Utente non autenticato')

  // Fetch eventi da Google Calendar
  const now = new Date()
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const url = new URL(`${CALENDAR_API_BASE}/calendars/${calendarId}/events`)
  url.searchParams.append('timeMin', oneMonthAgo.toISOString())
  url.searchParams.append('timeMax', oneMonthLater.toISOString())
  url.searchParams.append('singleEvents', 'true')
  url.searchParams.append('orderBy', 'startTime')

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Google Calendar events')
  }

  const data = await response.json()
  const googleEvents = data.items || []

  // Ottieni eventi esistenti da Supabase per evitare duplicati
  const { data: existingEvents } = await supabase
    .from('events')
    .select('google_event_id')
    .eq('user_id', user.id)
    .not('google_event_id', 'is', null)

  const existingGoogleIds = new Set(
    existingEvents?.map((e) => e.google_event_id) || []
  )

  // Crea solo eventi nuovi
  const newEvents = googleEvents
    .filter((gEvent: any) => !existingGoogleIds.has(gEvent.id))
    .map((gEvent: any) => {
      const start = gEvent.start.dateTime || gEvent.start.date
      const end = gEvent.end.dateTime || gEvent.end.date

      return {
        user_id: user.id,
        title: gEvent.summary || 'Evento senza titolo',
        description: gEvent.description || null,
        start_time: start,
        end_time: end,
        all_day: !gEvent.start.dateTime,
        location: gEvent.location || null,
        google_event_id: gEvent.id,
        google_calendar_id: calendarId,
        category: 'other' as const,
        importance: 3,
      }
    })

  if (newEvents.length > 0) {
    const { error } = await supabase.from('events').insert(newEvents)
    if (error) throw error
  }

  return { imported: newEvents.length, total: googleEvents.length }
}

// Crea evento su Google Calendar
export const createGoogleEvent = async (event: EventType) => {
  const accessToken = await getValidAccessToken()
  if (!accessToken) return null

  const googleEvent = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: event.all_day
      ? { date: event.start_time.split('T')[0] }
      : { dateTime: event.start_time, timeZone: 'UTC' },
    end: event.all_day
      ? { date: event.end_time.split('T')[0] }
      : { dateTime: event.end_time, timeZone: 'UTC' },
  }

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleEvent),
    }
  )

  if (!response.ok) {
    console.error('Failed to create Google event')
    return null
  }

  const data = await response.json()
  return data.id
}

// Aggiorna evento su Google Calendar
export const updateGoogleEvent = async (
  googleEventId: string,
  event: EventType
) => {
  const accessToken = await getValidAccessToken()
  if (!accessToken) return false

  const googleEvent = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: event.all_day
      ? { date: event.start_time.split('T')[0] }
      : { dateTime: event.start_time, timeZone: 'UTC' },
    end: event.all_day
      ? { date: event.end_time.split('T')[0] }
      : { dateTime: event.end_time, timeZone: 'UTC' },
  }

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events/${googleEventId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleEvent),
    }
  )

  return response.ok
}

// Elimina evento da Google Calendar
export const deleteGoogleEvent = async (googleEventId: string) => {
  const accessToken = await getValidAccessToken()
  if (!accessToken) return false

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events/${googleEventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  return response.ok
}