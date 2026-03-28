import axios from 'axios'

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
