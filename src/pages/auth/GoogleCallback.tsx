import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { handleGoogleCallback } from '@/lib/google/auth'
import { Loader2 } from 'lucide-react'

export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const errorParam = searchParams.get('error')

      if (errorParam) {
        setError('Autenticazione annullata o fallita')
        setTimeout(() => navigate('/settings'), 3000)
        return
      }

      if (!code || !state) {
        setError('Parametri mancanti nel callback')
        setTimeout(() => navigate('/settings'), 3000)
        return
      }

      try {
        await handleGoogleCallback(code, state)
        navigate('/settings?success=google')
      } catch (err) {
        console.error('Error handling callback:', err)
        setError(err instanceof Error ? err.message : 'Errore durante la connessione')
        setTimeout(() => navigate('/settings'), 3000)
      }
    }

    processCallback()
  }, [searchParams, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        {error ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-xl font-semibold text-destructive">Errore</h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Reindirizzamento in corso...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Connessione in corso...</h2>
            <p className="mt-2 text-muted-foreground">
              Sto configurando Google Calendar
            </p>
          </>
        )}
      </div>
    </div>
  )
}