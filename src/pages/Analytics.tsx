import { useState, useEffect } from 'react'
import { supabase, Event as EventType } from '@/lib/supabase'
import { calculateCategoryStats, calculateDailyStats, calculateWeekStats, getMostProductiveHour, calculateWeeklyStats } from '@/lib/analytics/timeStats'
import CategoryStatsCard from '@/components/analytics/CategoryStatsCard'
import WeekSummaryCard from '@/components/analytics/WeekSummaryCard'
import { Loader2, Lightbulb } from 'lucide-react'

export default function Analytics() {
  const [events, setEvents] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week')

  useEffect(() => {
    loadEvents()
  }, [timeRange])

  const loadEvents = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Calcola range date
    const endDate = new Date()
    const startDate = new Date()
    if (timeRange === 'week') {
      startDate.setDate(endDate.getDate() - 7)
    } else {
      startDate.setDate(endDate.getDate() - 30)
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: false })

    if (error) {
      console.error('Error loading events:', error)
      setLoading(false)
      return
    }

    setEvents(data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const categoryStats = calculateCategoryStats(events)
  const dailyStats = timeRange === 'week' 
    ? calculateDailyStats(events, 7)
    : calculateWeeklyStats(events, 4)
  const weekStats = calculateWeekStats(events)
  const productiveHour = getMostProductiveHour(events)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="mt-2 text-muted-foreground">
            Analizza come spendi il tuo tempo
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 rounded-lg border p-1">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeRange === 'week'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            Ultimi 7 giorni
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeRange === 'month'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            Ultimi 30 giorni
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <span className="text-3xl">📊</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Nessun dato disponibile</h3>
          <p className="text-muted-foreground">
            Crea alcuni eventi nel calendario per vedere le statistiche qui
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Week Summary */}
          {timeRange === 'week' && <WeekSummaryCard weekStats={weekStats} />}

          {/* Insight Card */}
          {events.length > 5 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">Insight</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    La tua ora più produttiva è alle <strong>{productiveHour}:00</strong>. 
                    Considera di programmare le attività più importanti in questo orario.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Stats */}
            <CategoryStatsCard stats={categoryStats} />

            {/* Daily/Weekly Chart */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">
                {timeRange === 'week' ? 'Ultimi 7 Giorni' : 'Ultime 4 Settimane'}
              </h3>
              <div className="flex items-end justify-between gap-2 h-48">
                {dailyStats.map((day) => {
                  const maxMinutes = Math.max(...dailyStats.map((d) => d.totalMinutes), 1)
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
                      <div className="text-xs text-muted-foreground font-medium text-center">
                        {timeRange === 'week' 
                          ? new Date(day.date).toLocaleDateString('it-IT', { weekday: 'short' }).substring(0, 3)
                          : day.date.replace('Settimana ', 'Sett. ')
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground mb-1">Totale Eventi</p>
              <p className="text-2xl font-bold">{events.length}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground mb-1">Categoria Più Usata</p>
              <p className="text-2xl font-bold capitalize">
                {categoryStats[0]?.category.replace('_', ' ') || '-'}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground mb-1">Media Eventi/Giorno</p>
              <p className="text-2xl font-bold">
                {Math.round((events.length / (timeRange === 'week' ? 7 : 30)) * 10) / 10}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
