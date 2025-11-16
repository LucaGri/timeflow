import { supabase } from '@/lib/supabase'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = `${window.location.origin}/auth/callback`
const API_BASE_URL = import.meta.env.VITE_APP_URL || window.location.origin

// Scopes necessari per Google Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email', // To get user's email
].join(' ')

// Inizia il flusso OAuth con Google
export const initiateGoogleAuth = () => {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')

  authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID)
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('scope', SCOPES)
  authUrl.searchParams.append('access_type', 'offline') // Per ottenere refresh token
  authUrl.searchParams.append('prompt', 'consent') // Forza il consenso per ottenere refresh token

  // Salva lo stato per validazione dopo redirect
  const state = Math.random().toString(36).substring(7)
  sessionStorage.setItem('google_auth_state', state)
  authUrl.searchParams.append('state', state)

  window.location.href = authUrl.toString()
}

// Scambia il codice di autorizzazione per i token (DEBUG VERSION)
export const handleGoogleCallback = async (code: string, state: string) => {
  // Verifica stato per sicurezza
  const savedState = sessionStorage.getItem('google_auth_state')
  if (state !== savedState) {
    throw new Error('Invalid state parameter - possible CSRF attack')
  }
  sessionStorage.removeItem('google_auth_state')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Exchange code for tokens DIRECTLY (client-side)
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET, // ADD THIS ENV VAR
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange code for tokens')
  }

  const tokens = await tokenResponse.json()

  // Get user email
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const userInfo = await userInfoResponse.json()

  // Save to calendar_providers
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from('calendar_providers').upsert({
    user_id: user.id,
    provider: 'google',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: expiresAt,
    provider_email: userInfo.email,
    is_active: true,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id,provider'
  })

  return { email: userInfo.email }
}

// Ottieni un access token valido (rinnova se scaduto) - SECURE VERSION
export const getValidAccessToken = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: provider } = await supabase
    .from('calendar_providers')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .eq('is_active', true)
    .maybeSingle()

  if (!provider || !provider.access_token) return null

  // Check if token is still valid (with 5-minute buffer)
  const expiry = new Date(provider.token_expires_at || 0)
  const now = new Date()
  const bufferTime = 5 * 60 * 1000

  if (expiry.getTime() > now.getTime() + bufferTime) {
    return provider.access_token
  }

  // Token expired, refresh it CLIENT-SIDE
  if (!provider.refresh_token) {
    throw new Error('No refresh token available. Please reconnect your Google Calendar.')
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
        refresh_token: provider.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Token refresh failed. Please reconnect.')
    }

    const tokens = await tokenResponse.json()
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Update database
    await supabase
      .from('calendar_providers')
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('provider', 'google')

    return tokens.access_token
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

// Disconnetti Google Calendar
export const disconnectGoogle = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Delete from calendar_providers
  await supabase
    .from('calendar_providers')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'google')

  // Also update profiles table for backward compatibility
  await supabase
    .from('profiles')
    .update({
      google_calendar_connected: false,
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
    })
    .eq('id', user.id)
}

// Helper: Check if Google Calendar is connected
export const isGoogleConnected = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: provider } = await supabase
    .from('calendar_providers')
    .select('is_active')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle()

  return provider?.is_active || false
}

// Helper: Get calendar provider info
export const getGoogleProvider = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: provider } = await supabase
    .from('calendar_providers')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle()

  return provider
}
