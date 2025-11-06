import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/supabase'
import { Calendar, Clock, BookOpen, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Caricamento...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Ciao, {profile?.full_name || 'Utente'}! 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Ecco una panoramica della tua giornata
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Eventi oggi</p>
              <p className="text-2xl font-bold">5</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ore programmate</p>
              <p className="text-2xl font-bold">6.5h</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Note diario</p>
              <p className="text-2xl font-bold">3</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Produttività</p>
              <p className="text-2xl font-bold">85%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trial status */}
      {profile?.subscription_status === 'trial' && profile.trial_ends_at && (
        <div className="mb-8 rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
          <h3 className="font-semibold text-lg mb-2">Periodo di prova attivo</h3>
          <p className="text-muted-foreground">
            Il tuo periodo di prova termina il{' '}
            {new Date(profile.trial_ends_at).toLocaleDateString('it-IT')}.
            Aggiorna per continuare a usare TimeFlow senza interruzioni.
          </p>
        </div>
      )}

      {/* Upcoming events placeholder */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Prossimi eventi</h2>
        <p className="text-muted-foreground">
          I tuoi eventi appariranno qui. Inizia creando il tuo primo evento nel calendario!
        </p>
      </div>
    </div>
  )
}
