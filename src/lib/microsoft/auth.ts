import { supabase } from '@/lib/supabase'

const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID
const REDIRECT_URI = `${window.location.origin}/auth/microsoft/callback`

// Microsoft OAuth endpoints
const AUTHORIZE_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'

// Required scopes for Microsoft Calendar access
const SCOPES = [
  'Calendars.ReadWrite',
  'offline_access', // Required to get refresh token
  'User.Read', // Required to get user email/profile info
].join(' ')

// PKCE Helper Functions
/**
 * Generate a random string for code verifier
 * @param length - Length of the string (43-128 chars for PKCE)
 */
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return values.reduce((acc, x) => acc + possible[x % possible.length], '')
}

/**
 * SHA256 hash a string
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return crypto.subtle.digest('SHA-256', data)
}

/**
 * Base64URL encode an array buffer
 */
function base64urlencode(buffer: ArrayBuffer): string {
  const str = String.fromCharCode(...new Uint8Array(buffer))
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Generate code challenge from code verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await sha256(verifier)
  return base64urlencode(hashed)
}

/**
 * Get the Microsoft OAuth authorization URL
 * Initiates the OAuth flow by redirecting user to Microsoft login with PKCE
 */
export const getMicrosoftAuthUrl = async (): Promise<string> => {
  const authUrl = new URL(AUTHORIZE_ENDPOINT)

  // Generate PKCE values
  const codeVerifier = generateRandomString(128)
  const codeChallenge = await generateCodeChallenge(codeVerifier)

 // Store verifier for later use in token exchange
localStorage.setItem('microsoft_code_verifier', codeVerifier)  // ✅ localStorage

  authUrl.searchParams.append('client_id', MICROSOFT_CLIENT_ID)
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('scope', SCOPES)
  authUrl.searchParams.append('response_mode', 'query')
  authUrl.searchParams.append('code_challenge', codeChallenge)
  authUrl.searchParams.append('code_challenge_method', 'S256')

 // Generate and store state for CSRF protection (32+ chars)
const state = generateRandomString(32)
console.log('🔐 Generated state:', state)
localStorage.setItem('microsoft_oauth_state', state)  // ✅ localStorage invece di sessionStorage
authUrl.searchParams.append('state', state)

  return authUrl.toString()
}

/**
 * Initiate Microsoft OAuth flow
 * Redirects the user to Microsoft login page
 */
export const initiateMicrosoftAuth = async () => {
  const authUrl = await getMicrosoftAuthUrl()
  window.location.href = authUrl
}

/**
 * Get PKCE code verifier from session storage
 * Used by serverless function for token exchange
 * @returns Code verifier for PKCE flow
 */
export const getCodeVerifier = () => {
  // Retrieve verifier from storage
  const codeVerifier = localStorage.getItem('microsoft_code_verifier')  // ✅ localStorage

  // Clear verifier from storage
  if (codeVerifier) {
    localStorage.removeItem('microsoft_code_verifier')  // ✅ localStorage
  }

  // Note: Even though we have PKCE verifier, the serverless function
  // will prefer using client_secret if available for better security
  // PKCE is kept as fallback for backward compatibility
  return codeVerifier
}

/**
 * Refresh an expired access token via serverless function (SECURE VERSION)
 * @deprecated This function is kept for backward compatibility but is no longer used
 * Token refresh is now handled automatically by getValidMicrosoftToken via serverless function
 * @returns null
 */
export const refreshMicrosoftToken = async () => {
  // This function is now just a wrapper for backward compatibility
  // The actual refresh is handled by the serverless function
  // which reads the refresh token from the database
  return null
}

/**
 * Handle Microsoft OAuth callback (SECURE VERSION - via serverless function)
 * Exchanges code for tokens and stores them in calendar_providers table
 * @param code - Authorization code from OAuth callback
 * @param state - State parameter for validation
 */
// SOSTITUISCI la funzione handleMicrosoftCallback con questa:

export const handleMicrosoftCallback = async (code: string, state: string) => {
  const savedState = sessionStorage.getItem('microsoft_oauth_state')
  if (state !== savedState) {
    throw new Error('Invalid state parameter - possible CSRF attack')
  }
  sessionStorage.removeItem('microsoft_oauth_state')

  const codeVerifier = sessionStorage.getItem('microsoft_code_verifier')
  sessionStorage.removeItem('microsoft_code_verifier')

  if (!codeVerifier) {
    throw new Error('Code verifier not found')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Exchange code for tokens using PKCE (client-side, no secret needed)
  const tokenResponse = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier, // PKCE - no secret needed!
      }),
    }
  )

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json()
    throw new Error(error.error_description || 'Failed to exchange code')
  }

  const tokens = await tokenResponse.json()

  // Get user info
  const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const userInfo = await userInfoResponse.json()

  // Save to calendar_providers
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from('calendar_providers').upsert({
    user_id: user.id,
    provider: 'microsoft',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: expiresAt,
    provider_email: userInfo.userPrincipalName,
    provider_user_id: userInfo.id,
    is_active: true,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id,provider'
  })

  return { email: userInfo.userPrincipalName }
}

/**
 * Get a valid Microsoft access token for the current user (SECURE VERSION)
 * Automatically refreshes if expired via serverless function
 * @returns Valid access token or null if not connected
 */
export const getValidMicrosoftToken = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: provider } = await supabase
    .from('calendar_providers')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'microsoft')
    .eq('is_active', true)
    .maybeSingle()

  if (!provider || !provider.access_token) return null

  const expiry = new Date(provider.token_expires_at || 0)
  const now = new Date()
  const bufferTime = 5 * 60 * 1000

  if (expiry.getTime() > now.getTime() + bufferTime) {
    return provider.access_token
  }

  // Token expired, refresh CLIENT-SIDE
  if (!provider.refresh_token) {
    throw new Error('No refresh token. Please reconnect Microsoft Calendar.')
  }

  try {
    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID,
          refresh_token: provider.refresh_token,
          grant_type: 'refresh_token',
          scope: SCOPES,
        }),
      }
    )

    if (!tokenResponse.ok) {
      throw new Error('Token refresh failed. Please reconnect.')
    }

    const tokens = await tokenResponse.json()
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await supabase
      .from('calendar_providers')
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('provider', 'microsoft')

    return tokens.access_token
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

/**
 * Disconnect Microsoft Calendar for the current user
 * Removes the provider from calendar_providers table
 */
export const disconnectMicrosoft = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('calendar_providers')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('provider', 'microsoft')
}

/**
 * Check if Microsoft Calendar is connected for the current user
 * @returns true if connected, false otherwise
 */
export const isMicrosoftConnected = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('calendar_providers')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'microsoft')
    .eq('is_active', true)
    .single()

  return !error && !!data
}
