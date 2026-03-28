// src/components/ExtractedEntities.tsx
import React from 'react'
import { motion } from 'framer-motion'
import { FiAlertCircle } from 'react-icons/fi'
import { ExtractionResult } from '../types'
import { formatCurrency } from '../utils/formatting'

interface ExtractedEntitiesProps {
  extraction: ExtractionResult
  onResolveAmbiguity?: (ambiguityId: string, resolution: any) => void
}

const ConfidenceBadge: React.FC<{ confidence: number }> = ({ confidence }) => {
  let bgColor = 'bg-red-100'
  let textColor = 'text-red-700'
  let label = '🔴'

  if (confidence >= 0.9) {
    bgColor = 'bg-green-100'
    textColor = 'text-green-700'
    label = '🟢'
  } else if (confidence >= 0.7) {
    bgColor = 'bg-yellow-100'
    textColor = 'text-yellow-700'
    label = '🟡'
  }

  return (
    <span className={`inline-block text-xs font-semibold px-2 py-1 rounded ${bgColor} ${textColor}`}>
      {label} {(confidence * 100).toFixed(0)}%
    </span>
  )
}

export const ExtractedEntities: React.FC<ExtractedEntitiesProps> = ({
  extraction,
  onResolveAmbiguity,
}) => {
  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05 },
    }),
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary */}
      <div className="bg-primary bg-opacity-10 border border-primary border-opacity-20 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-neutral mb-1">💰 Total Earnings</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(extraction.totalEarnings)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral mb-1">💸 Total Expenses</p>
            <p className="text-2xl font-bold text-danger">
              {formatCurrency(extraction.totalExpenses)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral mb-1">📊 Confidence</p>
            <p className="text-2xl font-bold text-warning">
              {(extraction.confidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Items Sold */}
      <div>
        <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
          📦 Items Sold ({extraction.items.length})
        </h3>
        {extraction.items.length > 0 ? (
          <div className="space-y-3">
            {extraction.items.map((item, idx) => (
              <motion.div
                key={item.id}
                custom={idx}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-white border border-neutral border-opacity-10 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-dark">{item.name}</p>
                    <p className="text-sm text-neutral">
                      {item.quantity || '?'} {item.unit}
                      {item.pricePerUnit && ` @ ${formatCurrency(item.pricePerUnit)}/${item.unit}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(item.totalPrice)}
                    </p>
                    <ConfidenceBadge confidence={item.confidence} />
                  </div>
                </div>

                {item.confidence < 0.8 && (
                  <div className="flex items-start gap-2 bg-warning bg-opacity-10 border border-warning border-opacity-20 rounded p-2 mt-2">
                    <FiAlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-dark">
                      ⚠️ Not sure about the quantity. Please confirm if this is correct.
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-neutral bg-opacity-5 rounded-lg p-6 text-center">
            <p className="text-neutral text-sm">No items extracted</p>
          </div>
        )}
      </div>

      {/* Expenses */}
      <div>
        <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
          💳 Expenses ({extraction.expenses.length})
        </h3>
        {extraction.expenses.length > 0 ? (
          <div className="space-y-3">
            {extraction.expenses.map((expense, idx) => (
              <motion.div
                key={expense.id}
                custom={idx + extraction.items.length}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-white border border-neutral border-opacity-10 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-dark capitalize">
                      {expense.category.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-neutral">{expense.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-danger">
                      {formatCurrency(expense.amount)}
                    </p>
                    <ConfidenceBadge confidence={expense.confidence} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-neutral bg-opacity-5 rounded-lg p-6 text-center">
            <p className="text-neutral text-sm">No expenses recorded</p>
          </div>
        )}
      </div>

      {/* Ambiguities / Clarifications Needed */}
      {extraction.ambiguities.length > 0 && (
        <div className="bg-warning bg-opacity-10 border border-warning border-opacity-30 rounded-lg p-4">
          <h4 className="font-semibold text-dark mb-3 flex items-center gap-2">
            <FiAlertCircle className="w-5 h-5 text-warning" />
            ❓ A Few Clarifications
          </h4>
          <div className="space-y-3">
            {extraction.ambiguities.map((ambiguity) => (
              <div key={ambiguity.id} className="bg-white rounded p-3">
                <p className="text-sm font-medium text-dark mb-2">{ambiguity.question}</p>
                {ambiguity.type === 'quantity' && (
                  <input
                    type="number"
                    placeholder="Enter quantity"
                    className="w-full border border-neutral border-opacity-20 rounded px-3 py-2 text-sm"
                    onChange={(e) =>
                      onResolveAmbiguity?.(ambiguity.id, { quantity: e.target.value })
                    }
                  />
                )}
                {ambiguity.type === 'price' && (
                  <input
                    type="number"
                    placeholder="Enter price (₹)"
                    className="w-full border border-neutral border-opacity-20 rounded px-3 py-2 text-sm"
                    onChange={(e) =>
                      onResolveAmbiguity?.(ambiguity.id, { price: e.target.value })
                    }
                  />
                )}
                {ambiguity.type === 'clarification' && (
                  <div className="flex gap-2">
                    <button
                      className="flex-1 bg-success text-white rounded py-2 text-sm font-medium hover:bg-opacity-90"
                      onClick={() => onResolveAmbiguity?.(ambiguity.id, true)}
                    >
                      ✓ Yes
                    </button>
                    <button
                      className="flex-1 bg-danger text-white rounded py-2 text-sm font-medium hover:bg-opacity-90"
                      onClick={() => onResolveAmbiguity?.(ambiguity.id, false)}
                    >
                      ✗ No
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reasoning */}
      {extraction.reasonings.length > 0 && (
        <div className="bg-neutral bg-opacity-5 rounded-lg p-4">
          <p className="text-xs text-neutral font-semibold mb-2">🧠 How VoiceTrace understood:</p>
          <ul className="space-y-1">
            {extraction.reasonings.slice(0, 3).map((reasoning, idx) => (
              <li key={idx} className="text-xs text-dark">
                ✓ {reasoning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
