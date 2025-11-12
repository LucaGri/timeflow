import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

export default function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold">Inizia gratis</h2>
        <p className="mt-2 text-muted-foreground">
          14 giorni di prova gratuita. Nessuna carta richiesta.
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="fullName" className="block text-sm font-medium mb-2">
            Nome completo
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Mario Rossi"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="nome@esempio.it"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="••••••••"
            minLength={6}
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Almeno 6 caratteri
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creazione account...' : 'Crea account'}
        </Button>

        <p className="text-xs text-muted-foreground">
          Registrandoti, accetti i nostri{' '}
          <Link to="/terms" className="underline">
            Termini di Servizio
          </Link>{' '}
          e{' '}
          <Link to="/privacy" className="underline">
            Privacy Policy
          </Link>
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Hai già un account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Accedi
        </Link>
      </p>
    </div>
  )
}
