// src/types/index.ts

export interface DailyEntry {
  id: string
  date: string
  transcript: string
  items: ExtractedItem[]
  expenses: ExtractedExpense[]
  totalEarnings: number
  totalExpenses: number
  confidence: number
  flagged: boolean
  ambiguities: Ambiguity[]
  createdAt: string
}

export interface ExtractedItem {
  id: string
  name: string
  quantity: number | null
  unit: string
  pricePerUnit: number | null
  totalPrice: number
  confidence: number
  highlighted: boolean
  audioStartMs?: number
  audioEndMs?: number
}

export interface ExtractedExpense {
  id: string
  category: 'transport' | 'raw_material' | 'rent' | 'utilities' | 'other'
  amount: number
  description: string
  confidence: number
  highlighted: boolean
}

export interface Ambiguity {
  id: string
  field: string
  original: string
  currentValue: any
  question: string
  type: 'quantity' | 'price' | 'category' | 'clarification'
  resolved: boolean
}

export interface DailyAnalytics {
  date: string
  totalEarnings: number
  totalExpenses: number
  profit: number
  itemsSold: number
  topItem: { name: string; quantity: number; revenue: number } | null
  highestRevenueItem: { name: string; revenue: number } | null
  expenses: ExtractedExpense[]
}

export interface WeeklyAnalytics {
  week: string
  totalEarnings: number
  totalExpenses: number
  totalProfit: number
  avgDailyEarnings: number
  trends: {
    items: { name: string; frequency: number; avgQuantity: number }[]
    expenses: { category: string; total: number }[]
  }
  insights: string[]
}

export interface TranscriptionResult {
  raw: string
  cleaned: string
  confidence: number
  usedFallback: boolean
  processingTime: number
}

export interface ExtractionResult {
  items: ExtractedItem[]
  expenses: ExtractedExpense[]
  totalEarnings: number
  totalExpenses: number
  ambiguities: Ambiguity[]
  confidence: number
  reasonings: string[]
}
