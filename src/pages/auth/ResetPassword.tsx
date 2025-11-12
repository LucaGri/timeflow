import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff } from 'lucide-react'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Verifica che l'utente sia in una sessione di recupero password
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Utente è in modalità recupero password - ok
      }
    })
  }, [])

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'La password deve contenere almeno 8 caratteri'
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'La password deve contenere almeno una lettera maiuscola'
    }
    if (!/[a-z]/.test(pwd)) {
      return 'La password deve contenere almeno una lettera minuscola'
    }
    if (!/[0-9]/.test(pwd)) {
      return 'La password deve contenere almeno un numero'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validazione
    const validationError = validatePassword(password)
    if (validationError) {
      setError(validationError)
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Successo!
    alert('Password aggiornata con successo!')
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Reimposta Password</h2>
          <p className="mt-2 text-muted-foreground">
            Inserisci la tua nuova password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">
              Nuova Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Almeno 8 caratteri"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>La password deve contenere:</p>
              <ul className="list-inside list-disc space-y-1">
                <li className={password.length >= 8 ? 'text-green-600' : ''}>
                  Almeno 8 caratteri
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                  Una lettera maiuscola
                </li>
                <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                  Una lettera minuscola
                </li>
                <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                  Un numero
                </li>
              </ul>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">
              Conferma Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ripeti la password"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}