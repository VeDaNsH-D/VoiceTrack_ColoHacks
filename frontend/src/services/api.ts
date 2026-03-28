import axios from 'axios'
import type { DailyEntry, WeeklyAnalytics } from '../types'

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  import.meta.env.VITE_BACKEND_URL?.trim() ||
  'http://localhost:5001'
).replace(/\/$/, '')

const VOICE_API_BASE = (
  import.meta.env.VITE_VOICE_API_BASE_URL?.trim() ||
  import.meta.env.VITE_PYTHON_SERVICE_URL?.trim() ||
  'http://localhost:8001'
).replace(/\/$/, '')

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const voiceApiClient = axios.create({
  baseURL: VOICE_API_BASE,
  timeout: 120000,
})

export interface AuthUser {
  _id: string
  name: string
  role?: 'owner' | 'staff' | 'admin'
  phone?: string
  email?: string
  businessId?: {
    _id: string
    name: string
    type: string
    businessCode?: string
  } | null
}

export interface AuthResult {
  success: boolean
  user: AuthUser
  business?: {
    _id: string
    businessCode?: string
    name: string
    type: string
  } | null
  token: string
  message?: string
}

export interface BusinessDetailsResult {
  success: boolean
  storedInDb: boolean
  business: {
    _id: string
    businessCode: string
    name: string
    type: string
    membersCount: number
    collaborationEnabled: boolean
    owner: {
      _id: string
      name?: string
      email?: string
      phone?: string
      role?: string
    } | null
    members: Array<{
      _id: string
      name?: string
      email?: string
      phone?: string
      role?: string
    }>
    createdAt: string
    updatedAt: string
  }
}

export interface ProcessedTransaction {
  sales: Array<{ item: string; qty: number; price: number }>
  expenses: Array<{ item: string; amount: number }>
  meta: {
    confidence: number
    source: string
    needs_clarification: boolean
    clarification_question: string | null
  }
  debug?: {
    llm_attempted: boolean
    llm_succeeded: boolean
    llm_used_live_response: boolean
    llm_error: string | null
  }
}

export interface HistoryEntry {
  id: string
  createdAt: string
  rawText: string
  normalizedText: string
  sales: Array<{ item: string; qty: number; price: number }>
  expenses: Array<{ item: string; amount: number }>
  totals: {
    salesAmount: number
    expenseAmount: number
    netAmount: number
  }
  meta: {
    confidence?: number
    source?: string
    needsClarification?: boolean
    clarificationQuestion?: string | null
  } | null
}

export interface HistoryResult {
  count: number
  transactions: HistoryEntry[]
}

export interface InsightsResult {
  totals: {
    sales: number
    expenses: number
  }
  transactionCount: number
}

export interface AssistantResult {
  needsClarification?: boolean
  clarificationQuestion?: string | null
  intent?: {
    intent?: string
    timeRange?: string
    product?: string | null
  }
  queryResult?: {
    type: string
    value?: number
    product?: string | null
    quantity?: number
  }
  reply: string
  audioNeeded: boolean
}

export interface ChatResult {
  reply: string
  audioUrl: string | null
}

export interface ConversationStructuredData {
  sales: Array<{ item: string; qty: number; price: number }>
  expenses: Array<{ item: string; amount: number }>
  meta: {
    confidence?: number
    source?: string
    needs_clarification: boolean
    clarification_question?: string | null
  }
  debug?: unknown
}

export interface ConversationResult {
  user_id: string
  transcript: string
  structuring_input: string
  stt: {
    source?: string
    confidence?: number
    raw_text?: string
    quality_gate?: {
      gate_passed?: boolean
      chosen_provider?: string
      reason?: string
      needs_confirmation?: boolean
      sarvam?: unknown
      whisper?: unknown
    }
    preprocessing?: {
      raw_text?: string
      normalized_text?: string
      highlighted_numbers?: string[]
      applied_steps?: string[]
    }
    confidence_engine?: {
      stt_confidence?: number
      rule_consistency?: number
      pattern_match?: number
      final?: number
    }
    debug?: unknown
  }
  structured_data: ConversationStructuredData | null
  conversation_state: {
    clarification_pending: boolean
    finalized: boolean
    started_new: boolean
    requires_confirmation?: boolean
    saved_to_history?: boolean
  }
  assistant: {
    reply: string
    audio_path: string | null
    audio_url: string
    audio_needed: boolean
  }
}

export interface VoiceNarrationTransaction {
  item: string
  quantity: number
  price: number
  total: number
  type: 'credit' | 'debit'
  confidence: number
  approx: boolean
}

