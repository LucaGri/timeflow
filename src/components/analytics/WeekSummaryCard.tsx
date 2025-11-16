import { WeekStats, formatDuration } from '@/lib/analytics/timeStats'
import { Calendar, Clock, TrendingUp } from 'lucide-react'

interface WeekSummaryCardProps {
  weekStats: WeekStats
}

export default function WeekSummaryCard({ weekStats }: WeekSummaryCardProps) {
  const avgPerDay = weekStats.totalMinutes / 7
  const weekStartDate = new Date(weekStats.weekStart)
  const weekEndDate = new Date(weekStats.weekEnd)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Ultimi 7 Giorni</h3>
        <div className="text-sm text-muted-foreground">
          {formatDate(weekStartDate)} - {formatDate(weekEndDate)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Tempo Totale</span>
          </div>
          <p className="text-2xl font-bold">{formatDuration(weekStats.totalMinutes)}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Eventi</span>
          </div>
          <p className="text-2xl font-bold">{weekStats.eventCount}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Media/Giorno</span>
          </div>
          <p className="text-2xl font-bold">{formatDuration(avgPerDay)}</p>
        </div>
      </div>
    </div>
  )
}