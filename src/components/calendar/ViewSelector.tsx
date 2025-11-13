import { useState, useRef, useEffect } from 'react'
import { View } from 'react-big-calendar'
import { ChevronDown } from 'lucide-react'

interface ViewSelectorProps {
  currentView: View
  onViewChange: (view: View) => void
}

const VIEW_LABELS: Record<View, string> = {
  month: 'Mese',
  week: 'Settimana',
  day: 'Giorno',
  agenda: 'Agenda',
  work_week: 'Settimana lavorativa',
}

export function ViewSelector({ currentView, onViewChange }: ViewSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const views: View[] = ['month', 'week', 'day', 'agenda']

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (view: View) => {
    onViewChange(view)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between gap-2 h-10 px-3 py-2 text-sm font-medium rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[120px]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{VIEW_LABELS[currentView]}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[160px] rounded-lg border border-input bg-popover shadow-lg z-50 py-1">
          {views.map((view) => (
            <button
              key={view}
              onClick={() => handleSelect(view)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                currentView === view ? 'bg-accent text-accent-foreground font-medium' : ''
              }`}
              role="option"
              aria-selected={currentView === view}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