export interface VoiceNarrationResult {
  status: 'recorded' | 'needs_confirmation'
  rawTranscript: string
  normalizedTranscript: string
  transactions: VoiceNarrationTransaction[]
  overallConfidence: number
  audioUrl?: string | null
  confirmationMessage?: string
  actionButtons?: string[]
  responseMessage?: string
  recordId?: string
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message?: string
  error?: unknown
}

function unwrapApiResponse<T>(payload: ApiEnvelope<T> | T): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'success' in (payload as Record<string, unknown>) &&
    'data' in (payload as Record<string, unknown>)
  ) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

export function setAuthToken(token: string | null): void {
  if (!token) {
    delete apiClient.defaults.headers.common.Authorization
    return
  }

  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
}

export async function signupUser(payload: {
  name: string
  phone?: string
  email?: string
  password: string
  businessMode: 'create' | 'join'
  businessName?: string
  businessType?: string
  businessCode?: string
  businessPassword: string
}): Promise<AuthResult> {
  const response = await apiClient.post<ApiEnvelope<AuthResult> | AuthResult>('/api/auth/signup', payload)
  return unwrapApiResponse<AuthResult>(response.data)
}

export async function loginUser(payload: {
  identifier: string
  password: string
}): Promise<AuthResult> {
  const response = await apiClient.post<ApiEnvelope<AuthResult> | AuthResult>('/api/auth/login', payload)
  return unwrapApiResponse<AuthResult>(response.data)
}

export async function getAuthStatus(): Promise<{ authenticated: boolean; message: string }> {
  const response = await apiClient.get<ApiEnvelope<{ authenticated: boolean; user?: unknown }> | { authenticated: boolean; message: string }>('/api/auth/status')
  const data = unwrapApiResponse<{ authenticated: boolean; user?: unknown } | { authenticated: boolean; message: string }>(response.data)
  if ('message' in data && typeof data.message === 'string') {
    return { authenticated: Boolean(data.authenticated), message: data.message }
  }
  return {
    authenticated: Boolean(data.authenticated),
    message: data.authenticated ? 'Authenticated' : 'Not authenticated',
  }
}

export async function getBusinessDetails(params: {
  userId?: string
  businessCode?: string
  businessId?: string
}): Promise<BusinessDetailsResult> {
  const response = await apiClient.get<BusinessDetailsResult>('/api/auth/business', {
    params,
  })
  return response.data
}

export async function processTransactionText(payload: {
  text: string
  userId?: string
}): Promise<ProcessedTransaction> {
  const response = await apiClient.post<ApiEnvelope<ProcessedTransaction> | ProcessedTransaction>('/api/transactions/process-text', payload)
  return unwrapApiResponse<ProcessedTransaction>(response.data)
}

export async function saveStructuredTransaction(payload: {
  userId: string
  rawText: string
  normalizedText: string
  sales: Array<{ item: string; qty: number; price: number }>
  expenses: Array<{ item: string; amount: number }>
  meta?: {
    confidence?: number
    source?: string
    needs_clarification?: boolean
    clarification_question?: string | null
  }
}): Promise<any> {
  const response = await apiClient.post<ApiEnvelope<any> | any>('/api/transactions/save', payload)
  return unwrapApiResponse<any>(response.data)
}

export async function getTransactionHistory(params: {
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
} = {}): Promise<HistoryResult> {
  const response = await apiClient.get<ApiEnvelope<HistoryResult> | HistoryResult>('/api/transactions/history', {
    params,
  })
  return unwrapApiResponse<HistoryResult>(response.data)
}

export async function getInsights(userId?: string): Promise<InsightsResult> {
  const response = await apiClient.get<ApiEnvelope<InsightsResult> | InsightsResult>('/api/insights', {
    params: userId ? { userId } : undefined,
  })
  return unwrapApiResponse<InsightsResult>(response.data)
}

export async function getDailyEntries(limit = 30, userId?: string): Promise<DailyEntry[]> {
  const history = await getTransactionHistory({ limit, userId })
  return history.transactions.map((transaction) => {
    const items = (transaction.sales || []).map((sale, index) => ({
      id: `${transaction.id}-item-${index}`,
      name: sale.item,
      quantity: sale.qty,
      unit: 'unit',
      pricePerUnit: sale.price,
      totalPrice: sale.qty * sale.price,
      confidence: transaction.meta?.confidence ?? 0.7,
      highlighted: false,
    }))

    const expenses = (transaction.expenses || []).map((expense, index) => ({
      id: `${transaction.id}-exp-${index}`,
      category: 'other' as const,
      amount: expense.amount,
      description: expense.item,
      confidence: transaction.meta?.confidence ?? 0.7,
      highlighted: false,
    }))

    return {
      id: transaction.id,
      date: transaction.createdAt,
      transcript: transaction.rawText,
      items,
      expenses,
      totalEarnings: transaction.totals.salesAmount,
      totalExpenses: transaction.totals.expenseAmount,
      confidence: transaction.meta?.confidence ?? 0.7,
      flagged: Boolean(transaction.meta?.needsClarification),
      ambiguities: [],
      createdAt: transaction.createdAt,
    }
  })
}

