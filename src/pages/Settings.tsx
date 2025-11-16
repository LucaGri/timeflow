import { useEffect, useState } from 'react'
import { supabase, Profile, CalendarProvider } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { initiateGoogleAuth, disconnectGoogle } from '@/lib/google/auth'
import { initiateMicrosoftAuth, disconnectMicrosoft } from '@/lib/microsoft/auth'
import { Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { CategoryManager } from '@/components/categories/CategoryManager'
import { formatDistanceToNow } from 'date-fns'

export default function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectingMicrosoft, setDisconnectingMicrosoft] = useState(false)
  const [googleProvider, setGoogleProvider] = useState<CalendarProvider | null>(null)
  const [microsoftProvider, setMicrosoftProvider] = useState<CalendarProvider | null>(null)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const success = searchParams.get('success')
  const error = searchParams.get('error')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data)

      // Load Google provider connection
      const { data: googleProv } = await supabase
        .from('calendar_providers')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .maybeSingle()

      setGoogleProvider(googleProv)

      // Load Microsoft provider connection
      const { data: msProvider } = await supabase
        .from('calendar_providers')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'microsoft')
        .eq('is_active', true)
        .maybeSingle()

      setMicrosoftProvider(msProvider)
    }
    setLoading(false)
  }

  const handleConnectGoogle = () => {
    initiateGoogleAuth()
  }

  const handleConnectMicrosoft = async () => {
    await initiateMicrosoftAuth()
  }

  const handleDisconnectMicrosoft = async () => {
    if (!confirm('Are you sure you want to disconnect Microsoft Calendar?')) return

    setDisconnectingMicrosoft(true)
    try {
      await disconnectMicrosoft()
      await loadProfile()
    } catch (error) {
      console.error('Error disconnecting Microsoft:', error)
      alert('Error during disconnection')
    }
    setDisconnectingMicrosoft(false)
  }

  const validatePassword = (pwd: string): string | null => {
  if (pwd.length < 8) return 'La password deve contenere almeno 8 caratteri'
  if (!/[A-Z]/.test(pwd)) return 'La password deve contenere almeno una lettera maiuscola'
  if (!/[a-z]/.test(pwd)) return 'La password deve contenere almeno una lettera minuscola'
  if (!/[0-9]/.test(pwd)) return 'La password deve contenere almeno un numero'
  return null
}

