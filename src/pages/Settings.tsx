import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { initiateGoogleAuth, disconnectGoogle } from '@/lib/google/auth'
import { Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

export default function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [searchParams] = useSearchParams()
  const success = searchParams.get('success')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(data)
    }
    setLoading(false)
  }

  const handleConnectGoogle = () => {
    initiateGoogleAuth()
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Impostazioni</h1>
        <p className="mt-2 text-muted-foreground">
          Gestisci il tuo account e le integrazioni
        </p>
      </div>

      {/* Success message */}
      {success === 'google' && (
        <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Google Calendar connesso con successo!</span>
          </div>
        </div>
      )}

      {/* Profile Section */}
      <div className="mb-8 rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Profilo</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nome</label>
            <p className="text-lg">{profile?.full_name || 'Non impostato'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Stato Abbonamento</label>
            <div className="flex items-center gap-2">
              {profile?.subscription_status === 'trial' && (
                <>
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                    Trial Attivo
                  </span>
                  {profile.trial_ends_at && (
                    <span className="text-sm text-muted-foreground">
                      Termina il {new Date(profile.trial_ends_at).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </>
              )}
              {profile?.subscription_status === 'active' && (
                <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                  Attivo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Google Calendar Integration */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Google Calendar
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sincronizza i tuoi eventi con Google Calendar
            </p>
          </div>
          
          {profile?.google_calendar_connected ? (
            <CheckCircle className="h-6 w-6 text-green-500" />
          ) : (
            <XCircle className="h-6 w-6 text-gray-400" />
          )}
        </div>

        <div className="mt-4">
          {profile?.google_calendar_connected ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-sm text-green-800">
                  ✓ Google Calendar è connesso e sincronizzato
                </p>
              </div>
              
              <Button
                variant="outline"
                onClick={handleDisconnectGoogle}
                disabled={disconnecting}
              >
                {disconnecting ? 'Disconnessione...' : 'Disconnetti Google Calendar'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  Connetti il tuo Google Calendar per:
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span>
                    Importare automaticamente i tuoi eventi
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span>
                    Sincronizzazione bidirezionale in tempo reale
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span>
                    Visualizzare tutto in un unico posto
                  </li>
                </ul>
              </div>

              <Button onClick={handleConnectGoogle}>
                <Calendar className="mr-2 h-4 w-4" />
                Connetti Google Calendar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
