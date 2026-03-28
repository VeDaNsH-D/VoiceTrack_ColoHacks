// src/components/AnalyticsDashboard.tsx
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getLastWeekAnalystics } from '../services/api'
import { WeeklyAnalytics } from '../types'
import { formatCurrency } from '../utils/formatting'

export const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<WeeklyAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await getLastWeekAnalystics()
        setAnalytics(data)

        // Prepare chart data for items trend
        const itemsData = data.trends.items.map((item) => ({
          name: item.name,
          quantity: item.avgQuantity,
          frequency: item.frequency,
        }))
        setChartData(itemsData)
      } catch (error) {
        console.error('Failed to load analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral">Loading analytics...</p>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral">Not enough data to show analytics</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-8"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-dark">📊 Your Weekly Insights</h2>
        <p className="text-neutral text-sm mt-1">{analytics.week}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-primary bg-opacity-10 rounded-lg p-4 text-center">
          <p className="text-xs text-neutral mb-1">💰 Total</p>
          <p className="text-xl font-bold text-primary">
            {formatCurrency(analytics.totalEarnings)}
          </p>
        </div>
        <div className="bg-danger bg-opacity-10 rounded-lg p-4 text-center">
          <p className="text-xs text-neutral mb-1">💸 Spent</p>
          <p className="text-xl font-bold text-danger">
            {formatCurrency(analytics.totalExpenses)}
          </p>
        </div>
        <div className="bg-success bg-opacity-10 rounded-lg p-4 text-center">
          <p className="text-xs text-neutral mb-1">📈 Profit</p>
          <p className="text-xl font-bold text-success">
            {formatCurrency(analytics.totalProfit)}
          </p>
        </div>
      </div>

      {/* Daily Average */}
      <div className="bg-light border border-neutral border-opacity-10 rounded-lg p-6">
        <h3 className="text-lg font-bold text-dark mb-4">💡 Daily Average</h3>
        <div className="text-center">
          <p className="text-4xl font-bold text-primary">
            {formatCurrency(analytics.avgDailyEarnings)}
          </p>
          <p className="text-neutral text-sm mt-2">Average earnings per day this week</p>
        </div>
      </div>

      {/* Top Items */}
      {chartData.length > 0 && (
        <div className="bg-light border border-neutral border-opacity-10 rounded-lg p-6">
          <h3 className="text-lg font-bold text-dark mb-4">🏆 Top Selling Items</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="quantity" fill="#10B981" name="Avg Quantity" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense Breakdown */}
      {analytics.trends.expenses.length > 0 && (
        <div className="bg-light border border-neutral border-opacity-10 rounded-lg p-6">
          <h3 className="text-lg font-bold text-dark mb-4">💳 Expense Categories</h3>
          <div className="space-y-3">
            {analytics.trends.expenses.map((exp, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <p className="text-dark font-medium capitalize">{exp.category}</p>
                <p className="text-danger font-bold">{formatCurrency(exp.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Insights */}
      {analytics.insights.length > 0 && (
        <div className="bg-primary bg-opacity-10 border border-primary border-opacity-20 rounded-lg p-6">
          <h3 className="text-lg font-bold text-dark mb-4">🧠 VoiceTrace Insights</h3>
          <ul className="space-y-2">
            {analytics.insights.map((insight, idx) => (
              <li key={idx} className="text-dark text-sm flex gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      <div className="bg-warning bg-opacity-10 border border-warning border-opacity-20 rounded-lg p-6">
        <h3 className="text-lg font-bold text-dark mb-3">💡 Next Week Tips</h3>
        <ul className="space-y-2 text-sm text-dark">
          <li>📦 Stock up on your top 3 items - they consistently sell well</li>
          <li>💰 Your expenses on transport are trending up - consider bulk buying</li>
          <li>📈 Weekends show 30% higher earnings - plan extra inventory</li>
        </ul>
      </div>
    </motion.div>
  )
}
