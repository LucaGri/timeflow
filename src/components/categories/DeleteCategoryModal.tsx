import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import type { UserCategory } from '@/lib/supabase'

interface DeleteCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  category: UserCategory
  categories: UserCategory[]
  eventCount: number
  onConfirm: (categoryId: string, reassignToCategoryId?: string) => Promise<void>
}

export function DeleteCategoryModal({
  isOpen,
  onClose,
  category,
  categories,
  eventCount,
  onConfirm,
}: DeleteCategoryModalProps) {
  const [reassignToCategoryId, setReassignToCategoryId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (eventCount > 0 && !reassignToCategoryId) {
      return
    }

    setLoading(true)
    try {
      await onConfirm(category.id, reassignToCategoryId || undefined)
      onClose()
    } catch (error) {
      console.error('Error deleting category:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: category.color + '20' }}
            >
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Elimina Categoria</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div
              className="w-6 h-6 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color }}
            />
            <span className="font-semibold text-gray-900">{category.name}</span>
          </div>

          {eventCount > 0 ? (
            <>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{eventCount}</span>{' '}
                  {eventCount === 1 ? 'evento usa' : 'eventi usano'} questa categoria.
                </p>
                <p className="text-sm text-gray-600">
                  Per eliminare la categoria, seleziona dove spostare gli eventi:
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sposta eventi in:
                </label>
                <select
                  value={reassignToCategoryId}
                  onChange={(e) => setReassignToCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">-- Seleziona una categoria --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Attenzione:</strong> Tutti gli eventi di questa categoria saranno
                  spostati nella categoria selezionata. Questa azione non può essere annullata.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                Questa categoria non contiene eventi e può essere eliminata direttamente.
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Attenzione:</strong> Questa azione non può essere annullata.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || (eventCount > 0 && !reassignToCategoryId)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Eliminazione...' : 'Conferma Eliminazione'}
          </button>
        </div>
      </div>
    </div>
  )
}
