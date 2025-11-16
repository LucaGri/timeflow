import { supabase } from '@/lib/supabase'
import { bidirectionalGoogleSync, GoogleSyncResult } from './googleSync'
import { bidirectionalMicrosoftSync, MicrosoftSyncResult } from './microsoftSync'

/**
 * Combined sync result for all providers
 */
export interface SyncManagerResult {
  google?: {
    toTimeFlow: GoogleSyncResult
    toGoogle: GoogleSyncResult
    success: boolean
  }
  microsoft?: {
    toTimeFlow: MicrosoftSyncResult
    toMicrosoft: MicrosoftSyncResult
    success: boolean
  }
  overallSuccess: boolean
  timestamp: string
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  syncGoogle?: boolean
  syncMicrosoft?: boolean
  parallel?: boolean // Run syncs in parallel vs sequential
}

/**
 * Global sync manager
 * Handles synchronization for all connected calendar providers
 */
export class SyncManager {
  private static instance: SyncManager
  private isSyncing: boolean = false
  private lastSyncTime: Date | null = null
  private syncInterval: NodeJS.Timeout | null = null
  private syncListeners: Array<(result: SyncManagerResult) => void> = []

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager()
    }
    return SyncManager.instance
  }

  /**
   * Check if a sync is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing
  }

  /**
   * Get timestamp of last sync
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime
  }

  /**
   * Register a listener for sync completion
   */
  onSyncComplete(callback: (result: SyncManagerResult) => void): () => void {
    this.syncListeners.push(callback)
    // Return unsubscribe function
    return () => {
      this.syncListeners = this.syncListeners.filter((cb) => cb !== callback)
    }
  }

  /**
   * Notify all listeners of sync completion
   */
  private notifyListeners(result: SyncManagerResult): void {
    this.syncListeners.forEach((callback) => callback(result))
  }

  /**
   * Sync all connected calendar providers
   */
  async syncAll(config?: SyncConfig): Promise<SyncManagerResult> {
    // Prevent concurrent syncs
    if (this.isSyncing) {
      console.log('⏭️ Sync already running, skipping')
      // Return a default result indicating sync was skipped
      return {
        overallSuccess: true,
        timestamp: new Date().toISOString(),
      }
    }

    console.log('🔄 Starting sync...')
    this.isSyncing = true

    const result: SyncManagerResult = {
      overallSuccess: true,
      timestamp: new Date().toISOString(),
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Check connected providers
      const { data: googleProvider } = await supabase
        .from('calendar_providers')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .maybeSingle()

      const { data: microsoftProvider } = await supabase
        .from('calendar_providers')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'microsoft')
        .eq('is_active', true)
        .maybeSingle()

      const shouldSyncGoogle = config?.syncGoogle ?? !!googleProvider
      const shouldSyncMicrosoft = config?.syncMicrosoft ?? !!microsoftProvider
      const runInParallel = config?.parallel ?? false

      if (runInParallel && (shouldSyncGoogle || shouldSyncMicrosoft)) {
        // Run syncs in parallel for better performance
        const syncPromises: Promise<void>[] = []

        if (shouldSyncGoogle) {
          syncPromises.push(
            bidirectionalGoogleSync(user.id)
              .then((googleResult) => {
                result.google = {
                  ...googleResult,
                  success: googleResult.toTimeFlow.errors.length === 0 &&
                           googleResult.toGoogle.errors.length === 0,
                }
              })
              .catch((error) => {
                result.google = {
                  toTimeFlow: {
                    direction: 'toTimeFlow',
                    created: 0,
                    updated: 0,
                    deleted: 0,
                    errors: [error.message],
                    timestamp: new Date().toISOString(),
                  },
                  toGoogle: {
                    direction: 'toGoogle',
                    created: 0,
                    updated: 0,
                    deleted: 0,
                    errors: [],
                    timestamp: new Date().toISOString(),
                  },
                  success: false,
                }
                result.overallSuccess = false
              })
          )
        }

        if (shouldSyncMicrosoft && microsoftProvider) {
          syncPromises.push(
            bidirectionalMicrosoftSync(microsoftProvider)
              .then((microsoftResult) => {
                result.microsoft = {
                  ...microsoftResult,
                  success: microsoftResult.toTimeFlow.errors.length === 0 &&
                           microsoftResult.toMicrosoft.errors.length === 0,
                }
              })
              .catch((error) => {
                result.microsoft = {
                  toTimeFlow: {
                    direction: 'toTimeFlow',
                    created: 0,
                    updated: 0,
                    deleted: 0,
                    errors: [error.message],
                    timestamp: new Date().toISOString(),
                  },
                  toMicrosoft: {
                    direction: 'toMicrosoft',
                    created: 0,
                    updated: 0,
                    deleted: 0,
                    errors: [],
                    timestamp: new Date().toISOString(),
                  },
                  success: false,
                }
                result.overallSuccess = false
              })
          )
        }

        await Promise.all(syncPromises)
      } else {
        // Run syncs sequentially (safer, prevents conflicts)
        if (shouldSyncGoogle) {
          try {
            const googleResult = await bidirectionalGoogleSync(user.id)
            result.google = {
              ...googleResult,
              success: googleResult.toTimeFlow.errors.length === 0 &&
                       googleResult.toGoogle.errors.length === 0,
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            result.google = {
              toTimeFlow: {
                direction: 'toTimeFlow',
                created: 0,
                updated: 0,
                deleted: 0,
                errors: [errorMsg],
                timestamp: new Date().toISOString(),
              },
              toGoogle: {
                direction: 'toGoogle',
                created: 0,
                updated: 0,
                deleted: 0,
                errors: [],
                timestamp: new Date().toISOString(),
              },
              success: false,
            }
            result.overallSuccess = false
          }
        }

        if (shouldSyncMicrosoft && microsoftProvider) {
          try {
            const microsoftResult = await bidirectionalMicrosoftSync(microsoftProvider)
            result.microsoft = {
              ...microsoftResult,
              success: microsoftResult.toTimeFlow.errors.length === 0 &&
                       microsoftResult.toMicrosoft.errors.length === 0,
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            result.microsoft = {
              toTimeFlow: {
                direction: 'toTimeFlow',
                created: 0,
                updated: 0,
                deleted: 0,
                errors: [errorMsg],
                timestamp: new Date().toISOString(),
              },
              toMicrosoft: {
                direction: 'toMicrosoft',
                created: 0,
                updated: 0,
                deleted: 0,
                errors: [],
                timestamp: new Date().toISOString(),
              },
              success: false,
            }
            result.overallSuccess = false
          }
        }
      }

      // Update last sync time
      this.lastSyncTime = new Date()

      // Notify listeners
      this.notifyListeners(result)

      console.log('✅ Sync completed')

    } catch (error) {
      console.error('❌ Sync failed:', error)
      result.overallSuccess = false
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'

      // Add error to all attempted syncs
      if (!result.google && !result.microsoft) {
        result.google = {
          toTimeFlow: {
            direction: 'toTimeFlow',
            created: 0,
            updated: 0,
            deleted: 0,
            errors: [errorMsg],
            timestamp: new Date().toISOString(),
          },
          toGoogle: {
            direction: 'toGoogle',
            created: 0,
            updated: 0,
            deleted: 0,
            errors: [],
            timestamp: new Date().toISOString(),
          },
          success: false,
        }
      }
    } finally {
      this.isSyncing = false
    }

    return result
  }

  /**
   * Start automatic background sync
   * @param intervalMinutes - Interval between syncs in minutes (default: 5)
   */
  startAutoSync(intervalMinutes: number = 5): void {
    // Clear existing interval if any
    this.stopAutoSync()

    // Start new interval
    const intervalMs = intervalMinutes * 60 * 1000
    this.syncInterval = setInterval(() => {
      this.syncAll({ parallel: false }).catch((error) => {
        console.error('Auto-sync failed:', error)
      })
    }, intervalMs)

    // Run initial sync
    this.syncAll({ parallel: false }).catch((error) => {
      console.error('Initial sync failed:', error)
    })
  }

  /**
   * Stop automatic background sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  /**
   * Trigger sync after event modification
   * This is a lightweight sync that only pushes changes
   */
  async syncAfterEventChange(eventId: string): Promise<void> {
    if (this.isSyncing) {
      // Skip if sync is already in progress
      return
    }

    try {
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (!event) return

      // Mark event as needing sync
      await supabase
        .from('events')
        .update({
          synced_to_google: false,
          synced_to_microsoft: false,
        })
        .eq('id', eventId)

      // Trigger lightweight sync (only push, don't pull)
      // This prevents the full sync from blocking the UI
      setTimeout(() => {
        this.syncAll({ parallel: true }).catch((error) => {
          console.error('Post-change sync failed:', error)
        })
      }, 1000) // Debounce by 1 second

    } catch (error) {
      console.error('Failed to mark event for sync:', error)
    }
  }
}

/**
 * Get global sync manager instance
 */
export const syncManager = SyncManager.getInstance()

/**
 * Export helper functions
 */

export async function syncAllCalendars(config?: SyncConfig): Promise<SyncManagerResult> {
  return syncManager.syncAll(config)
}

export function startAutoSync(intervalMinutes: number = 5): void {
  syncManager.startAutoSync(intervalMinutes)
}

export function stopAutoSync(): void {
  syncManager.stopAutoSync()
}

export async function syncAfterEventChange(eventId: string): Promise<void> {
  return syncManager.syncAfterEventChange(eventId)
}
