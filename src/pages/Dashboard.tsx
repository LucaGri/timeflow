import { useEffect, useState } from 'react'
import { supabase, Event as EventType } from '@/lib/supabase'
import { Calendar, Clock, TrendingUp, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { calculateCategoryStats, formatDuration } from '@/lib/analytics/timeStats'

export default function Dashboard() {
  const [todayEvents, setTodayEvents] = useState<EventType[]>([])
  const [weekEvents, setWeekEvents] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
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

  const categoryLabels: Record<string, string> = {
    meeting: 'Meeting',
    deep_work: 'Deep Work',
    admin: 'Admin',
    personal: 'Personale',
    break: 'Pause',
    other: 'Altro',
  }

  const nextEvent = getNextEvent()
  const todayHours = calculateTodayHours()
  const categoryStats = calculateCategoryStats(weekEvents)
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Bentornato! Ecco una panoramica della tua giornata
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Eventi Oggi</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-bold">{todayEvents.length}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Ore Oggi</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-bold">{todayHours}h</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Eventi Settimana</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-bold">{weekEvents.length}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Categoria Top</span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <p className="text-lg font-bold capitalize">
            {topCategory ? categoryLabels[topCategory.category] : 'N/A'}
          </p>
        </div>
      </div>

      {/* Next Event */}
      {nextEvent && (
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Prossimo Evento</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-blue-900">{nextEvent.title}</p>
              <p className="text-sm text-blue-700 mt-1">
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
            <Link to="/calendar">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Vedi Calendario
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Today's Events */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Eventi di Oggi</h2>
          <Link to="/calendar" className="text-sm text-primary hover:underline">
            Vedi tutti
          </Link>
        </div>

        {todayEvents.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nessun evento programmato per oggi</p>
            <Link to="/calendar">
              <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
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
                  className={`rounded-lg border bg-card p-4 ${isPast ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{event.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
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
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                      {categoryLabels[event.category] || event.category}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/calendar" className="block">
          <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer">
            <Calendar className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Calendario</h3>
            <p className="text-sm text-muted-foreground">
              Visualizza e gestisci i tuoi eventi
            </p>
          </div>
        </Link>

        <Link to="/analytics" className="block">
          <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer">
            <TrendingUp className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Analizza come spendi il tuo tempo
            </p>
          </div>
        </Link>

        <Link to="/journal" className="block">
          <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer">
            <BookOpen className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Diario</h3>
            <p className="text-sm text-muted-foreground">
              Scrivi le tue riflessioni quotidiane
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}