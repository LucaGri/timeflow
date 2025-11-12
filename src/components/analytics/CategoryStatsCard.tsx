import { CategoryStats, formatDuration } from '@/lib/analytics/timeStats'

interface CategoryStatsCardProps {
  stats: CategoryStats[]
}

const categoryLabels: Record<string, string> = {
  meeting: 'Meeting',
  deep_work: 'Deep Work',
  admin: 'Admin',
  personal: 'Personale',
  break: 'Pause',
  other: 'Altro',
}

export default function CategoryStatsCard({ stats }: CategoryStatsCardProps) {
  if (stats.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Tempo per Categoria</h3>
        <p className="text-muted-foreground text-center py-8">
          Nessun dato disponibile
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">Tempo per Categoria</h3>
      
      <div className="space-y-4">
        {stats.map((stat) => (
          <div key={stat.category}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stat.color }}
                />
                <span className="font-medium">
                  {categoryLabels[stat.category] || stat.category}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {stat.eventCount} {stat.eventCount === 1 ? 'evento' : 'eventi'}
                </span>
                <span className="font-semibold">{formatDuration(stat.totalMinutes)}</span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${stat.percentage}%`,
                  backgroundColor: stat.color,
                }}
              />
            </div>
            
            <div className="text-xs text-muted-foreground mt-1">
              {stat.percentage}% del tempo totale
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}