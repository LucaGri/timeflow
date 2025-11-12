import { Conflict } from '@/lib/conflicts/detectConflicts'
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ConflictListProps {
  conflicts: Conflict[]
  onClose: () => void
}

export default function ConflictList({ conflicts, onClose }: ConflictListProps) {
  const severityConfig = {
    high: {
      icon: AlertCircle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      badge: 'bg-red-200 text-red-900',
    },
    medium: {
      icon: AlertTriangle,
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      badge: 'bg-yellow-200 text-yellow-900',
    },
    low: {
      icon: Info,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      badge: 'bg-blue-200 text-blue-900',
    },
  }

  const typeLabels = {
    direct_overlap: 'Sovrapposizione',
    overload: 'Sovraccarico',
    recovery_needed: 'Necessità recupero',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-lg bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between sticky top-0 bg-card pb-2">
          <h2 className="text-2xl font-bold">Conflitti Rilevati</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {conflicts.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-lg font-medium">Nessun conflitto!</p>
            <p className="mt-2 text-muted-foreground">
              Il tuo calendario è ben organizzato.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conflicts.map((conflict, index) => {
              const config = severityConfig[conflict.severity]
              const Icon = config.icon

              return (
                <div
                  key={index}
                  className={`rounded-lg border p-4 ${config.bg} ${config.border}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${config.text}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${config.badge}`}>
                          {typeLabels[conflict.type]}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${config.badge}`}>
                          {conflict.severity === 'high' ? 'Critico' : 
                           conflict.severity === 'medium' ? 'Medio' : 'Lieve'}
                        </span>
                      </div>
                      <p className={`font-medium ${config.text}`}>
                        {conflict.description}
                      </p>
                      <p className={`mt-2 text-sm ${config.text} opacity-75`}>
                        💡 {conflict.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Chiudi</Button>
        </div>
      </div>
    </div>
  )
}