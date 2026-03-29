import React, { useMemo } from 'react'
import type { HistoryEntry } from '../services/api'

interface TransactionTableProps {
    transactions: HistoryEntry[]
    language: 'EN' | 'HI'
    deletingTransactionId?: string | null
    onDeleteTransaction?: (transactionId: string) => void
}

type LedgerRow = {
    key: string
    transactionId: string
    createdAt: string
    item: string
    quantity: number | null
    price: number
    total: number
    type: 'Sale' | 'Expense'
    rawText: string
    netAmount: number
    isFirstRow: boolean
    rowSpan: number
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
})

const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
})

function formatLedgerDate(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return '--'
    }

    return dateFormatter.format(date)
}

function formatCurrency(value: number) {
    return currencyFormatter.format(Number(value || 0))
}

function toLedgerRows(transactions: HistoryEntry[]): LedgerRow[] {
    const rows: LedgerRow[] = []

    transactions.forEach((transaction, transactionIndex) => {
        const sales = Array.isArray(transaction.sales) ? transaction.sales : []
        const expenses = Array.isArray(transaction.expenses) ? transaction.expenses : []
        const baseRows: Array<Omit<LedgerRow, 'isFirstRow' | 'rowSpan'>> = []

        sales.forEach((sale, saleIndex) => {
            const qty = Number(sale.qty || 0)
            const price = Number(sale.price || 0)
            baseRows.push({
                key: `${transaction.id || transactionIndex}-sale-${saleIndex}`,
                transactionId: String(transaction.id || ''),
                createdAt: transaction.createdAt,
                item: sale.item || 'Sale item',
                quantity: qty,
                price,
                total: qty * price,
                type: 'Sale',
                rawText: transaction.rawText || transaction.normalizedText || '--',
                netAmount: Number(transaction.totals?.netAmount || 0),
            })
        })

        expenses.forEach((expense, expenseIndex) => {
            const amount = Number(expense.amount || 0)
            baseRows.push({
                key: `${transaction.id || transactionIndex}-expense-${expenseIndex}`,
                transactionId: String(transaction.id || ''),
                createdAt: transaction.createdAt,
                item: expense.item || 'Expense item',
                quantity: null,
                price: amount,
                total: amount,
                type: 'Expense',
                rawText: transaction.rawText || transaction.normalizedText || '--',
                netAmount: Number(transaction.totals?.netAmount || 0),
            })
        })

        if (!baseRows.length) {
            baseRows.push({
                key: `${transaction.id || transactionIndex}-empty`,
                transactionId: String(transaction.id || ''),
                createdAt: transaction.createdAt,
                item: 'No line items',
                quantity: null,
                price: 0,
                total: 0,
                type: 'Expense',
                rawText: transaction.rawText || transaction.normalizedText || '--',
                netAmount: Number(transaction.totals?.netAmount || 0),
            })
        }

        baseRows.forEach((row, rowIndex) => {
            rows.push({
                ...row,
                isFirstRow: rowIndex === 0,
                rowSpan: baseRows.length,
            })
        })
    })

    return rows
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
    transactions,
    language,
    deletingTransactionId = null,
    onDeleteTransaction,
}) => {
    const ledgerRows = useMemo(() => toLedgerRows(transactions), [transactions])

    if (!ledgerRows.length) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                {language === 'EN' ? 'No transactions found for this range.' : 'इस अवधि के लिए कोई लेन-देन नहीं मिला।'}
            </div>
        )
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="table-auto w-full min-w-[980px]">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-gray-600 text-sm uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-gray-600 text-sm uppercase">Item(s)</th>
                        <th className="px-4 py-3 text-left text-gray-600 text-sm uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-gray-600 text-sm uppercase">Price</th>
                        <th className="px-4 py-3 text-left text-gray-600 text-sm uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-gray-600 text-sm uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-gray-600 text-sm uppercase">Input Prompt</th>
                        <th className="px-4 py-3 text-left text-gray-600 text-sm uppercase">Net Profit</th>
                        <th className="px-4 py-3 text-left text-gray-600 text-sm uppercase">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {ledgerRows.map((row, rowIndex) => {
                        const netIsPositive = row.netAmount >= 0

                        return (
                            <tr
                                key={row.key}
                                className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-gray-50 transition-colors`}
                            >
                                {row.isFirstRow && (
                                    <td rowSpan={row.rowSpan} className="px-4 py-3 align-top text-sm text-slate-700 whitespace-nowrap">
                                        {formatLedgerDate(row.createdAt)}
                                    </td>
                                )}

                                <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.item}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{row.quantity ?? '--'}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(row.price)}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{formatCurrency(row.total)}</td>
                                <td className="px-4 py-3 text-sm">
                                    <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.type === 'Sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                            }`}
                                    >
                                        {row.type}
                                    </span>
                                </td>

                                {row.isFirstRow && (
                                    <td rowSpan={row.rowSpan} className="px-4 py-3 align-top text-sm text-slate-600 max-w-xs">
                                        <p className="line-clamp-3">{row.rawText}</p>
                                    </td>
                                )}

                                {row.isFirstRow && (
                                    <td
                                        rowSpan={row.rowSpan}
                                        className={`px-4 py-3 align-top text-sm font-semibold whitespace-nowrap ${netIsPositive ? 'text-emerald-700' : 'text-rose-600'
                                            }`}
                                    >
                                        {formatCurrency(row.netAmount)}
                                    </td>
                                )}

                                {row.isFirstRow && (
                                    <td rowSpan={row.rowSpan} className="px-4 py-3 align-top">
                                        <button
                                            type="button"
                                            onClick={() => onDeleteTransaction?.(row.transactionId)}
                                            disabled={!onDeleteTransaction || deletingTransactionId === row.transactionId}
                                            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {deletingTransactionId === row.transactionId
                                                ? (language === 'EN' ? 'Deleting...' : 'हटाया जा रहा है...')
                                                : (language === 'EN' ? 'Delete' : 'हटाएं')}
                                        </button>
                                    </td>
                                )}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