export async function getLastWeekAnalystics(userId?: string): Promise<WeeklyAnalytics> {
  const entries = await getDailyEntries(60, userId)
  const today = new Date()
  const weekAgo = new Date()
  weekAgo.setDate(today.getDate() - 7)

  const weekly = entries.filter((entry) => new Date(entry.date) >= weekAgo)
  const totalEarnings = weekly.reduce((sum, entry) => sum + entry.totalEarnings, 0)
  const totalExpenses = weekly.reduce((sum, entry) => sum + entry.totalExpenses, 0)

  const itemAgg = new Map<string, { frequency: number; quantity: number }>()
  const expAgg = new Map<string, number>()

  weekly.forEach((entry) => {
    entry.items.forEach((item) => {
      const row = itemAgg.get(item.name) || { frequency: 0, quantity: 0 }
      row.frequency += 1
      row.quantity += Number(item.quantity || 0)
      itemAgg.set(item.name, row)
    })

    entry.expenses.forEach((expense) => {
      expAgg.set(expense.category, (expAgg.get(expense.category) || 0) + Number(expense.amount || 0))
    })
  })

  const trendItems = Array.from(itemAgg.entries())
    .sort((a, b) => b[1].frequency - a[1].frequency)
    .slice(0, 10)
    .map(([name, row]) => ({
      name,
      frequency: row.frequency,
      avgQuantity: Number((row.quantity / Math.max(1, row.frequency)).toFixed(2)),
    }))

  const trendExpenses = Array.from(expAgg.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => ({ category, total }))

  const insights: string[] = []
  if (trendItems[0]) {
    insights.push(`${trendItems[0].name} is your most frequent item this week.`)
  }
  if (totalEarnings > totalExpenses) {
    insights.push('You stayed profitable this week.')
  } else {
    insights.push('Expenses were higher than earnings this week; review cost-heavy entries.')
  }

  return {
    week: `${weekAgo.toISOString().slice(0, 10)} to ${today.toISOString().slice(0, 10)}`,
    totalEarnings,
    totalExpenses,
    totalProfit: totalEarnings - totalExpenses,
    avgDailyEarnings: Number((totalEarnings / 7).toFixed(2)),
    trends: {
      items: trendItems,
      expenses: trendExpenses,
    },
    insights,
  }
}

export async function getAnalyticsDashboard(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/dashboard', { params })
  const payload = unwrapApiResponse<any>(response.data)
  if (payload && typeof payload === 'object' && 'dashboard' in payload) {
    return (payload as { dashboard: unknown }).dashboard
  }
  return payload
}

