import { supabase } from '@/lib/supabase'
import type { CalendarProvider, Event } from '@/lib/supabase'
import { getMicrosoftEvents } from '@/lib/microsoft/calendar'
import { getValidMicrosoftToken } from '@/lib/microsoft/auth'
import { subMonths, addMonths } from 'date-fns'

/**
 * Sync result statistics
 */
export interface MicrosoftSyncResult {
  direction: 'toTimeFlow' | 'toMicrosoft'
  created: number
  updated: number
  deleted: number
  errors: string[]
  timestamp: string
}

/**
 * Sync events from Microsoft Calendar to TimeFlow
 * Pull events from Microsoft and create/update them in TimeFlow database
 */
export async function syncMicrosoftToTimeFlow(
  provider: CalendarProvider
): Promise<MicrosoftSyncResult> {
  const result: MicrosoftSyncResult = {
    direction: 'toTimeFlow',
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  }

  try {
    // Verify token is valid
    const accessToken = await getValidMicrosoftToken()
    if (!accessToken) {
      throw new Error('No valid Microsoft access token available')
    }

    // Fetch events from Microsoft (±3 months from now)
    const now = new Date()
    const startDate = subMonths(now, 3)
    const endDate = addMonths(now, 3)

    const microsoftEvents = await getMicrosoftEvents(startDate, endDate)

    // Get existing TimeFlow events with Microsoft IDs
    const { data: existingEvents, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', provider.user_id)
      .not('microsoft_event_id', 'is', null)

    if (fetchError) throw fetchError

    // Create a map of Microsoft event ID -> TimeFlow event
    const existingEventsMap = new Map<string, Event>()
    existingEvents?.forEach((event) => {
      if (event.microsoft_event_id) {
        existingEventsMap.set(event.microsoft_event_id, event as Event)
      }
    })

    // Process each Microsoft event
    for (const msEvent of microsoftEvents) {
      try {
        // Null check: microsoft_event_id can be null
        if (!msEvent.microsoft_event_id) {
          result.errors.push('Event missing microsoft_event_id')
          continue
        }

        const microsoftEventId = msEvent.microsoft_event_id
        const existingEvent = existingEventsMap.get(microsoftEventId)

        if (existingEvent) {
          // Check if event was modified (compare updated_at timestamps)
          const msUpdatedAt = new Date(msEvent.updated_at)
          const tfUpdatedAt = new Date(existingEvent.updated_at)

          // Update if Microsoft event is newer (last-write-wins)
          if (msUpdatedAt > tfUpdatedAt) {
            const { error: updateError } = await supabase
              .from('events')
              .update({
                title: msEvent.title,
                description: msEvent.description,
                start_time: msEvent.start_time,
                end_time: msEvent.end_time,
                all_day: msEvent.all_day,
                location: msEvent.location,
                synced_to_microsoft: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingEvent.id)

            if (updateError) {
              result.errors.push(`Failed to update event ${existingEvent.id}: ${updateError.message}`)
            } else {
              result.updated++
            }
          }

          // Remove from map (events left in map will be considered deleted)
          existingEventsMap.delete(microsoftEventId)
        } else {
          // Create new event in TimeFlow
          const newEvent = {
            user_id: provider.user_id,
            title: msEvent.title,
            description: msEvent.description,
            start_time: msEvent.start_time,
            end_time: msEvent.end_time,
            all_day: msEvent.all_day,
            location: msEvent.location,
            microsoft_event_id: microsoftEventId,
            synced_to_microsoft: true,
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
        result.errors.push(`Error processing Microsoft event: ${errorMsg}`)
      }
    }

    // Handle deleted events (events still in map were not found in Microsoft)
    // Mark them as not synced rather than deleting
    for (const [microsoftId, tfEvent] of existingEventsMap) {
      try {
        const { error: updateError } = await supabase
          .from('events')
          .update({
            synced_to_microsoft: false,
          })
          .eq('id', tfEvent.id)

        if (updateError) {
          result.errors.push(`Failed to mark event as unsynced: ${updateError.message}`)
        } else {
          result.deleted++
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Error handling deleted event ${microsoftId}: ${errorMsg}`)
      }
    }

    // Update provider's last sync timestamp
    await supabase
      .from('calendar_providers')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', provider.id)

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(`Sync failed: ${errorMsg}`)
  }

  return result
}

/**
 * DISABLED: Sync events from TimeFlow to Microsoft Calendar
 * Export functionality disabled for MVP - import-only mode
 * 
 * This will be re-enabled when bidirectional sync is required
 */
export async function syncTimeFlowToMicrosoft(

): Promise<MicrosoftSyncResult> {
  // Return empty result - export disabled for MVP
  return {
    direction: 'toMicrosoft',
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  }
}

/**
 * Import-only sync: Microsoft -> TimeFlow
 * Export is disabled for MVP
 */
export async function bidirectionalMicrosoftSync(
  provider: CalendarProvider
): Promise<{ toTimeFlow: MicrosoftSyncResult; toMicrosoft: MicrosoftSyncResult }> {
  // Import from Microsoft
  const toTimeFlow = await syncMicrosoftToTimeFlow(provider)
  
  // DISABLED: Export to Microsoft for MVP
  const toMicrosoft: MicrosoftSyncResult = {
    direction: 'toMicrosoft',
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  }

  return { toTimeFlow, toMicrosoft }
}