const handleChangePassword = async (e: React.FormEvent) => {
  e.preventDefault()
  setPasswordLoading(true)
  setPasswordError(null)

  // Validazione
  const validationError = validatePassword(newPassword)
  if (validationError) {
    setPasswordError(validationError)
    setPasswordLoading(false)
    return
  }

  if (newPassword !== confirmPassword) {
    setPasswordError('Le password non coincidono')
    setPasswordLoading(false)
    return
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    setPasswordError(error.message)
    setPasswordLoading(false)
    return
  }

  // Successo
  alert('Password aggiornata con successo!')
  setShowChangePassword(false)
  setNewPassword('')
  setConfirmPassword('')
  setPasswordLoading(false)
}

  const handleDisconnectGoogle = async () => {
    if (!confirm('Sei sicuro di voler disconnettere Google Calendar?')) return
    
    setDisconnecting(true)
    try {
      await disconnectGoogle()
      await loadProfile()
    } catch (error) {
      console.error('Error disconnecting:', error)
      alert('Errore durante la disconnessione')
    }
    setDisconnecting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 pt-12 md:pt-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Impostazioni</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Gestisci il tuo account e le integrazioni
        </p>
      </div>

      {/* Success messages */}
      {success === 'google' && (
        <div className="mb-4 sm:mb-6 rounded-lg bg-green-50 border border-green-200 p-3 sm:p-4 text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="font-medium text-sm sm:text-base">Google Calendar connesso con successo!</span>
          </div>
        </div>
      )}

      {success === 'microsoft' && (
        <div className="mb-4 sm:mb-6 rounded-lg bg-green-50 border border-green-200 p-3 sm:p-4 text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="font-medium text-sm sm:text-base">Microsoft Calendar connected successfully!</span>
          </div>
        </div>
      )}

      {success === 'microsoft_connected' && (
        <div className="mb-4 sm:mb-6 rounded-lg bg-green-50 border border-green-200 p-3 sm:p-4 text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="font-medium text-sm sm:text-base">Microsoft Calendar connected successfully!</span>
          </div>
        </div>
      )}

      {/* Error messages */}
      {error && (
        <div className="mb-4 sm:mb-6 rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4 text-red-800">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-sm sm:text-base block">Connection Error</span>
              <span className="text-xs sm:text-sm text-red-700 block mt-1">
                {error === 'invalid_state' && 'Invalid state parameter - possible CSRF attack. Please try again.'}
                {error === 'no_code' && 'No authorization code received. Please try again.'}
                {error === 'callback_failed' && 'Failed to complete the connection. Please try again.'}
                {!['invalid_state', 'no_code', 'callback_failed'].includes(error) &&
                  `Error: ${decodeURIComponent(error)}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Profile Section */}
      <div className="mb-6 sm:mb-8 rounded-lg border bg-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Profilo</h2>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2">Nome</label>
            <p className="text-base sm:text-lg">{profile?.full_name || 'Non impostato'}</p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2">Stato Abbonamento</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {profile?.subscription_status === 'trial' && (
                <>
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium self-start">
                    Trial Attivo
                  </span>
                  {profile.trial_ends_at && (
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Termina il {new Date(profile.trial_ends_at).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </>
              )}
              {profile?.subscription_status === 'active' && (
                <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs sm:text-sm font-medium self-start">
                  Attivo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Google Calendar Integration */}
      <div className="mb-6 sm:mb-8 rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-3">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>Google Calendar</span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Sincronizza i tuoi eventi con Google Calendar
            </p>
          </div>

          {googleProvider ? (
            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 flex-shrink-0" />
          )}
        </div>

        <div className="mt-3 sm:mt-4">
          {googleProvider ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-green-800 font-medium">
                  ✓ Google Calendar è connesso e sincronizzato
                </p>
                {googleProvider.provider_email && (
                  <p className="text-xs sm:text-sm text-green-700 mt-1">
                    Account: {googleProvider.provider_email}
                  </p>
                )}
                {googleProvider.updated_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Last synced: {formatDistanceToNow(new Date(googleProvider.updated_at), { addSuffix: true })}
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                onClick={handleDisconnectGoogle}
                disabled={disconnecting}
                className="min-h-[44px] sm:min-h-0 w-full sm:w-auto"
              >
                {disconnecting ? 'Disconnessione...' : 'Disconnetti Google Calendar'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <div className="rounded-lg bg-muted p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Connetti il tuo Google Calendar per:
                </p>
                <ul className="mt-2 space-y-1 text-xs sm:text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-primary flex-shrink-0">✓</span>
                    Importare automaticamente i tuoi eventi
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary flex-shrink-0">✓</span>
                    Sincronizzazione bidirezionale in tempo reale
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary flex-shrink-0">✓</span>
                    Visualizzare tutto in un unico posto
                  </li>
                </ul>
              </div>

              <Button onClick={handleConnectGoogle} className="min-h-[44px] sm:min-h-0 w-full sm:w-auto">
                <Calendar className="mr-2 h-4 w-4" />
                Connetti Google Calendar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 
      ========================================
      MICROSOFT CALENDAR - TEMPORANEAMENTE DISABILITATO
      ========================================
      
      Motivo: Costi Azure non sostenibili per MVP
      Piano: Riabilitare come feature Premium in Phase 2
      
      Per riattivare: rimuovi questo commento multi-linea
      
      {/* Microsoft Calendar Integration 
      <div className="mb-6 sm:mb-8 rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-3">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <span className="text-xl sm:text-2xl">📧</span>
              <span>Microsoft Calendar</span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Sync your events with Microsoft Outlook Calendar
            </p>
          </div>

          {microsoftProvider ? (
            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 flex-shrink-0" />
          )}
        </div>

        <div className="mt-3 sm:mt-4">
          {microsoftProvider ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-green-800 font-medium">
                  ✓ Microsoft Calendar is connected and synced
                </p>
                {microsoftProvider.provider_email && (
                  <p className="text-xs sm:text-sm text-green-700 mt-1">
                    Account: {microsoftProvider.provider_email}
                  </p>
                )}
                {microsoftProvider.updated_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Last synced: {formatDistanceToNow(new Date(microsoftProvider.updated_at), { addSuffix: true })}
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                onClick={handleDisconnectMicrosoft}
                disabled={disconnectingMicrosoft}
                className="min-h-[44px] sm:min-h-0 w-full sm:w-auto"
              >
                {disconnectingMicrosoft ? 'Disconnecting...' : 'Disconnect Microsoft Calendar'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <div className="rounded-lg bg-muted p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Connect your Microsoft Calendar to:
                </p>
                <ul className="mt-2 space-y-1 text-xs sm:text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-primary flex-shrink-0">✓</span>
                    Automatically import your Outlook events
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary flex-shrink-0">✓</span>
                    Two-way real-time synchronization
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary flex-shrink-0">✓</span>
                    View everything in one place
                  </li>
                </ul>
              </div>

              <Button onClick={handleConnectMicrosoft} className="min-h-[44px] sm:min-h-0 w-full sm:w-auto">
                <span className="mr-2 text-lg">📧</span>
                Connect Microsoft Calendar
              </Button>
            </div>
          )}
        </div>
      </div>
      */}

      {/* Password Section */}
      <div className="mb-6 sm:mb-8 rounded-lg border bg-card p-4 sm:p-6">
        <div className="mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Password</h2>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Modifica la tua password
          </p>
        </div>

        {!showChangePassword ? (
          <Button onClick={() => setShowChangePassword(true)} className="min-h-[44px] sm:min-h-0 w-full sm:w-auto">
            Cambia Password
          </Button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4">
            {passwordError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs sm:text-sm text-destructive">
                {passwordError}
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs sm:text-sm font-medium">
                Nuova Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Almeno 8 caratteri"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <ul className="list-inside list-disc space-y-1">
                  <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                    Almeno 8 caratteri
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>
                    Una lettera maiuscola
                  </li>
                  <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>
                    Una lettera minuscola
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                    Un numero
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs sm:text-sm font-medium">
                Conferma Nuova Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ripeti la password"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button type="submit" disabled={passwordLoading} className="min-h-[44px] sm:min-h-0 w-full sm:w-auto">
                {passwordLoading ? 'Aggiornamento...' : 'Aggiorna Password'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowChangePassword(false)
                  setNewPassword('')
                  setConfirmPassword('')
                  setPasswordError(null)
                }}
                className="min-h-[44px] sm:min-h-0 w-full sm:w-auto"
              >
                Annulla
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Category Management Section */}
      {userId && (
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <CategoryManager userId={userId} />
        </div>
      )}
    </div>
  )
}
