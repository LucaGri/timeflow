import { JournalEntry } from '@/lib/supabase'
import { Calendar, Tag, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface JournalEntryCardProps {
  entry: JournalEntry
  onEdit: (entry: JournalEntry) => void
  onDelete: (id: string) => void
}

const moodEmojis = {
  great: '😄',
  good: '🙂',
  neutral: '😐',
  bad: '😟',
  terrible: '😢',
}

const moodLabels = {
  great: 'Fantastico',
  good: 'Bene',
  neutral: 'Neutrale',
  bad: 'Male',
  terrible: 'Pessimo',
}

const moodColors = {
  great: 'bg-green-100 text-green-800 border-green-200',
  good: 'bg-blue-100 text-blue-800 border-blue-200',
  neutral: 'bg-gray-100 text-gray-800 border-gray-200',
  bad: 'bg-orange-100 text-orange-800 border-orange-200',
  terrible: 'bg-red-100 text-red-800 border-red-200',
}

export default function JournalEntryCard({ entry, onEdit, onDelete }: JournalEntryCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const handleDelete = () => {
    if (confirm('Sei sicuro di voler eliminare questa nota?')) {
      onDelete(entry.id)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground capitalize">
              {formatDate(entry.entry_date)}
            </span>
          </div>
          {entry.title && (
            <h3 className="text-lg font-semibold">{entry.title}</h3>
          )}
        </div>

        {/* Mood Badge */}
        {entry.mood && (
          <div className={`px-3 py-1 rounded-full border text-sm font-medium flex items-center gap-2 ${moodColors[entry.mood]}`}>
            <span>{moodEmojis[entry.mood]}</span>
            <span>{moodLabels[entry.mood]}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-foreground whitespace-pre-wrap">{entry.content}</p>
      </div>

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 rounded-md bg-muted text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(entry)}
        >
          <Edit2 className="h-3 w-3 mr-1" />
          Modifica
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Elimina
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {new Date(entry.created_at).toLocaleDateString('it-IT')}
        </span>
      </div>
    </div>
  )
}