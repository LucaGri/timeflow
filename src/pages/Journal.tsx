import { useState, useEffect } from 'react'
import { supabase, JournalEntry } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import JournalEntryCard from '@/components/journal/JournalEntryCard'
import JournalEntryModal from '@/components/journal/JournalEntryModal'
import { Plus, Search, Calendar, Loader2 } from 'lucide-react'

export default function Diario() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMood, setFilterMood] = useState<string>('all')

  useEffect(() => {
    loadEntries()
  }, [])

  useEffect(() => {
    filterEntries()
  }, [entries, searchQuery, filterMood])

  const loadEntries = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })

    if (error) {
      console.error('Error loading entries:', error)
      setLoading(false)
      return
    }

    setEntries(data || [])
    setLoading(false)
  }

  const filterEntries = () => {
    let filtered = [...entries]

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(entry => 
        entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Filter by mood
    if (filterMood !== 'all') {
      filtered = filtered.filter(entry => entry.mood === filterMood)
    }

    setFilteredEntries(filtered)
  }

  const handleNewEntry = () => {
    setSelectedEntry(null)
    setIsModalOpen(true)
  }

  const handleEditEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry)
    setIsModalOpen(true)
  }

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting entry:', error)
      alert('Errore durante l\'eliminazione')
      return
    }

    await loadEntries()
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEntry(null)
  }

  const handleSaveEntry = async () => {
    await loadEntries()
    handleCloseModal()
  }

  const groupEntriesByMonth = (entries: JournalEntry[]) => {
    const groups: { [key: string]: JournalEntry[] } = {}

    entries.forEach(entry => {
      const date = new Date(entry.entry_date)
      const monthKey = date.toLocaleDateString('it-IT', { year: 'numeric', month: 'long' })
      
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(entry)
    })

    return groups
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const groupedEntries = groupEntriesByMonth(filteredEntries)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Diario</h1>
          <p className="mt-2 text-muted-foreground">
            Scrivi le tue riflessioni e tieni traccia della tua giornata
          </p>
        </div>
        <Button onClick={handleNewEntry}>
          <Plus className="mr-2 h-4 w-4" />
          Nuova Nota
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca nelle note..."
              className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Mood Filter */}
        <div className="sm:w-48">
          <select
            value={filterMood}
            onChange={(e) => setFilterMood(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Tutti gli stati</option>
            <option value="great">😄 Fantastico</option>
            <option value="good">🙂 Bene</option>
            <option value="neutral">😐 Neutrale</option>
            <option value="bad">😟 Male</option>
            <option value="terrible">😢 Pessimo</option>
          </select>
        </div>
      </div>

      {/* Entries */}
      {filteredEntries.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {entries.length === 0 ? 'Nessuna nota ancora' : 'Nessun risultato'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {entries.length === 0 
              ? 'Inizia a scrivere le tue riflessioni quotidiane'
              : 'Prova con filtri diversi'}
          </p>
          {entries.length === 0 && (
            <Button onClick={handleNewEntry}>
              <Plus className="mr-2 h-4 w-4" />
              Crea Prima Nota
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEntries).map(([month, monthEntries]) => (
            <div key={month}>
              <h2 className="text-xl font-semibold mb-4 capitalize">{month}</h2>
              <div className="space-y-4">
                {monthEntries.map((entry) => (
                  <JournalEntryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={handleEditEntry}
                    onDelete={handleDeleteEntry}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <JournalEntryModal
          entry={selectedEntry}
          onClose={handleCloseModal}
          onSave={handleSaveEntry}
        />
      )}
    </div>
  )
}
