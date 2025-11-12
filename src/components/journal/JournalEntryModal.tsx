import { useState, useEffect } from 'react'
import { supabase, JournalEntry } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { X } from 'lucide-react'

interface JournalEntryModalProps {
  entry: JournalEntry | null
  onClose: () => void
  onSave: () => void
}

const moodOptions = [
  { value: 'great', label: '😄 Fantastico', emoji: '😄' },
  { value: 'good', label: '🙂 Bene', emoji: '🙂' },
  { value: 'neutral', label: '😐 Neutrale', emoji: '😐' },
  { value: 'bad', label: '😟 Male', emoji: '😟' },
  { value: 'terrible', label: '😢 Pessimo', emoji: '😢' },
] as const

export default function JournalEntryModal({ entry, onClose, onSave }: JournalEntryModalProps) {
  const [entryDate, setEntryDate] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<'great' | 'good' | 'neutral' | 'bad' | 'terrible' | null>(null)
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (entry) {
      setEntryDate(entry.entry_date)
      setTitle(entry.title || '')
      setContent(entry.content || '')
      setMood(entry.mood)
      setTags(entry.tags?.join(', ') || '')
    } else {
      // New entry - set today's date
      const today = new Date().toISOString().split('T')[0]
      setEntryDate(today)
    }
  }, [entry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!content.trim()) {
      setError('Il contenuto è obbligatorio')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Utente non autenticato')
      setLoading(false)
      return
    }

    const entryData = {
      user_id: user.id,
      entry_date: entryDate,
      title: title.trim() || null,
      content: content.trim(),
      mood: mood,
      tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
    }

    let result

    if (entry?.id) {
      // Update existing entry
      result = await supabase
        .from('journal_entries')
        .update(entryData)
        .eq('id', entry.id)
    } else {
      // Create new entry
      result = await supabase
        .from('journal_entries')
        .insert([entryData])
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="w-full h-full md:h-auto md:max-w-2xl md:rounded-lg bg-card shadow-lg flex flex-col md:max-h-[90vh]">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-card border-b px-4 sm:px-6 py-4 flex items-center justify-between md:rounded-t-lg">
          <h2 className="text-xl sm:text-2xl font-bold">
            {entry?.id ? 'Modifica Nota' : 'Nuova Nota'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-accent min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Data
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Titolo (opzionale)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Es: Una giornata produttiva"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Come ti sei sentito oggi?
            </label>
            <div className="grid grid-cols-5 gap-2">
              {moodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMood(option.value)}
                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all min-h-[60px] flex flex-col items-center justify-center ${
                    mood === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-input hover:border-primary/50'
                  }`}
                >
                  <div className="text-xl sm:text-2xl mb-1">{option.emoji}</div>
                  <div className="text-[10px] sm:text-xs font-medium text-center">{option.label.split(' ')[1]}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Contenuto *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Scrivi i tuoi pensieri, riflessioni, o cosa è successo oggi..."
              rows={8}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {content.length} caratteri
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Tag (opzionale)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="lavoro, personale, riflessione (separati da virgola)"
            />
          </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1 min-h-[44px]">
                {loading ? 'Salvataggio...' : 'Salva'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="min-h-[44px]">
                Annulla
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}