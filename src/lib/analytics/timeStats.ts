import { Event as EventType } from '@/lib/supabase'

export interface CategoryStats {
  category: EventType['category']
  totalMinutes: number
  totalHours: number
  eventCount: number
  percentage: number
  color: string
}

export interface DayStats {
  date: string
  totalMinutes: number
  eventCount: number
  categories: Record<EventType['category'], number>
}

export interface WeekStats {
  weekStart: string
  weekEnd: string
  totalMinutes: number
  eventCount: number
  dailyStats: DayStats[]
}

// Calcola la durata di un evento in minuti
const getEventDuration = (event: EventType): number => {
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)
  return (end.getTime() - start.getTime()) / (1000 * 60)
}

// Ottieni il colore per categoria
const getCategoryColor = (category: EventType['category']): string => {
  const colors: Record<EventType['category'], string> = {
    meeting: '#3b82f6',
    deep_work: '#8b5cf6',
    admin: '#64748b',
    personal: '#10b981',
    break: '#f59e0b',
    other: '#6b7280',
  }
  return colors[category] || '#6b7280'
}

// Statistiche per categoria
export const calculateCategoryStats = (events: EventType[]): CategoryStats[] => {
  const categoryMap = new Map<EventType['category'], { minutes: number; count: number }>()

  // Somma minuti e conta eventi per categoria
  events.forEach((event) => {
    const category = event.category || 'other'
    const duration = getEventDuration(event)

    if (!categoryMap.has(category)) {
      categoryMap.set(category, { minutes: 0, count: 0 })
    }

    const current = categoryMap.get(category)!
    current.minutes += duration
    current.count += 1
  })

  // Calcola totale per percentuali
  let totalMinutes = 0
  categoryMap.forEach((value) => {
    totalMinutes += value.minutes
  })

  // Converti in array di CategoryStats
  const stats: CategoryStats[] = []
  categoryMap.forEach((value, category) => {
    stats.push({
      category,
      totalMinutes: Math.round(value.minutes),
      totalHours: Math.round((value.minutes / 60) * 10) / 10,
      eventCount: value.count,
      percentage: totalMinutes > 0 ? Math.round((value.minutes / totalMinutes) * 100) : 0,
      color: getCategoryColor(category),
    })
  })

  // Ordina per tempo decrescente
  return stats.sort((a, b) => b.totalMinutes - a.totalMinutes)
}

// Statistiche giornaliere
export const calculateDailyStats = (events: EventType[], days: number = 7): DayStats[] => {
  const dailyMap = new Map<string, DayStats>()

  // Inizializza gli ultimi N giorni
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    dailyMap.set(dateStr, {
      date: dateStr,
      totalMinutes: 0,
      eventCount: 0,
      categories: {
        meeting: 0,
        deep_work: 0,
        admin: 0,
        personal: 0,
        break: 0,
        other: 0,
      },
    })
  }

  // Popola con dati eventi
  events.forEach((event) => {
    const eventDate = new Date(event.start_time).toISOString().split('T')[0]
    const stats = dailyMap.get(eventDate)

    if (stats) {
      const duration = getEventDuration(event)
      const category = event.category || 'other'

      stats.totalMinutes += duration
      stats.eventCount += 1
      stats.categories[category] += duration
    }
  })

  // Converti in array ordinato
  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// Statistiche settimanali
export const calculateWeekStats = (events: EventType[]): WeekStats => {
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay()) // Domenica

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6) // Sabato

  const weekEvents = events.filter((event) => {
    const eventDate = new Date(event.start_time)
    return eventDate >= weekStart && eventDate <= weekEnd
  })

  const dailyStats = calculateDailyStats(weekEvents, 7)
  const totalMinutes = dailyStats.reduce((sum, day) => sum + day.totalMinutes, 0)
  const eventCount = weekEvents.length

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
    totalMinutes: Math.round(totalMinutes),
    eventCount,
    dailyStats,
  }
}

// Trova l'ora del giorno più produttiva
export const getMostProductiveHour = (events: EventType[]): number => {
  const hourMap = new Map<number, number>()

  events.forEach((event) => {
    const hour = new Date(event.start_time).getHours()
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1)
  })

  let maxHour = 9
  let maxCount = 0

  hourMap.forEach((count, hour) => {
    if (count > maxCount) {
      maxCount = count
      maxHour = hour
    }
  })

  return maxHour
}

// Formatta minuti in stringa leggibile
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}
// Statistiche settimanali aggregate per vista 30 giorni
export const calculateWeeklyStats = (events: EventType[], weeks: number = 4): DayStats[] => {
  const weeklyMap = new Map<string, DayStats>()

  // Inizializza le ultime N settimane
  const today = new Date()
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - (i * 7))
    const weekKey = `Settimana ${weeks - i}`

    weeklyMap.set(weekKey, {
      date: weekKey,
      totalMinutes: 0,
      eventCount: 0,
      categories: {
        meeting: 0,
        deep_work: 0,
        admin: 0,
        personal: 0,
        break: 0,
        other: 0,
      },
    })
  }

  // Popola con dati eventi
  events.forEach((event) => {
    const eventDate = new Date(event.start_time)
    const daysDiff = Math.floor((today.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
    const weekIndex = Math.floor(daysDiff / 7)

    if (weekIndex >= 0 && weekIndex < weeks) {
      const weekKey = `Settimana ${weeks - weekIndex}`
      const stats = weeklyMap.get(weekKey)

      if (stats) {
        const duration = getEventDuration(event)
        const category = event.category || 'other'

        stats.totalMinutes += duration
        stats.eventCount += 1
        stats.categories[category] += duration
      }
    }
  })

  return Array.from(weeklyMap.values())
}