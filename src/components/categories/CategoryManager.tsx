import { useState, useEffect } from 'react'
import { supabase, type UserCategory } from '@/lib/supabase'
import { PRESET_COLORS, validateHexColor } from '@/lib/utils'
import { Trash2, GripVertical, Plus, Check, X } from 'lucide-react'
import { DeleteCategoryModal } from './DeleteCategoryModal'

interface CategoryManagerProps {
  userId: string
  onUpdate?: () => void
}

export function CategoryManager({ userId, onUpdate }: CategoryManagerProps) {
  const [categories, setCategories] = useState<UserCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingColor, setEditingColor] = useState('')
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null)
  const [customHex, setCustomHex] = useState('')
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3b82f6' })
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<UserCategory | null>(null)
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({})
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  useEffect(() => {
    loadCategories()
  }, [userId])

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('user_categories')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true })

      if (categoriesError) {
        console.error('Supabase error loading categories:', categoriesError)
        throw new Error(`Errore nel caricamento delle categorie: ${categoriesError.message}. Verifica che la migrazione del database sia stata eseguita.`)
      }

      setCategories(categoriesData || [])

      // Load event counts for each category
      const counts: Record<string, number> = {}
      for (const category of categoriesData || []) {
        const { count, error: countError } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id)

        if (!countError) {
          counts[category.id] = count || 0
        }
      }
      setEventCounts(counts)
    } catch (err: any) {
      console.error('Error loading categories:', err)
      setError(err.message || 'Errore nel caricamento delle categorie. Verifica che la migrazione del database sia stata eseguita.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartEdit = (category: UserCategory) => {
    setEditingId(category.id)
    setEditingName(category.name)
    setEditingColor(category.color)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setEditingColor('')
    setShowColorPicker(null)
    setCustomHex('')
  }

  const handleSaveEdit = async (categoryId: string) => {
    try {
      // Validate name
      if (!editingName.trim()) {
        setError('Il nome della categoria è obbligatorio')
        return
      }

      if (editingName.length > 50) {
        setError('Il nome della categoria non può superare i 50 caratteri')
        return
      }

      // Check for duplicate names
      const duplicate = categories.find(
        (c) => c.id !== categoryId && c.name.toLowerCase() === editingName.trim().toLowerCase()
      )
      if (duplicate) {
        setError('Esiste già una categoria con questo nome')
        return
      }

      // Validate color
      if (!validateHexColor(editingColor)) {
        setError('Colore non valido. Usa il formato #RRGGBB')
        return
      }

      setSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('user_categories')
        .update({
          name: editingName.trim(),
          color: editingColor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', categoryId)

      if (updateError) throw updateError

      // Update local state
      setCategories(
        categories.map((c) =>
          c.id === categoryId
            ? { ...c, name: editingName.trim(), color: editingColor }
            : c
        )
      )

      handleCancelEdit()
      onUpdate?.()
    } catch (err) {
      console.error('Error updating category:', err)
      setError('Errore nel salvataggio della categoria')
    } finally {
      setSaving(false)
    }
  }

  const handleColorSelect = (color: string) => {
    setEditingColor(color)
    setShowColorPicker(null)
    setCustomHex('')
  }

  const handleCustomHexApply = () => {
    if (validateHexColor(customHex)) {
      setEditingColor(customHex)
      setShowColorPicker(null)
      setCustomHex('')
    } else {
      setError('Colore HEX non valido')
    }
  }

  const handleAddNew = async () => {
    try {
      // Validate
      if (!newCategory.name.trim()) {
        setError('Il nome della categoria è obbligatorio')
        return
      }

      if (newCategory.name.length > 50) {
        setError('Il nome della categoria non può superare i 50 caratteri')
        return
      }

      // Check for duplicates
      const duplicate = categories.find(
        (c) => c.name.toLowerCase() === newCategory.name.trim().toLowerCase()
      )
      if (duplicate) {
        setError('Esiste già una categoria con questo nome')
        return
      }

      // Check max categories
      if (categories.length >= 12) {
        setError('Hai raggiunto il limite massimo di 12 categorie')
        return
      }

      if (!validateHexColor(newCategory.color)) {
        setError('Colore non valido')
        return
      }

      setSaving(true)
      setError(null)

      const { data, error: insertError } = await supabase
        .from('user_categories')
        .insert({
          user_id: userId,
          name: newCategory.name.trim(),
          color: newCategory.color,
          icon: null,
          is_default: false,
          display_order: categories.length + 1,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setCategories([...categories, data])
      setIsAddingNew(false)
      setNewCategory({ name: '', color: '#3b82f6' })
      onUpdate?.()
    } catch (err) {
      console.error('Error adding category:', err)
      setError('Errore nell\'aggiunta della categoria')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (category: UserCategory) => {
    setCategoryToDelete(category)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirmed = async (categoryId: string, reassignToCategoryId?: string) => {
    try {
      setSaving(true)
      setError(null)

      // If there are events, reassign them
      if (reassignToCategoryId) {
        const { error: reassignError } = await supabase
          .from('events')
          .update({ category_id: reassignToCategoryId, updated_at: new Date().toISOString() })
          .eq('category_id', categoryId)

        if (reassignError) throw reassignError
      }

      // Delete the category
      const { error: deleteError } = await supabase
        .from('user_categories')
        .delete()
        .eq('id', categoryId)

      if (deleteError) throw deleteError

      // Update local state
      setCategories(categories.filter((c) => c.id !== categoryId))

      // Update event counts if reassigned
      if (reassignToCategoryId) {
        const reassignedCount = eventCounts[categoryId] || 0
        setEventCounts({
          ...eventCounts,
          [reassignToCategoryId]: (eventCounts[reassignToCategoryId] || 0) + reassignedCount,
          [categoryId]: 0,
        })
      }

      setDeleteModalOpen(false)
      setCategoryToDelete(null)
      onUpdate?.()
    } catch (err) {
      console.error('Error deleting category:', err)
      setError('Errore nell\'eliminazione della categoria')
    } finally {
      setSaving(false)
    }
  }

  const handleDragStart = (categoryId: string) => {
    setDraggedItem(categoryId)
  }

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === categoryId) return

    const draggedIndex = categories.findIndex((c) => c.id === draggedItem)
    const targetIndex = categories.findIndex((c) => c.id === categoryId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newCategories = [...categories]
    const [draggedCategory] = newCategories.splice(draggedIndex, 1)
    newCategories.splice(targetIndex, 0, draggedCategory)

    // Update display_order
    const updatedCategories = newCategories.map((c, index) => ({
      ...c,
      display_order: index + 1,
    }))

    setCategories(updatedCategories)
  }

  const handleDragEnd = async () => {
    if (!draggedItem) return

    try {
      // Save new order to database
      const updates = categories.map((c, index) =>
        supabase
          .from('user_categories')
          .update({ display_order: index + 1 })
          .eq('id', c.id)
      )

      await Promise.all(updates)
      onUpdate?.()
    } catch (err) {
      console.error('Error updating order:', err)
      setError('Errore nell\'aggiornamento dell\'ordine')
      // Reload categories to reset order
      loadCategories()
    } finally {
      setDraggedItem(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="text-sm text-gray-500">Caricamento categorie...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Categorie Eventi</h3>
          <p className="text-sm text-gray-500">
            Personalizza nomi, colori e icone delle tue categorie
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {categories.length}/12 categorie
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button
            onClick={loadCategories}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Riprova
          </button>
        </div>
      )}

      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            draggable
            onDragStart={() => handleDragStart(category.id)}
            onDragOver={(e) => handleDragOver(e, category.id)}
            onDragEnd={handleDragEnd}
            className={`
              flex items-center gap-3 p-3 bg-white border rounded-lg
              ${draggedItem === category.id ? 'opacity-50' : ''}
              hover:border-gray-300 transition-colors
            `}
          >
            {/* Drag handle */}
            <button
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </button>

            {/* Color indicator */}
            <div
              className="w-6 h-6 rounded-full border-2 border-gray-200 flex-shrink-0"
              style={{ backgroundColor: editingId === category.id ? editingColor : category.color }}
            />

            {/* Name input */}
            {editingId === category.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
                autoFocus
              />
            ) : (
              <button
                onClick={() => handleStartEdit(category)}
                className="flex-1 text-left font-medium text-gray-900 hover:text-blue-600"
              >
                {category.name}
              </button>
            )}

            {/* Event count */}
            <span className="text-sm text-gray-500 flex-shrink-0">
              {eventCounts[category.id] || 0} eventi
            </span>

            {/* Color picker button */}
            {editingId === category.id ? (
              <div className="relative">
                <button
                  onClick={() =>
                    setShowColorPicker(showColorPicker === category.id ? null : category.id)
                  }
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  Colore
                </button>

                {showColorPicker === category.id && (
                  <div className="absolute right-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-64">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          Colori Predefiniti
                        </p>
                        <div className="grid grid-cols-6 gap-2">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color.value}
                              onClick={() => handleColorSelect(color.value)}
                              className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-colors"
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          O inserisci HEX
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customHex}
                            onChange={(e) => setCustomHex(e.target.value)}
                            placeholder="#FF5733"
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                            maxLength={7}
                          />
                          <button
                            onClick={handleCustomHexApply}
                            disabled={!validateHexColor(customHex)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {editingId === category.id ? (
                <>
                  <button
                    onClick={() => handleSaveEdit(category.id)}
                    disabled={saving}
                    className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleDelete(category)}
                  disabled={category.is_default || saving}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title={category.is_default ? 'Le categorie predefinite non possono essere eliminate' : 'Elimina categoria'}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add new category */}
        {isAddingNew ? (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-4 h-4" /> {/* Spacer for drag handle */}
            <div
              className="w-6 h-6 rounded-full border-2 border-gray-200 flex-shrink-0"
              style={{ backgroundColor: newCategory.color }}
            />
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome categoria"
              maxLength={50}
              autoFocus
            />
            <div className="relative">
              <button
                onClick={() => setShowColorPicker('new')}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Colore
              </button>

              {showColorPicker === 'new' && (
                <div className="absolute right-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-64">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        Colori Predefiniti
                      </p>
                      <div className="grid grid-cols-6 gap-2">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => {
                              setNewCategory({ ...newCategory, color: color.value })
                              setShowColorPicker(null)
                            }}
                            className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-colors"
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleAddNew}
              disabled={saving || !newCategory.name.trim()}
              className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsAddingNew(false)
                setNewCategory({ name: '', color: '#3b82f6' })
                setShowColorPicker(null)
              }}
              disabled={saving}
              className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingNew(true)}
            disabled={categories.length >= 12 || saving}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Aggiungi Categoria
            {categories.length >= 12 && ' (limite raggiunto)'}
          </button>
        )}
      </div>

      {/* Delete confirmation modal */}
      {categoryToDelete && (
        <DeleteCategoryModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false)
            setCategoryToDelete(null)
          }}
          category={categoryToDelete}
          categories={categories.filter((c) => c.id !== categoryToDelete.id)}
          eventCount={eventCounts[categoryToDelete.id] || 0}
          onConfirm={handleDeleteConfirmed}
        />
      )}
    </div>
  )
}
