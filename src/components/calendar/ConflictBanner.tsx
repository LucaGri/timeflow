import { Conflict, getConflictCounts } from '@/lib/conflicts/detectConflicts'
import { AlertTriangle, Info, AlertCircle } from 'lucide-react'

interface ConflictBannerProps {
  conflicts: Conflict[]
  onViewDetails: () => void
}

export default function ConflictBanner({ conflicts, onViewDetails }: ConflictBannerProps) {
  if (conflicts.length === 0) return null

  const counts = getConflictCounts(conflicts)
  const maxSeverity = counts.high > 0 ? 'high' : counts.medium > 0 ? 'medium' : 'low'

  const severityConfig = {
    high: {
      icon: AlertCircle,
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      iconColor: 'text-red-600',
    },
    medium: {
      icon: AlertTriangle,
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      iconColor: 'text-yellow-600',
    },
    low: {
      icon: Info,
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      iconColor: 'text-blue-600',
    },
  }

  const config = severityConfig[maxSeverity]
  const Icon = config.icon

  return (
    <div className={`mb-4 rounded-lg border p-4 ${config.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 ${config.iconColor}`} />
          <div>
            <h3 className={`font-semibold ${config.text}`}>
              {counts.total} {counts.total === 1 ? 'Conflitto rilevato' : 'Conflitti rilevati'}
            </h3>
            <p className={`mt-1 text-sm ${config.text} opacity-90`}>
              {counts.high > 0 && `${counts.high} critici, `}
              {counts.medium > 0 && `${counts.medium} medi, `}
              {counts.low > 0 && `${counts.low} lievi`}
            </p>
          </div>
        </div>
        <button
          onClick={onViewDetails}
          className={`text-sm font-medium underline ${config.text} hover:opacity-80`}
        >
          Visualizza dettagli
        </button>
      </div>
    </div>
  )
}