// Microsoft OAuth callback handler
// Securely exchanges authorization code for tokens server-side

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin, verifyUserToken } from '../_supabase'
import type { ApiResponse } from '../_types'

// CORS headers for development
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.VITE_APP_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
}

interface CalendarProvider {
  id: string
  user_id: string
  provider: string
  provider_email: string | null
  provider_user_id: string | null
  is_active: boolean
}

interface MicrosoftTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
}

// Helper function to add CORS headers to response
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
  res.setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods'])
  res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers'])
  res.setHeader('Access-Control-Allow-Credentials', corsHeaders['Access-Control-Allow-Credentials'])
  res.setHeader('Content-Type', 'application/json')
  return res
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res)
    return res.status(200).end()
  }

  // Set CORS headers for all responses
  setCorsHeaders(res)

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
  }

  try {
    // Verify user authentication
    const userId = await verifyUserToken(req.headers.authorization || null)
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or missing authentication token' }
      })
    }

    const { code, state, redirectUri, codeVerifier } = req.body

    if (!code) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CODE', message: 'Authorization code is required' }
      })
    }

    // Exchange code for tokens using PKCE
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

    const params: Record<string, string> = {
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      redirect_uri: redirectUri || `${process.env.VITE_APP_URL}/auth/microsoft/callback`,
      grant_type: 'authorization_code',
    }

    // Use PKCE if codeVerifier is provided (for backward compatibility)
    // Otherwise use client_secret (for confidential client flow)
    if (codeVerifier) {
      params.code_verifier = codeVerifier
    } else if (process.env.MICROSOFT_CLIENT_SECRET) {
      params.client_secret = process.env.MICROSOFT_CLIENT_SECRET
    }

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json()
      console.error('Token exchange failed:', error)
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_EXCHANGE_FAILED',
          message: 'Failed to exchange authorization code for tokens. Please try again.',
          details: error
        }
      })
    }

    const tokens: MicrosoftTokenResponse = await tokenResponse.json()

    // Get user's Microsoft account info
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info')
      return res.status(500).json({
        success: false,
        error: { code: 'USER_INFO_FAILED', message: 'Failed to fetch Microsoft account information' }
      })
    }

    const userInfo = await userInfoResponse.json()
    const providerEmail = userInfo.mail || userInfo.userPrincipalName
    const providerUserId = userInfo.id

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Check if this calendar provider already exists
    const { data: existingProvider } = await supabaseAdmin
      .from('calendar_providers')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'microsoft')
      .single()

    let calendarProvider: CalendarProvider

    if (existingProvider) {
      // Update existing provider
      const { data, error } = await supabaseAdmin
        .from('calendar_providers')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || existingProvider.refresh_token, // Keep old refresh token if not provided
          token_expires_at: tokenExpiresAt,
          provider_email: providerEmail,
          provider_user_id: providerUserId,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProvider.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update calendar provider:', error)
        return res.status(500).json({
          success: false,
          error: { code: 'DB_UPDATE_FAILED', message: 'Failed to update calendar connection', details: error }
        })
      }

      calendarProvider = data
    } else {
      // Create new provider
      const { data, error } = await supabaseAdmin
        .from('calendar_providers')
        .insert({
          user_id: userId,
          provider: 'microsoft',
          provider_user_id: providerUserId,
          provider_email: providerEmail,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create calendar provider:', error)
        return res.status(500).json({
          success: false,
          error: { code: 'DB_INSERT_FAILED', message: 'Failed to save calendar connection', details: error }
        })
      }

      calendarProvider = data
    }

    // Also update profiles table for backward compatibility
    await supabaseAdmin
      .from('profiles')
      .update({
        microsoft_calendar_connected: true
      })
      .eq('id', userId)

    // Return success with account info (without sensitive tokens)
    const response: ApiResponse<{ provider: Partial<CalendarProvider> }> = {
      success: true,
      data: {
        provider: {
          id: calendarProvider.id,
          provider: calendarProvider.provider,
          provider_email: calendarProvider.provider_email,
          is_active: calendarProvider.is_active
        }
      }
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while connecting your calendar',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}
