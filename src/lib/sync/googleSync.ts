import { supabase, Event as EventType } from '@/lib/supabase'
// import {
//   createGoogleEvent,
//   updateGoogleEvent,
// } from '@/lib/google/calendar'
import { getValidAccessToken } from '@/lib/google/auth'
import { subMonths, addMonths } from 'date-fns'

/**
 * Sync result statistics
 */
export interface GoogleSyncResult {
  direction: 'toTimeFlow' | 'toGoogle'
  created: number
  updated: number
  deleted: number
  errors: string[]
  timestamp: string
}

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

/**
 * Fetch events from Google Calendar
 */
async function fetchGoogleEvents(
  accessToken: string,
  startDate: Date,
  endDate: Date,
  calendarId: string = 'primary'
): Promise<any[]> {
  const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events`)
  url.searchParams.append('timeMin', startDate.toISOString())
  url.searchParams.append('timeMax', endDate.toISOString())
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
  return data.items || []
}

/**
 * Sync events from Google Calendar to TimeFlow
 */
export async function syncGoogleToTimeFlow(
  userId: string,
  calendarId: string = 'primary'
): Promise<GoogleSyncResult> {
  const result: GoogleSyncResult = {
    direction: 'toTimeFlow',
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  }

  try {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      throw new Error('No valid Google access token available')
    }

    // Fetch events from Google (±3 months from now)
    const now = new Date()
    const startDate = subMonths(now, 3)
    const endDate = addMonths(now, 3)

    const googleEvents = await fetchGoogleEvents(accessToken, startDate, endDate, calendarId)

    // Get existing TimeFlow events with Google IDs
    const { data: existingEvents, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .not('google_event_id', 'is', null)

    if (fetchError) throw fetchError

    // Create a map of Google event ID -> TimeFlow event
    const existingEventsMap = new Map<string, EventType>()
    existingEvents?.forEach((event) => {
      if (event.google_event_id) {
        existingEventsMap.set(event.google_event_id, event)
      }
    })

    // Process each Google event
    for (const gEvent of googleEvents) {
      try {
        const start = gEvent.start.dateTime || gEvent.start.date
        const end = gEvent.end.dateTime || gEvent.end.date
        const isAllDay = !gEvent.start.dateTime

        const existingEvent = existingEventsMap.get(gEvent.id)

        if (existingEvent) {
          // Check if event was modified
          const gUpdatedAt = new Date(gEvent.updated)
          const tfUpdatedAt = new Date(existingEvent.updated_at)

          // Update if Google event is newer (last-write-wins)
          if (gUpdatedAt > tfUpdatedAt) {
            const { error: updateError } = await supabase
              .from('events')
              .update({
                title: gEvent.summary || 'Untitled Event',
                description: gEvent.description || null,
                start_time: start,
                end_time: end,
                all_day: isAllDay,
                location: gEvent.location || null,
                synced_to_google: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingEvent.id)

            if (updateError) {
              result.errors.push(`Failed to update event ${existingEvent.id}: ${updateError.message}`)
            } else {
              result.updated++
            }
          }

          existingEventsMap.delete(gEvent.id)
        } else {
          // Create new event in TimeFlow
          const newEvent = {
            user_id: userId,
            title: gEvent.summary || 'Untitled Event',
            description: gEvent.description || null,
            start_time: start,
            end_time: end,
            all_day: isAllDay,
            location: gEvent.location || null,
            google_event_id: gEvent.id,
            google_calendar_id: calendarId,
            synced_to_google: true,
            category: 'other' as const,
            importance: 3,
          }

          const { error: insertError } = await supabase
            .from('events')
            .insert(newEvent)

          if (insertError) {
            result.errors.push(`Failed to create event: ${insertError.message}`)
          } else {
            result.created++
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Error processing event ${gEvent.id}: ${errorMsg}`)
      }
    }

    // Mark deleted events as unsynced
    for (const [googleId, tfEvent] of existingEventsMap) {
      try {
        const { error: updateError } = await supabase
          .from('events')
          .update({ synced_to_google: false })
          .eq('id', tfEvent.id)

        if (updateError) {
          result.errors.push(`Failed to mark event as unsynced: ${updateError.message}`)
        } else {
          result.deleted++
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Error handling deleted event ${googleId}: ${errorMsg}`)
      }
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(`Sync failed: ${errorMsg}`)
  }

  return result
}

/**
 * Sync events from TimeFlow to Google Calendar
 
export async function syncTimeFlowToGoogle(
  userId: string
): Promise<GoogleSyncResult> {
  const result: GoogleSyncResult = {
    direction: 'toGoogle',
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  }
  try {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      throw new Error('No valid Google access token available')
    }

    // Get events that need to be synced to Google
    const { data: eventsToSync, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .or('google_event_id.is.null,synced_to_google.eq.false')
      .gte('start_time', subMonths(new Date(), 3).toISOString())
      .lte('start_time', addMonths(new Date(), 3).toISOString())

    if (fetchError) throw fetchError

    if (!eventsToSync || eventsToSync.length === 0) {
      return result
    }

    // Process each event
    for (const event of eventsToSync) {
      try {
        if (event.google_event_id) {
          // Update existing event in Google
          const success = await updateGoogleEvent(event.google_event_id, event)

          if (success) {
            await supabase
              .from('events')
              .update({
                synced_to_google: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', event.id)

            result.updated++
          } else {
            result.errors.push(`Failed to update event ${event.id} in Google`)
          }
        } else {
          // Create new event in Google
          const googleEventId = await createGoogleEvent(event)

          if (googleEventId) {
            await supabase
              .from('events')
              .update({
                google_event_id: googleEventId,
                synced_to_google: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', event.id)

            result.created++
          } else {
            result.errors.push(`Failed to create event ${event.id} in Google`)
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Error syncing event ${event.id}: ${errorMsg}`)
      }
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(`Sync failed: ${errorMsg}`)
  }

  return result
}*/

/**
 * Bidirectional sync: Google <-> TimeFlow
 */
export async function bidirectionalGoogleSync(
  userId: string,
  calendarId: string = 'primary'
): Promise<{ toTimeFlow: GoogleSyncResult; toGoogle: GoogleSyncResult }> {
  
  const toTimeFlow = await syncGoogleToTimeFlow(userId, calendarId)
  
  // DISABLED: Export to Google for MVP
  const toGoogle: GoogleSyncResult = {
    direction: 'toGoogle',
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  }

  return { toTimeFlow, toGoogle }
}