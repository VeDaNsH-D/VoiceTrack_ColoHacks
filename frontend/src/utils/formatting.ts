// src/utils/formatting.ts
export const formatCurrency = (amount: number, currency: string = '₹'): string => {
  return `${currency} ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-IN', { maximumFractionDigits: 1 })
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.9) return 'text-green-600'
  if (confidence >= 0.7) return 'text-yellow-600'
  return 'text-red-600'
}

export const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.9) return '🟢 Sure'
  if (confidence >= 0.7) return '🟡 Likely'
  return '🔴 Uncertain'
}

export const getTrendArrow = (current: number, previous: number): string => {
  if (current > previous) return '📈 Up'
  if (current < previous) return '📉 Down'
  return '➡️ Same'
}

export const abbreviateNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return `${num}`
}
