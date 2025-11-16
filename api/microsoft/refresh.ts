// Microsoft OAuth token refresh handler
// Securely refreshes expired access tokens server-side

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin, verifyUserToken } from '../_supabase'
import type { ApiResponse } from '../_types'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.VITE_APP_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
}

interface MicrosoftTokenResponse {
  access_token: string
  refresh_token?: string
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

    // Get calendar provider
    const { data: calendarProvider, error: fetchError } = await supabaseAdmin
      .from('calendar_providers')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'microsoft')
      .single()

    if (fetchError || !calendarProvider) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROVIDER_NOT_FOUND', message: 'Microsoft calendar not connected' }
      })
    }

    if (!calendarProvider.refresh_token) {
      // Disable the provider if no refresh token
      await supabaseAdmin
        .from('calendar_providers')
        .update({ is_active: false })
        .eq('id', calendarProvider.id)

      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'No refresh token available. Please reconnect your Microsoft Calendar.'
        }
      })
    }

    // Refresh the token
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

    const params: Record<string, string> = {
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      refresh_token: calendarProvider.refresh_token,
      grant_type: 'refresh_token',
    }

    // Add client_secret if available (for confidential client flow)
    if (process.env.MICROSOFT_CLIENT_SECRET) {
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
      console.error('Token refresh failed:', error)

      // If refresh token is invalid, mark provider as inactive
      if (error.error === 'invalid_grant') {
        await supabaseAdmin
          .from('calendar_providers')
          .update({ is_active: false })
          .eq('id', calendarProvider.id)

        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Refresh token is invalid. Please reconnect your Microsoft Calendar.',
            details: error
          }
        })
      }

      return res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Failed to refresh access token. Please try again.',
          details: error
        }
      })
    }

    const tokens: MicrosoftTokenResponse = await tokenResponse.json()

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Update provider with new token
    const { error: updateError } = await supabaseAdmin
      .from('calendar_providers')
      .update({
        access_token: tokens.access_token,
        // Microsoft may not return a new refresh_token, so keep the existing one
        refresh_token: tokens.refresh_token || calendarProvider.refresh_token,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', calendarProvider.id)

    if (updateError) {
      console.error('Failed to update tokens:', updateError)
      return res.status(500).json({
        success: false,
        error: { code: 'DB_UPDATE_FAILED', message: 'Failed to save new tokens', details: updateError }
      })
    }

    // Return new token info (for immediate use by client)
    const response: ApiResponse<{ accessToken: string; expiresAt: string }> = {
      success: true,
      data: {
        accessToken: tokens.access_token,
        expiresAt: tokenExpiresAt
      }
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Unexpected error in token refresh:', error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while refreshing token',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}
