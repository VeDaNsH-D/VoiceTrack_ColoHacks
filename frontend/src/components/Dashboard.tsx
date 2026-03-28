// src/components/Dashboard.tsx
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FiPlus, FiDownload } from 'react-icons/fi'
import { useVoiceTraceStore } from '../store/store'
import { formatCurrency, formatDate } from '../utils/formatting'
import { getDailyEntries } from '../services/api'
import { DailyEntry } from '../types'

interface DashboardProps {
  onNewRecord: () => void
  onViewEntry: (entryId: string) => void
}

export const Dashboard: React.FC<DashboardProps> = ({ onNewRecord, onViewEntry }) => {
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [totalEarningsThisWeek, setTotalEarningsThisWeek] = useState(0)
  const [totalExpensesThisWeek, setTotalExpensesThisWeek] = useState(0)

  const { entries: storeEntries } = useVoiceTraceStore()

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const data = await getDailyEntries(30)
        setEntries(data)

        // Calculate this week
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)

        const thisWeekEntries = data.filter(
          (e) => new Date(e.date) >= weekAgo
        )

        const earnings = thisWeekEntries.reduce((sum, e) => sum + e.totalEarnings, 0)
        const expenses = thisWeekEntries.reduce((sum, e) => sum + e.totalExpenses, 0)

        setTotalEarningsThisWeek(earnings)
        setTotalExpensesThisWeek(expenses)
      } catch (error) {
        console.error('Failed to load entries:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEntries()
  }, [storeEntries])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center">
        <h1 className="text-3xl font-bold text-dark mb-2">💼 Your Business Dashboard</h1>
        <p className="text-neutral text-sm">Last 7 days summary</p>
      </motion.div>

      {/* This Week Summary */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 gap-4"
      >
        <div className="bg-primary bg-opacity-10 border border-primary border-opacity-20 rounded-lg p-4">
          <p className="text-xs text-neutral mb-1">💰 Total Earned</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(totalEarningsThisWeek)}
          </p>
          <p className="text-xs text-neutral mt-1">This week</p>
        </div>

        <div className="bg-danger bg-opacity-10 border border-danger border-opacity-20 rounded-lg p-4">
          <p className="text-xs text-neutral mb-1">💸 Total Spent</p>
          <p className="text-2xl font-bold text-danger">
            {formatCurrency(totalExpensesThisWeek)}
          </p>
          <p className="text-xs text-neutral mt-1">This week</p>
        </div>

        <div className="bg-success bg-opacity-10 border border-success border-opacity-20 rounded-lg p-4">
          <p className="text-xs text-neutral mb-1">📈 Net Profit</p>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(totalEarningsThisWeek - totalExpensesThisWeek)}
          </p>
          <p className="text-xs text-neutral mt-1">This week</p>
        </div>

        <div className="bg-warning bg-opacity-10 border border-warning border-opacity-20 rounded-lg p-4">
          <p className="text-xs text-neutral mb-1">📊 Records</p>
          <p className="text-2xl font-bold text-warning">{entries.length}</p>
          <p className="text-xs text-neutral mt-1">Total entries</p>
        </div>
      </motion.div>

      {/* Record New Entry Button */}
      <motion.button
        variants={itemVariants}
        whileTap={{ scale: 0.98 }}
        onClick={onNewRecord}
        className="w-full bg-gradient-to-r from-primary to-success text-white rounded-lg py-4 font-bold text-lg shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
      >
        <FiPlus className="w-6 h-6" />
        + Record Today's Update
      </motion.button>

      {/* Recent Entries */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
          📋 Recent Entries
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-neutral">Loading your records...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-neutral bg-opacity-5 rounded-lg p-8 text-center">
            <p className="text-neutral mb-4">No records yet</p>
            <button
              onClick={onNewRecord}
              className="text-primary font-semibold hover:underline"
            >
              Record your first update
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.slice(0, 10).map((entry, idx) => (
              <motion.button
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onViewEntry(entry.id)}
                className="w-full bg-white border border-neutral border-opacity-10 rounded-lg p-4 hover:border-primary hover:border-opacity-30 transition text-left"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-dark">
                      {formatDate(entry.date)}
                    </p>
                    <p className="text-sm text-neutral truncate mt-1">
                      {entry.transcript.substring(0, 60)}...
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(entry.totalEarnings)}
                    </p>
                    {entry.flagged && (
                      <span className="inline-block bg-warning bg-opacity-20 text-warning text-xs font-medium px-2 py-1 rounded mt-1">
                        ⚠️ Flagged
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 text-xs text-neutral">
                  <span>📦 {entry.items.length} items</span>
                  <span>💳 {entry.expenses.length} expenses</span>
                  <span>
                    ✨ {(entry.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Export Action */}
      <motion.button
        variants={itemVariants}
        className="w-full flex items-center justify-center gap-2 bg-neutral bg-opacity-10 text-dark rounded-lg py-3 font-semibold hover:bg-opacity-20 transition"
      >
        <FiDownload className="w-5 h-5" />
        Download Income Statement (PDF)
      </motion.button>
    </motion.div>
  )
}