export async function getNextDayDemand(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/demand/next-day', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getItemWiseDemand(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/demand/item-wise', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getDemandPatterns(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/demand/time-patterns', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getSeasonalDemandTrends(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/demand/seasonal-trends', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getProfitPerItem(params: {
  userId: string
  businessId: string
  period?: 'daily' | 'weekly' | 'monthly'
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/profit/item-analysis', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getProfitMargins(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/profit/margins', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getMarginChangeAlerts(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/alerts/margin-changes', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getItemClusters(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/patterns/clusters', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getCustomerPatterns(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/patterns/customer-behavior', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getMarketBasketCombos(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/recommendations/combos', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getCrossSellSuggestions(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/recommendations/suggestions', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getAnomalyAlerts(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/alerts/anomalies', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function resolveAnomalyAlert(alertId: string, params: {
  userId: string
}): Promise<any> {
  const response = await apiClient.post<ApiEnvelope<any> | any>(`/api/analytics/alerts/resolve/${alertId}`, null, { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getPersonalizationProfile(params: {
  userId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/personalization/profile', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getAutoFillEntries(params: {
  userId: string
  q?: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/personalization/autofill', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getVendorPatterns(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/vendors/patterns', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getVendorRecommendations(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/vendors/recommendations', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getGlobalIntelligence(params: {
  userId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/global/intelligence', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getCoachProactiveSuggestions(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/coach/proactive', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function askBusinessCoach(payload: {
  userId: string
  businessId: string
  question: string
}): Promise<any> {
  const response = await apiClient.post<ApiEnvelope<any> | any>('/api/analytics/coach/qa', payload)
  return unwrapApiResponse<any>(response.data)
}

export async function getDecisionGuidance(payload: {
  userId: string
  businessId: string
  decision?: string
}): Promise<any> {
  const { userId, businessId, ...body } = payload
  const response = await apiClient.post<ApiEnvelope<any> | any>('/api/analytics/coach/decision-guidance', body, {
    params: { userId, businessId },
  })
  return unwrapApiResponse<any>(response.data)
}

export async function getVoiceCoaching(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/coach/voice', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function getDemandModelProfile(params: {
  userId: string
  businessId: string
}): Promise<any> {
  const response = await apiClient.get<ApiEnvelope<any> | any>('/api/analytics/model/profile', { params })
  return unwrapApiResponse<any>(response.data)
}

export async function trainDemandModel(payload: {
  userId: string
  businessId: string
  lookbackDays?: number
  horizonDays?: number
}): Promise<any> {
  const response = await apiClient.post<ApiEnvelope<any> | any>('/api/analytics/model/train', payload)
  return unwrapApiResponse<any>(response.data)
}

export async function askAssistant(payload: {
  userId: string
  message: string
}): Promise<AssistantResult> {
  const response = await apiClient.post<ApiEnvelope<AssistantResult> | AssistantResult>('/api/assistant/query', payload)
  return unwrapApiResponse<AssistantResult>(response.data)
}

export async function chatWithAssistant(payload: {
  userId: string
  message: string
  source?: string
  sttProvider?: string
}): Promise<ChatResult> {
  const response = await apiClient.post<ApiEnvelope<ChatResult> | ChatResult>('/chat', payload)
  return unwrapApiResponse<ChatResult>(response.data)
}

export async function sendConversationAudio(payload: {
  audioBlob: Blob
  userId: string
  startNew?: boolean
}): Promise<ConversationResult> {
  const formData = new FormData()
  formData.append('file', payload.audioBlob, 'recording.wav')
  formData.append('user_id', payload.userId)
  formData.append('start_new', String(Boolean(payload.startNew)))

  const response = await voiceApiClient.post<ApiEnvelope<ConversationResult> | ConversationResult>('/conversation', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return unwrapApiResponse<ConversationResult>(response.data)
}

export async function processVoiceNarration(payload: {
  audioBlob?: Blob
  transcript?: string
  userId?: string
  businessId?: string
  languageHint?: string
  forceSave?: boolean
}): Promise<VoiceNarrationResult> {
  const formData = new FormData()

  if (payload.audioBlob) {
    formData.append('audio', payload.audioBlob, 'voice-note.webm')
  }

  if (payload.transcript) {
    formData.append('transcript', payload.transcript)
  }

  if (payload.userId) {
    formData.append('userId', payload.userId)
  }

  if (payload.businessId) {
    formData.append('businessId', payload.businessId)
  }

  if (payload.languageHint) {
    formData.append('languageHint', payload.languageHint)
  }

  if (typeof payload.forceSave === 'boolean') {
    formData.append('forceSave', String(payload.forceSave))
  }

  const response = await apiClient.post<ApiEnvelope<VoiceNarrationResult> | VoiceNarrationResult>(
    '/api/voice/process',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 180000,
    }
  )

  return unwrapApiResponse<VoiceNarrationResult>(response.data)
}

export async function undoLastVoiceTransaction(payload: {
  userId?: string
  businessId?: string
}): Promise<{ undoneId: string; rawText: string }> {
  const response = await apiClient.post<ApiEnvelope<{ undoneId: string; rawText: string }> | { undoneId: string; rawText: string }>(
    '/api/voice/undo-last',
    payload
  )
  return unwrapApiResponse<{ undoneId: string; rawText: string }>(response.data)
}

export async function getProtectedProfile(): Promise<{ success: boolean; user: unknown }> {
  const response = await apiClient.get<ApiEnvelope<{ user: unknown }> | { success: boolean; user: unknown }>('/api/protected')
  const data = unwrapApiResponse<{ user: unknown }>(response.data)
  return { success: true, user: data.user }
}

export async function sendWebhook(payload: Record<string, unknown>): Promise<{ received: boolean; payload: unknown }> {
  const response = await apiClient.post<ApiEnvelope<{ received: boolean; payload: unknown }> | { received: boolean; payload: unknown }>('/api/webhooks', payload)
  return unwrapApiResponse<{ received: boolean; payload: unknown }>(response.data)
}

export default apiClient
