import { supabase } from "../lib/supabase";

export interface VideoRoom {
  url: string
  name: string
}

export async function createVideoRoomForEvent(
  eventId: string,
  eventTitle: string,
  userId: string
): Promise<VideoRoom> {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase.functions.invoke('create-video-room', {
    body: { eventId, eventTitle, userId }
  })

  if (error) {
    console.error('Error creating video room:', error)
    throw error
  }

  return data.room
}