// Shared types for Vercel serverless functions

export interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

export interface CalendarAccount {
  id: string
  user_id: string
  provider: 'google' | 'outlook'
  provider_account_id: string
  account_email: string
  access_token: string | null
  refresh_token: string | null
  token_expiry: string | null
  is_primary: boolean
  sync_enabled: boolean
  last_sync_at: string | null
  sync_token: string | null
  created_at: string
  updated_at: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

export interface OAuthCallbackRequest {
  code: string
  state: string
  userId: string
}

export interface TokenRefreshRequest {
  accountId: string
  userId: string
}
