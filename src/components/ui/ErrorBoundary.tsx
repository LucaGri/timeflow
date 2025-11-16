import { Component, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'

interface Props {
  children: ReactNode
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Ops! Qualcosa è andato storto</h2>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {this.props.fallbackMessage ||
                  "Si è verificato un errore imprevisto. Questo potrebbe essere dovuto a una migrazione del database non completata o a un problema di connessione."}
              </p>

              {this.state.error && (
                <details className="text-xs bg-muted p-3 rounded border border-border">
                  <summary className="cursor-pointer font-medium text-foreground mb-2">
                    Dettagli tecnici
                  </summary>
                  <pre className="whitespace-pre-wrap break-all text-destructive">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}

              <div className="flex flex-col gap-2">
                <Button onClick={this.handleReset} className="w-full">
                  Ricarica la pagina
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full"
                >
                  Torna alla Dashboard
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Suggerimento:</strong> Se il problema persiste, verifica che la migrazione del database
                  sia stata eseguita correttamente in Supabase SQL Editor.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
