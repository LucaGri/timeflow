import { Event as EventType } from '@/lib/supabase'

export type ConflictType = 'direct_overlap' | 'overload' | 'recovery_needed'
export type ConflictSeverity = 'low' | 'medium' | 'high'

export interface Conflict {
  type: ConflictType
  severity: ConflictSeverity
  description: string
  suggestion: string
  eventIds: string[]
}

// Controlla se due eventi si sovrappongono
const eventsOverlap = (event1: EventType, event2: EventType): boolean => {
  const start1 = new Date(event1.start_time)
  const end1 = new Date(event1.end_time)
  const start2 = new Date(event2.start_time)
  const end2 = new Date(event2.end_time)

  return start1 < end2 && start2 < end1
}

// Calcola la durata di un evento in ore
const getEventDuration = (event: EventType): number => {
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

// Ottieni la data (senza orario) di un evento
const getEventDate = (event: EventType): string => {
  return new Date(event.start_time).toDateString()
}

// Rileva conflitti diretti (sovrapposizioni)
const detectDirectOverlaps = (events: EventType[]): Conflict[] => {
  const conflicts: Conflict[] = []
  
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (eventsOverlap(events[i], events[j])) {
        conflicts.push({
          type: 'direct_overlap',
          severity: 'high',
          description: `"${events[i].title}" si sovrappone con "${events[j].title}"`,
          suggestion: 'Sposta uno dei due eventi o ridimensionali',
          eventIds: [events[i].id, events[j].id],
        })
      }
    }
  }
  
  return conflicts
}

// Rileva giornate sovraccariche
const detectDailyOverload = (events: EventType[]): Conflict[] => {
  const conflicts: Conflict[] = []
  
  // Raggruppa eventi per data
  const eventsByDate = new Map<string, EventType[]>()
  
  events.forEach((event) => {
    const date = getEventDate(event)
    if (!eventsByDate.has(date)) {
      eventsByDate.set(date, [])
    }
    eventsByDate.get(date)!.push(event)
  })
  
  // Controlla ogni giornata
  eventsByDate.forEach((dayEvents, date) => {
    const totalHours = dayEvents.reduce((sum, event) => sum + getEventDuration(event), 0)
    
    if (totalHours > 10) {
      conflicts.push({
        type: 'overload',
        severity: 'high',
        description: `Giornata sovraccarica: ${totalHours.toFixed(1)} ore programmate il ${new Date(date).toLocaleDateString('it-IT')}`,
        suggestion: 'Considera di spostare alcuni eventi ad altri giorni',
        eventIds: dayEvents.map((e) => e.id),
      })
    } else if (totalHours > 8) {
      conflicts.push({
        type: 'overload',
        severity: 'medium',
        description: `Giornata piena: ${totalHours.toFixed(1)} ore programmate il ${new Date(date).toLocaleDateString('it-IT')}`,
        suggestion: 'Pianifica pause tra gli eventi',
        eventIds: dayEvents.map((e) => e.id),
      })
    }
  })
  
  return conflicts
}

// Rileva necessità di recupero (troppi meeting senza pause)
const detectRecoveryNeeded = (events: EventType[]): Conflict[] => {
  const conflicts: Conflict[] = []
  
  // Ordina eventi per data
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )
  
  // Cerca sequenze di eventi senza pause
  for (let i = 0; i < sortedEvents.length - 2; i++) {
    const current = sortedEvents[i]
    const next = sortedEvents[i + 1]
    const afterNext = sortedEvents[i + 2]
    
    // Controlla se sono nello stesso giorno
    if (
      getEventDate(current) === getEventDate(next) &&
      getEventDate(next) === getEventDate(afterNext)
    ) {
      const endCurrent = new Date(current.end_time)
      const startNext = new Date(next.start_time)
      const endNext = new Date(next.end_time)
      const startAfterNext = new Date(afterNext.start_time)
      
      // Pausa tra evento 1 e 2
      const pause1 = (startNext.getTime() - endCurrent.getTime()) / (1000 * 60)
      // Pausa tra evento 2 e 3
      const pause2 = (startAfterNext.getTime() - endNext.getTime()) / (1000 * 60)
      
      // Se entrambe le pause sono < 15 minuti
      if (pause1 < 15 && pause2 < 15) {
        // E se almeno 2 sono meeting
        const meetingCount = [current, next, afterNext].filter(
          (e) => e.category === 'meeting'
        ).length
        
        if (meetingCount >= 2) {
          conflicts.push({
            type: 'recovery_needed',
            severity: 'medium',
            description: `3 eventi consecutivi senza pause adeguate`,
            suggestion: 'Aggiungi una pausa di 15-30 minuti per recuperare energia',
            eventIds: [current.id, next.id, afterNext.id],
          })
        }
      }
    }
  }
  
  return conflicts
}

// Funzione principale per rilevare tutti i conflitti
export const detectAllConflicts = (events: EventType[]): Conflict[] => {
  const conflicts: Conflict[] = []
  
  // Rileva tutti i tipi di conflitti
  conflicts.push(...detectDirectOverlaps(events))
  conflicts.push(...detectDailyOverload(events))
  conflicts.push(...detectRecoveryNeeded(events))
  
  return conflicts
}

// Conta conflitti per severità
export const getConflictCounts = (conflicts: Conflict[]) => {
  return {
    high: conflicts.filter((c) => c.severity === 'high').length,
    medium: conflicts.filter((c) => c.severity === 'medium').length,
    low: conflicts.filter((c) => c.severity === 'low').length,
    total: conflicts.length,
  }
}