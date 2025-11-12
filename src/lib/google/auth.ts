import { supabase } from '@/lib/supabase'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET
const REDIRECT_URI = `${window.location.origin}/auth/callback`

// Scopes necessari per Google Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
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

// Scambia il codice di autorizzazione per i token
export const handleGoogleCallback = async (code: string, state: string) => {
  // Verifica stato per sicurezza
  const savedState = sessionStorage.getItem('google_auth_state')
  if (state !== savedState) {
    throw new Error('Invalid state parameter')
  }
  sessionStorage.removeItem('google_auth_state')

  // Scambia il codice per i token
  const tokenUrl = 'https://oauth2.googleapis.com/token'
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code: ${error}`)
  }

  const data = await response.json()
  
  // Salva i token nel profilo utente
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update({
      google_calendar_connected: true,
      google_access_token: data.access_token,
      google_refresh_token: data.refresh_token,
      google_token_expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq('id', user.id)

  if (error) throw error

  return data
}

// Ottieni un access token valido (rinnova se scaduto)
export const getValidAccessToken = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.google_access_token) return null

  // Controlla se il token è ancora valido
  const expiry = new Date(profile.google_token_expiry || 0)
  const now = new Date()

  if (expiry > now) {
    return profile.google_access_token
  }

  // Token scaduto, rinnova
  if (!profile.google_refresh_token) {
    throw new Error('No refresh token available')
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token'
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: profile.google_refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  const data = await response.json()

  // Aggiorna il token nel database
  await supabase
    .from('profiles')
    .update({
      google_access_token: data.access_token,
      google_token_expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq('id', user.id)

  return data.access_token
}

// Disconnetti Google Calendar
export const disconnectGoogle = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

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