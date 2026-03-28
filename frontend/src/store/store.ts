// src/store/store.ts
import { create } from 'zustand'
import { DailyEntry, DailyAnalytics, WeeklyAnalytics, Ambiguity } from '../types'

interface VoiceTraceStore {
  // Data
  entries: DailyEntry[]
  currentEntry: DailyEntry | null
  dailyAnalytics: DailyAnalytics | null
  weeklyAnalytics: WeeklyAnalytics | null
  pendingAmbiguities: Ambiguity[]

  // UI State
  currentView: 'record' | 'dashboard' | 'ledger' | 'analytics'
  isRecording: boolean
  isProcessing: boolean
  showConfirmation: boolean
  selectedEntryId: string | null
  audioBlob: Blob | null

  // Actions
  setCurrentView: (view: 'record' | 'dashboard' | 'ledger' | 'analytics') => void
  setIsRecording: (recording: boolean) => void
  setIsProcessing: (processing: boolean) => void
  setShowConfirmation: (show: boolean) => void
  setAudioBlob: (blob: Blob | null) => void
  setCurrentEntry: (entry: DailyEntry) => void
  addEntry: (entry: DailyEntry) => void
  updateEntry: (id: string, updates: Partial<DailyEntry>) => void
  resolvAmbiguity: (ambiguityId: string, resolution: any) => void
  setEntries: (entries: DailyEntry[]) => void
  setDailyAnalytics: (analytics: DailyAnalytics) => void
  setWeeklyAnalytics: (analytics: WeeklyAnalytics) => void
  setPendingAmbiguities: (ambiguities: Ambiguity[]) => void
}

export const useVoiceTraceStore = create<VoiceTraceStore>((set: any) => ({
  entries: [],
  currentEntry: null,
  dailyAnalytics: null,
  weeklyAnalytics: null,
  pendingAmbiguities: [],
  currentView: 'record',
  isRecording: false,
  isProcessing: false,
  showConfirmation: false,
  selectedEntryId: null,
  audioBlob: null,

  setCurrentView: (view: 'record' | 'dashboard' | 'ledger' | 'analytics') => set({ currentView: view }),
  setIsRecording: (recording: boolean) => set({ isRecording: recording }),
  setIsProcessing: (processing: boolean) => set({ isProcessing: processing }),
  setShowConfirmation: (show: boolean) => set({ showConfirmation: show }),
  setAudioBlob: (blob: Blob | null) => set({ audioBlob: blob }),
  setCurrentEntry: (entry: DailyEntry) => set({ currentEntry: entry }),

  addEntry: (entry: DailyEntry) =>
    set((state: VoiceTraceStore) => ({
      entries: [entry, ...state.entries],
      currentEntry: entry,
    })),

  updateEntry: (id: string, updates: Partial<DailyEntry>) =>
    set((state: VoiceTraceStore) => ({
      entries: state.entries.map((e: DailyEntry) =>
        e.id === id ? { ...e, ...updates } : e
      ),
      currentEntry:
        state.currentEntry?.id === id
          ? { ...state.currentEntry, ...updates }
          : state.currentEntry,
    })),

  resolvAmbiguity: (ambiguityId: string, resolution: any) =>
    set((state: VoiceTraceStore) => ({
      currentEntry: state.currentEntry
        ? {
            ...state.currentEntry,
            ambiguities: state.currentEntry.ambiguities.map((a: Ambiguity) =>
              a.id === ambiguityId
                ? { ...a, resolved: true, currentValue: resolution }
                : a
            ),
          }
        : null,
      pendingAmbiguities: state.pendingAmbiguities.filter(
        (a: Ambiguity) => a.id !== ambiguityId
      ),
    })),

  setEntries: (entries: DailyEntry[]) => set({ entries }),
  setDailyAnalytics: (analytics: DailyAnalytics) => set({ dailyAnalytics: analytics }),
  setWeeklyAnalytics: (analytics: WeeklyAnalytics) => set({ weeklyAnalytics: analytics }),
  setPendingAmbiguities: (ambiguities: Ambiguity[]) =>
    set({ pendingAmbiguities: ambiguities }),
}))
