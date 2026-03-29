import React, { useMemo, useState } from 'react'
import { deleteTransactionHistoryEntry, getTransactionHistory, type HistoryEntry } from '../services/api'
import { TransactionTable } from './TransactionTable'

interface HistoryLedgerProps {
    userId: string
    businessId: string
    onToggleSidebar: () => void
    language: 'EN' | 'HI'
}

type Period = 'Today' | 'This Week' | 'This Month'

const formatCurrency = (value: number) => Number(value || 0).toFixed(2)

const escapeCsvValue = (value: string | number) => {
    const text = String(value ?? '')
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
    }
    return text
}

export const HistoryLedger: React.FC<HistoryLedgerProps> = ({ userId, businessId, onToggleSidebar, language }) => {
    const [activePeriod, setActivePeriod] = useState<Period>('Today')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDate, setSelectedDate] = useState('')
    const [records, setRecords] = useState<HistoryEntry[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null)

    const loadHistory = React.useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await getTransactionHistory({
                userId: userId || undefined,
                businessId: businessId || undefined,
                limit: 1000,
            })
            setRecords(response.transactions)
        } catch {
            setRecords([])
        } finally {
            setIsLoading(false)
        }
    }, [userId, businessId])

    React.useEffect(() => {
        void loadHistory()

        const onTransactionSaved = () => {
            void loadHistory()
        }
        window.addEventListener('voicetrack:transaction-saved', onTransactionSaved)

        return () => {
            window.removeEventListener('voicetrack:transaction-saved', onTransactionSaved)
        }
    }, [loadHistory])

    const periodFilteredData = useMemo(() => {
        const now = new Date()
        const dayEnd = new Date(now)
        dayEnd.setHours(23, 59, 59, 999)

        let rangeStart = new Date(now)
        let rangeEnd = dayEnd

        if (selectedDate) {
            const customStart = new Date(`${selectedDate}T00:00:00`)
            const customEnd = new Date(`${selectedDate}T23:59:59.999`)
            if (!Number.isNaN(customStart.getTime()) && !Number.isNaN(customEnd.getTime())) {
                rangeStart = customStart
                rangeEnd = customEnd
            }
        } else if (activePeriod === 'Today') {
            rangeStart.setHours(0, 0, 0, 0)
        } else if (activePeriod === 'This Week') {
            rangeStart.setDate(now.getDate() - 6)
            rangeStart.setHours(0, 0, 0, 0)
        } else {
            rangeStart = new Date(now.getFullYear(), now.getMonth(), 1)
            rangeStart.setHours(0, 0, 0, 0)
        }

        return records.filter((entry) => {
            const createdAt = new Date(entry.createdAt)
            if (Number.isNaN(createdAt.getTime())) {
                return false
            }
            return createdAt >= rangeStart && createdAt <= rangeEnd
        })
    }, [records, activePeriod, selectedDate])

    const filteredData = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase()
        if (!normalizedSearch) {
            return periodFilteredData
        }

        return periodFilteredData.filter((entry) => {
            const inRawText = String(entry.rawText || entry.normalizedText || '').toLowerCase().includes(normalizedSearch)
            const inSales = (entry.sales || []).some((sale) => String(sale.item || '').toLowerCase().includes(normalizedSearch))
            const inExpenses = (entry.expenses || []).some((expense) => String(expense.item || '').toLowerCase().includes(normalizedSearch))
            return inRawText || inSales || inExpenses
        })
    }, [periodFilteredData, searchTerm])

    const totals = useMemo(() => {
        return filteredData.reduce(
            (acc, entry) => {
                acc.sales += Number(entry.totals.salesAmount || 0)
                acc.expenses += Number(entry.totals.expenseAmount || 0)
                acc.net += Number(entry.totals.netAmount || 0)
                return acc
            },
            { sales: 0, expenses: 0, net: 0 }
        )
    }, [filteredData])

    const downloadStatementCsv = () => {
        if (filteredData.length === 0) {
            return
        }

        const sorted = [...filteredData].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        let runningBalance = 0

        const lines: string[] = []
        lines.push(escapeCsvValue('VoiceTrace Statement'))
        lines.push(`${escapeCsvValue('Generated On')},${escapeCsvValue(new Date().toLocaleString(language === 'EN' ? 'en-IN' : 'hi-IN'))}`)
        lines.push(`${escapeCsvValue('Period')},${escapeCsvValue(activePeriod)}`)
        lines.push(`${escapeCsvValue('Records')},${escapeCsvValue(sorted.length)}`)
        lines.push('')

        lines.push([
            'Date & Time',
            'Narration',
            'Type',
            'Debit (INR)',
            'Credit (INR)',
            'Net (INR)',
            'Running Balance (INR)',
        ].map(escapeCsvValue).join(','))

        sorted.forEach((entry) => {
            const debit = Number(entry.totals.expenseAmount || 0)
            const credit = Number(entry.totals.salesAmount || 0)
            const net = Number(entry.totals.netAmount || 0)
            runningBalance += net

            const type = credit > 0 && debit > 0
                ? 'Mixed'
                : credit > 0
                    ? 'Credit'
                    : 'Debit'

            lines.push([
                new Date(entry.createdAt).toLocaleString(language === 'EN' ? 'en-IN' : 'hi-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }),
                entry.rawText || entry.normalizedText || '',
                type,
                formatCurrency(debit),
                formatCurrency(credit),
                formatCurrency(net),
                formatCurrency(runningBalance),
            ].map(escapeCsvValue).join(','))
        })

        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        const stamp = new Date().toISOString().slice(0, 10)
        anchor.href = url
        anchor.download = `voicetrace-statement-${stamp}.csv`
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
        URL.revokeObjectURL(url)
    }

    const handleDeleteTransaction = async (transactionId: string) => {
        if (!transactionId || deletingTransactionId) {
            return
        }

        const confirmed = window.confirm(
            language === 'EN'
                ? 'Delete this ledger log permanently?'
                : 'क्या आप इस लेजर लॉग को स्थायी रूप से हटाना चाहते हैं?'
        )

        if (!confirmed) {
            return
        }

        setDeletingTransactionId(transactionId)
        try {
            await deleteTransactionHistoryEntry({
                transactionId,
                userId: userId || undefined,
                businessId: businessId || undefined,
            })

            setRecords((prev) => prev.filter((entry) => entry.id !== transactionId))
        } catch {
            window.alert(language === 'EN' ? 'Unable to delete this log right now.' : 'यह लॉग अभी हटाया नहीं जा सका।')
        } finally {
            setDeletingTransactionId(null)
        }
    }

    return (
        <div className="h-full min-h-0 overflow-y-auto bg-slate-100 px-6 pb-10 pt-8">
            <div className="mx-auto max-w-[1400px]">
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onToggleSidebar}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>

                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900">
                                {language === 'EN' ? 'Transaction Ledger' : 'लेजर'}
                            </h1>
                            <p className="text-sm text-slate-500">
                                {language === 'EN' ? 'Structured history view for sales and expenses.' : 'बिक्री और खर्च का संरचित इतिहास दृश्य।'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={downloadStatementCsv}
                        disabled={isLoading || filteredData.length === 0}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        {language === 'EN' ? 'Export CSV' : 'CSV निर्यात करें'}
                    </button>
                </div>

                <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        {(['Today', 'This Week', 'This Month'] as Period[]).map((period) => (
                            <button
                                key={period}
                                onClick={() => {
                                    setActivePeriod(period)
                                    setSelectedDate('')
                                }}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition ${activePeriod === period
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {period}
                            </button>
                        ))}

                        <div className="ml-auto w-full max-w-xs">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(event) => setSelectedDate(event.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                            />
                        </div>

                        <div className="w-full max-w-sm">
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder={language === 'EN' ? 'Search by item or prompt...' : 'आइटम या प्रॉम्प्ट से खोजें...'}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                            />
                        </div>

                        {selectedDate && (
                            <button
                                type="button"
                                onClick={() => setSelectedDate('')}
                                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                            >
                                {language === 'EN' ? 'Clear Date' : 'तारीख हटाएँ'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="mb-4 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Records</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">{filteredData.length}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Sales</p>
                        <p className="mt-1 text-2xl font-semibold text-emerald-700">₹{formatCurrency(totals.sales)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Expenses</p>
                        <p className="mt-1 text-2xl font-semibold text-rose-600">₹{formatCurrency(totals.expenses)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Net</p>
                        <p className={`mt-1 text-2xl font-semibold ${totals.net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            ₹{formatCurrency(totals.net)}
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                        {language === 'EN' ? 'Loading records...' : 'रिकॉर्ड लोड हो रहे हैं...'}
                    </div>
                ) : (
                    <TransactionTable
                        transactions={filteredData}
                        language={language}
                        deletingTransactionId={deletingTransactionId}
                        onDeleteTransaction={handleDeleteTransaction}
                    />
                )}
            </div>
        </div>
    )
}
