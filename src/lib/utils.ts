import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting utilities
export function formatDate(date: Date | string, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    case 'long':
      return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    case 'time':
      return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    default:
      return d.toLocaleDateString('it-IT')
  }
}

// Calculate duration between two dates
export function calculateDuration(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? new Date(start) : start
  const endDate = typeof end === 'string' ? new Date(end) : end
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60) // hours
}

// Format duration in hours to human readable
export function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`
  }
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// Check if trial is expired
export function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false
  return new Date(trialEndsAt) < new Date()
}

// Get category color
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    meeting: '#3b82f6', // blue
    deep_work: '#8b5cf6', // purple
    admin: '#ef4444', // red
    personal: '#10b981', // green
    break: '#f59e0b', // amber
    other: '#6b7280', // gray
  }
  return colors[category] || colors.other
}

// Get mood emoji
export function getMoodEmoji(mood: string | null): string {
  const emojis: Record<string, string> = {
    great: '😄',
    good: '🙂',
    neutral: '😐',
    bad: '😞',
    terrible: '😢',
  }
  return mood ? emojis[mood] || '😐' : '😐'
}
