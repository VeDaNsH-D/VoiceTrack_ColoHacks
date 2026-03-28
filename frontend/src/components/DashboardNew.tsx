import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DashboardProps {}

const mockData = [
  { month: 'Apr', amount: 2400 },
  { month: 'May', amount: 1398 },
  { month: 'Jun', amount: 9800 },
  { month: 'Jul', amount: 3908 },
  { month: 'Aug', amount: 4800 },
]

const mockTips = [
  {
    id: 1,
    title: 'Reduce food spending',
    description: 'Cut by 10% and save $180 each month',
    savings: 180,
  },
  {
    id: 2,  
    title: 'Transport optimization',
    description: 'Use public transport 2 more days weekly',
    savings: 240,
  },
]

export const DashboardNew: React.FC<DashboardProps> = () => {
  const [selectedTip, setSelectedTip] = useState(0)

  const balance = 14857.05
  const monthly = 1240
  const percentage = 87

  return (
    <div className="min-h-screen bg-gradient-cream pb-32">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral">Welcome back</p>
          <h2 className="text-lg font-semibold text-dark">Alex</h2>
        </div>
        <button className="w-10 h-10 rounded-full hover:bg-peach transition-colors flex items-center justify-center">
          <svg className="w-5 h-5 text-dark" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-6 mb-6 bg-white rounded-3xl p-6 shadow-sm border border-peach border-opacity-30"
      >
        <p className="text-xs text-neutral mb-2">Your balance</p>
        <h3 className="text-4xl font-bold text-dark mb-4">${balance.toFixed(2)}</h3>
        <div className="flex items-center text-sm">
          <span className="text-success font-semibold">+${monthly}</span>
          <span className="text-neutral ml-2">• +2.9% this month</span>
        </div>
      </motion.div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-6 mb-6 bg-white rounded-3xl p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-dark">All good this month</p>
          <p className="text-xs text-neutral">{percentage}% spent</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-sage rounded-full"
          />
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mx-6 mb-6 bg-white rounded-3xl p-6 shadow-sm"
      >
        <h4 className="text-sm font-semibold text-dark mb-4">Monthly spending</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#8B8B8B" />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FBF3EE',
                border: 'none',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="amount" fill="#7A9B6E" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mx-6"
      >
        <h4 className="text-sm font-semibold text-dark mb-4">AI advice</h4>
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="mb-4">
            <p className="font-semibold text-dark mb-2">{mockTips[selectedTip].title}</p>
            <p className="text-sm text-neutral mb-4">{mockTips[selectedTip].description}</p>
            <div className="bg-sage bg-opacity-10 rounded-lg px-3 py-2 inline-block">
              <p className="text-sm font-semibold text-sage">Save ${mockTips[selectedTip].savings}/month</p>
            </div>
          </div>

          {/* Tip Indicators */}
          <div className="flex gap-2 mt-6">
            {mockTips.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedTip(idx)}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  idx === selectedTip ? 'bg-sage' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
