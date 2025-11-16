import { Check, AlertTriangle, AlertCircle } from 'lucide-react'
import { Conflict } from '@/lib/conflicts/detectConflicts'

interface CompactConflictIndicatorProps {
  conflicts: Conflict[]
  onClick: () => void
}

export function CompactConflictIndicator({ conflicts, onClick }: CompactConflictIndicatorProps) {
  const criticalCount = conflicts.filter(c => c.severity === 'high').length
  const warningCount = conflicts.filter(c => c.severity === 'medium').length

  const getIndicatorContent = () => {
    if (criticalCount > 0) {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        label: criticalCount > 0 ? String(criticalCount) : null,
        color: 'text-red-600 hover:bg-red-50',
        bgColor: 'bg-red-100',
        tooltip: `${criticalCount} conflitt${criticalCount === 1 ? 'o' : 'i'} critic${criticalCount === 1 ? 'o' : 'i'}`,
      }
    }

    if (warningCount > 0) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        label: warningCount > 0 ? String(warningCount) : null,
        color: 'text-yellow-600 hover:bg-yellow-50',
        bgColor: 'bg-yellow-100',
        tooltip: `${warningCount} avvis${warningCount === 1 ? 'o' : 'i'} di sovraccarico`,
      }
    }

    return {
      icon: <Check className="h-4 w-4" />,
      label: null,
      color: 'text-green-600 hover:bg-green-50',
      bgColor: '',
      tooltip: 'Nessun conflitto',
    }
  }

  const indicator = getIndicatorContent()

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 h-10 px-3 py-2 text-sm font-medium rounded-lg border border-input bg-background hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${indicator.color}`}
      title={indicator.tooltip}
      aria-label={indicator.tooltip}
    >
      {indicator.icon}
      {indicator.label && (
        <span className="font-semibold">{indicator.label}</span>
      )}
    </button>
  )
}
