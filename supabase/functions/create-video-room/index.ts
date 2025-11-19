import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Daily.co credentials from environment
    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY')
    const DAILY_API_URL = 'https://api.daily.co/v1'

    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured')
    }

    // Parse request body
    const { eventId, eventTitle, userId } = await req.json()

    if (!eventId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: eventId, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify event exists and belongs to user
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('user_id', userId)
      .single()

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If room already exists, return it
    if (event.video_room_url) {
      return new Response(
        JSON.stringify({ 
          room: { 
            url: event.video_room_url,
            name: event.video_room_name 
          } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new Daily.co room
    const roomName = `timeflow-${eventId}`
    const dailyResponse = await fetch(`${DAILY_API_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'public',
        properties: {
          enable_screenshare: true,
          enable_chat: true,
          enable_recording: 'cloud',
          max_participants: 10,
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // expires in 24h
        }
      })
    })

    if (!dailyResponse.ok) {
      const errorData = await dailyResponse.text()
      console.error('Daily.co API error:', errorData)
      throw new Error(`Failed to create Daily.co room: ${dailyResponse.status}`)
    }

    const room = await dailyResponse.json()

    // Save room info to database
    const { error: updateError } = await supabase
      .from('events')
      .update({ 
        video_room_url: room.url,
        video_room_name: room.name,
        is_video_meeting: true
      })
      .eq('id', eventId)

    if (updateError) {
      console.error('Database update error:', updateError)
      throw new Error('Failed to save room info to database')
    }

    // Return success
    return new Response(
      JSON.stringify({ room }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-video-room:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})