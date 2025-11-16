import { useState, useEffect } from 'react'
import { supabase, Event as EventType, UserCategory } from '@/lib/supabase'
import { calculateCategoryStats, calculateDailyStats, calculateWeekStats, getMostProductiveHour, calculateWeeklyStats } from '@/lib/analytics/timeStats'
import CategoryStatsCard from '@/components/analytics/CategoryStatsCard'
import WeekSummaryCard from '@/components/analytics/WeekSummaryCard'
import { Loader2, Lightbulb } from 'lucide-react'

export default function Analytics() {
  const [events, setEvents] = useState<EventType[]>([])
  const [categories, setCategories] = useState<UserCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week')

  useEffect(() => {
    loadEvents()
  }, [timeRange])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load user categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('user_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true })

      if (categoriesError) {
        console.error('Error loading categories:', categoriesError)
      } else {
        setCategories(categoriesData || [])
      }

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
    } catch (err) {
      console.error('Error loading analytics data:', err)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const categoryStats = calculateCategoryStats(events, categories)
  const dailyStats = timeRange === 'week'
    ? calculateDailyStats(events, 7)
    : calculateWeeklyStats(events, 4)
  const weekStats = calculateWeekStats(events)
  const productiveHour = getMostProductiveHour(events)

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 pt-12 md:pt-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Analizza come spendi il tuo tempo
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-1 rounded-lg border p-1 self-start">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[44px] sm:min-h-0 ${
                timeRange === 'week'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              7 giorni
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[44px] sm:min-h-0 ${
                timeRange === 'month'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              30 giorni
            </button>
          </div>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 sm:p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted">
            <span className="text-2xl sm:text-3xl">📊</span>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Nessun dato disponibile</h3>
          <p className="text-sm sm:text-base text-muted-foreground">
            Crea alcuni eventi nel calendario per vedere le statistiche qui
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Week Summary */}
          {timeRange === 'week' && <WeekSummaryCard weekStats={weekStats} />}

          {/* Insight Card */}
          {events.length > 5 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm sm:text-base">Insight</h4>
                  <p className="text-xs sm:text-sm text-blue-800 mt-1">
                    La tua ora più produttiva è alle <strong>{productiveHour}:00</strong>.
                    Considera di programmare le attività più importanti in questo orario.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Category Stats */}
            <CategoryStatsCard stats={categoryStats} />

            {/* Daily/Weekly Chart */}
            <div className="rounded-lg border bg-card p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-4">
                {timeRange === 'week' ? 'Ultimi 7 Giorni' : 'Ultime 4 Settimane'}
              </h3>
              <div className="flex items-end justify-between gap-1 sm:gap-2 h-36 sm:h-48">
                {dailyStats.map((day) => {
                  const maxMinutes = Math.max(...dailyStats.map((d) => d.totalMinutes), 1)
                  const heightPercent = maxMinutes > 0 ? (day.totalMinutes / maxMinutes) * 100 : 0
                  const hours = Math.round((day.totalMinutes / 60) * 10) / 10

                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 sm:gap-2">
                      <div className="w-full flex flex-col items-center justify-end h-28 sm:h-40">
                        {day.totalMinutes > 0 && (
                          <div className="text-[10px] sm:text-xs font-medium mb-1 text-primary">
                            {hours}h
                          </div>
                        )}
                        <div
                          className="w-full bg-primary rounded-t transition-all duration-300 hover:opacity-80"
                          style={{ height: `${heightPercent}%`, minHeight: day.totalMinutes > 0 ? '4px' : '0' }}
                          title={`${hours} ore`}
                        />
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground font-medium text-center">
                        {timeRange === 'week'
                          ? new Date(day.date).toLocaleDateString('it-IT', { weekday: 'short' }).substring(0, 3)
                          : day.date.replace('Settimana ', 'S.')
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-lg border bg-card p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Totale Eventi</p>
              <p className="text-xl sm:text-2xl font-bold">{events.length}</p>
            </div>
            <div className="rounded-lg border bg-card p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Categoria Più Usata</p>
              <p className="text-base sm:text-xl lg:text-2xl font-bold capitalize truncate">
                {categoryStats[0]?.categoryName || '-'}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Media Eventi/Giorno</p>
              <p className="text-xl sm:text-2xl font-bold">
                {Math.round((events.length / (timeRange === 'week' ? 7 : 30)) * 10) / 10}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
