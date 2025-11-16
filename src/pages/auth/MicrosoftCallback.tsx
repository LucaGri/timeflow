import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleMicrosoftCallback } from '@/lib/microsoft/auth'
import { Loader2 } from 'lucide-react'

export default function MicrosoftCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const stateReceived = params.get('state')
        const error = params.get('error')
        const errorDescription = params.get('error_description')

        console.log('📨 Callback params:', {
          hasCode: !!code,
          stateReceived,
          error,
          errorDescription
        })

        if (error) {
          console.error('OAuth error:', error, errorDescription)
          setError(errorDescription || 'Authentication cancelled or failed')
          setTimeout(() => navigate('/settings?error=' + encodeURIComponent(error)), 3000)
          return
        }

        if (!code) {
          console.error('No authorization code received')
          setError('No authorization code received')
          setTimeout(() => navigate('/settings?error=no_code'), 3000)
          return
        }

        // Get saved state
        const stateSaved = localStorage.getItem('microsoft_oauth_state')  // ✅ localStorage
        console.log('📥 Received state from Microsoft:', stateReceived)  // ✅ AGGIUNGI
        console.log('💾 Saved state in localStorage:', stateSaved)  // ✅ AGGIUNGI
        console.log('🔍 States match?', stateReceived === stateSaved)  // ✅ AGGIUNGI
        console.log('🔍 State comparison:', { stateReceived, stateSaved })

        // CRITICAL: Only validate if state was sent
        if (stateReceived && stateSaved) {
          if (stateReceived !== stateSaved) {
            console.error('State mismatch!')
            localStorage.removeItem('microsoft_oauth_state')  // ✅ localStorage
            localStorage.removeItem('microsoft_code_verifier')  // ✅ localStorage
            setError('Invalid state parameter - possible CSRF attack')
            setTimeout(() => navigate('/settings?error=invalid_state'), 3000)
            return
          }
        } else if (!stateReceived && !stateSaved) {
          // Old flow without state - allow but warn
          console.warn('⚠️ State parameter not used (old flow)')
        }

        // Clean up state
        localStorage.removeItem('microsoft_oauth_state')  // ✅ localStorage

        console.log('✅ State validated, handling callback via serverless function...')

        // Handle callback via secure serverless function
        // This will exchange code for tokens and save to database
        await handleMicrosoftCallback(code, stateReceived || '')

        console.log('✅ Microsoft Calendar connected successfully')

        navigate('/settings?success=microsoft_connected')

      } catch (error) {
        console.error('❌ Callback error:', error)
        setError(error instanceof Error ? error.message : 'Error during connection')
        setTimeout(() => navigate('/settings?error=callback_failed'), 3000)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        {error ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-xl font-semibold text-destructive">Error</h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Redirecting...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Connecting...</h2>
            <p className="mt-2 text-muted-foreground">
              Setting up Microsoft Calendar
            </p>
          </>
        )}
      </div>
    </div>
  )
}
