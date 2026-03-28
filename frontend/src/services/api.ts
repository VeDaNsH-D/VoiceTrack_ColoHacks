// src/services/api.ts
import axios from 'axios'
import {
  TranscriptionResult,
  ExtractionResult,
  DailyEntry,
  DailyAnalytics,
  WeeklyAnalytics,
} from '../types'

const API_BASE = '/api'

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Audio Processing
export const transcribeAudio = async (audioBlob: Blob): Promise<TranscriptionResult> => {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.wav')

  const response = await apiClient.post<TranscriptionResult>('/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

// Entity Extraction
export const extractEntities = async (
  transcript: string,
  previousContext?: DailyEntry[]
): Promise<ExtractionResult> => {
  const response = await apiClient.post<ExtractionResult>('/extract', {
    transcript,
    context: previousContext?.slice(0, 7), // Last 7 days for context
  })

  return response.data
}

// Ledger Management
export const saveDailyEntry = async (entry: DailyEntry): Promise<DailyEntry> => {
  const response = await apiClient.post<DailyEntry>('/ledger/entry', entry)
  return response.data
}

export const getDailyEntries = async (limit: number = 30): Promise<DailyEntry[]> => {
  const response = await apiClient.get<DailyEntry[]>(`/ledger/entries?limit=${limit}`)
  return response.data
}

export const getEntryById = async (id: string): Promise<DailyEntry> => {
  const response = await apiClient.get<DailyEntry>(`/ledger/entry/${id}`)
  return response.data
}

export const updateEntry = async (id: string, updates: Partial<DailyEntry>): Promise<DailyEntry> => {
  const response = await apiClient.patch<DailyEntry>(`/ledger/entry/${id}`, updates)
  return response.data
}

// Analytics
export const getDailyAnalytics = async (date: string): Promise<DailyAnalytics> => {
  const response = await apiClient.get<DailyAnalytics>(`/analytics/daily?date=${date}`)
  return response.data
}

export const getWeeklyAnalytics = async (weekStartDate: string): Promise<WeeklyAnalytics> => {
  const response = await apiClient.get<WeeklyAnalytics>(`/analytics/weekly?start=${weekStartDate}`)
  return response.data
}

export const getLastWeekAnalystics = async (): Promise<WeeklyAnalytics> => {
  const response = await apiClient.get<WeeklyAnalytics>('/analytics/last-week')
  return response.data
}

// Confirmation / Ambiguity Resolution
export const resolveAmbiguity = async (
  entryId: string,
  ambiguityId: string,
  resolution: any
): Promise<DailyEntry> => {
  const response = await apiClient.post<DailyEntry>(
    `/ledger/entry/${entryId}/resolve-ambiguity`,
    {
      ambiguityId,
      resolution,
    }
  )

  return response.data
}

// Export
export const exportPDF = async (format: 'daily' | 'weekly' | 'monthly', date?: string): Promise<Blob> => {
  const response = await apiClient.get(`/export/pdf`, {
    params: { format, date },
    responseType: 'blob',
  })

  return response.data
}

export default apiClient
