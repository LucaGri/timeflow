import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Conflict } from '@/lib/conflicts/detectConflicts'
import { getConflictCounts } from '@/lib/conflicts/detectConflicts'

interface ConflictIndicatorButtonProps {
  conflicts: Conflict[]
  onClick: () => void
}

export const ConflictIndicatorButton: React.FC<ConflictIndicatorButtonProps> = ({
  conflicts,
  onClick
}) => {
  const counts = getConflictCounts(conflicts)

  // Determine severity and styling
  const getSeverityConfig = () => {
    if (counts.high > 0) {
      return {
        icon: AlertCircle,
        variant: 'destructive' as const,
        className: 'bg-red-500 hover:bg-red-600 text-white',
        label: counts.total
      }
    }
    if (counts.medium > 0) {
      return {
        icon: AlertTriangle,
        variant: 'outline' as const,
        className: 'border-yellow-500 text-yellow-600 hover:bg-yellow-50',
        label: counts.total
      }
    }
    if (counts.low > 0) {
      return {
        icon: AlertTriangle,
        variant: 'outline' as const,
        className: 'border-blue-500 text-blue-600 hover:bg-blue-50',
        label: counts.total
      }
    }
    // No conflicts
    return {
      icon: CheckCircle,
      variant: 'outline' as const,
      className: 'border-green-500 text-green-600 hover:bg-green-50',
      label: 0
    }
  }

  const config = getSeverityConfig()
  const Icon = config.icon

  return (
    <Button
      variant={config.variant}
      size="sm"
      onClick={onClick}
      className={`relative ${config.className}`}
      title={
        counts.total > 0
          ? `${counts.total} conflitti rilevati`
          : 'Nessun conflitto'
      }
    >
      <Icon className="h-4 w-4" />
      {counts.total > 0 && (
        <span className="ml-1.5 text-xs font-semibold">
          {counts.total}
        </span>
      )}
    </Button>
  )
}
