import { useEffect, useState } from 'react'
import { supabase, Event as EventType, UserCategory } from '@/lib/supabase'
import { Calendar, Clock, TrendingUp, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { calculateCategoryStats } from '@/lib/analytics/timeStats'

export default function Dashboard() {
  const [todayEvents, setTodayEvents] = useState<EventType[]>([])
  const [weekEvents, setWeekEvents] = useState<EventType[]>([])
  const [categories, setCategories] = useState<UserCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay() + 1) // Lunedì
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

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

    // Eventi di oggi
    const { data: todayData } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .order('start_time', { ascending: true })

    // Eventi della settimana
    const { data: weekData } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', weekStart.toISOString())
      .lt('start_time', weekEnd.toISOString())

    setTodayEvents(todayData || [])
    setWeekEvents(weekData || [])
      setLoading(false)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setLoading(false)
    }
  }

  const getNextEvent = () => {
    const now = new Date()
    return todayEvents.find(event => new Date(event.start_time) > now)
  }

  const calculateTodayHours = () => {
    let totalMinutes = 0
    todayEvents.forEach(event => {
      const start = new Date(event.start_time)
      const end = new Date(event.end_time)
      totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60)
    })
    return Math.round((totalMinutes / 60) * 10) / 10
  }

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Senza categoria'
    const category = categories.find(c => c.id === categoryId)
    return category?.name || 'Sconosciuta'
  }

  const nextEvent = getNextEvent()
  const todayHours = calculateTodayHours()
  const categoryStats = calculateCategoryStats(weekEvents, categories)
  const topCategory = categoryStats[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 pt-12 md:pt-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Bentornato! Ecco una panoramica della tua giornata
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-muted-foreground">Eventi Oggi</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold">{todayEvents.length}</p>
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-muted-foreground">Ore Oggi</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold">{todayHours}h</p>
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-muted-foreground">Eventi Settimana</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold">{weekEvents.length}</p>
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-muted-foreground">Categoria Top</span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <p className="text-base sm:text-lg font-bold capitalize">
            {topCategory ? topCategory.categoryName : 'N/A'}
          </p>
        </div>
      </div>

      {/* Next Event */}
      {nextEvent && (
        <div className="mb-6 md:mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">Prossimo Evento</h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-lg sm:text-xl font-bold text-blue-900 truncate">{nextEvent.title}</p>
              <p className="text-xs sm:text-sm text-blue-700 mt-1">
                {new Date(nextEvent.start_time).toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                {' - '}
                {new Date(nextEvent.end_time).toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <Link to="/calendar" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Vedi Calendario
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Today's Events */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Eventi di Oggi</h2>
          <Link to="/calendar" className="text-xs sm:text-sm text-primary hover:underline">
            Vedi tutti
          </Link>
        </div>

        {todayEvents.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 sm:p-8 text-center">
            <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm sm:text-base text-muted-foreground">Nessun evento programmato per oggi</p>
            <Link to="/calendar">
              <button className="mt-4 min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                Crea Evento
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {todayEvents.slice(0, 5).map((event) => {
              const isPast = new Date(event.end_time) < new Date()
              return (
                <div
                  key={event.id}
                  className={`rounded-lg border bg-card p-3 sm:p-4 ${isPast ? 'opacity-50' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{event.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {new Date(event.start_time).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {' - '}
                        {new Date(event.end_time).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <span className="inline-flex self-start sm:self-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize whitespace-nowrap">
                      {getCategoryName(event.category_id)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Link to="/calendar" className="block">
          <div className="rounded-lg border bg-card p-5 sm:p-6 hover:shadow-md transition-shadow cursor-pointer">
            <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2 text-base">Calendario</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Visualizza e gestisci i tuoi eventi
            </p>
          </div>
        </Link>

        <Link to="/analytics" className="block">
          <div className="rounded-lg border bg-card p-5 sm:p-6 hover:shadow-md transition-shadow cursor-pointer">
            <TrendingUp className="h-7 w-7 sm:h-8 sm:w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2 text-base">Analytics</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Analizza come spendi il tuo tempo
            </p>
          </div>
        </Link>

        <Link to="/journal" className="block">
          <div className="rounded-lg border bg-card p-5 sm:p-6 hover:shadow-md transition-shadow cursor-pointer">
            <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2 text-base">Diario</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Scrivi le tue riflessioni quotidiane
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}