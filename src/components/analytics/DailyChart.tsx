import { DayStats } from '@/lib/analytics/timeStats'

interface DailyChartProps {
  dailyStats: DayStats[]
}

export default function DailyChart({ dailyStats }: DailyChartProps) {
  const maxMinutes = Math.max(...dailyStats.map((d) => d.totalMinutes), 1)

  const formatDay = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('it-IT', { weekday: 'short' }).substring(0, 3)
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">Ultimi 7 Giorni</h3>

      <div className="flex items-end justify-between gap-2 h-48">
        {dailyStats.map((day) => {
          const heightPercent = maxMinutes > 0 ? (day.totalMinutes / maxMinutes) * 100 : 0
          const hours = Math.round((day.totalMinutes / 60) * 10) / 10

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center justify-end h-40">
                {day.totalMinutes > 0 && (
                  <div className="text-xs font-medium mb-1 text-primary">
                    {hours}h
                  </div>
                )}
                <div
                  className="w-full bg-primary rounded-t transition-all duration-300 hover:opacity-80"
                  style={{ height: `${heightPercent}%`, minHeight: day.totalMinutes > 0 ? '4px' : '0' }}
                  title={`${hours} ore`}
                />
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                {formatDay(day.date)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}