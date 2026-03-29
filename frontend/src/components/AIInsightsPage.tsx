import React from 'react'
import { motion } from 'framer-motion'
import {
  getAnalyticsDashboard,
  getNextDayDemand,
  getProfitMargins,
  getAnomalyAlerts,
  getCrossSellSuggestions,
  getGlobalIntelligence,
  getCoachProactiveSuggestions,
  getBusinessDetails,
  getDemandModelProfile,
  trainDemandModel,
} from '../services/api'

interface AIInsightsPageProps {
  userId: string
  businessId: string
  userName: string
  onToggleSidebar: () => void
  language: 'EN' | 'HI'
}

export const AIInsightsPage: React.FC<AIInsightsPageProps> = ({
  userId,
  businessId,
  userName,
  onToggleSidebar,
  language,
}) => {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<any>(null)
  const [resolvedBusinessId, setResolvedBusinessId] = React.useState<string>(businessId)
  const [modelProfile, setModelProfile] = React.useState<any>(null)
  const [training, setTraining] = React.useState(false)
  const [trainError, setTrainError] = React.useState<string | null>(null)
  const [trainResult, setTrainResult] = React.useState<any>(null)

  React.useEffect(() => {
    setResolvedBusinessId(businessId)
  }, [businessId])

  React.useEffect(() => {
    if (businessId || !userId) {
      return
    }

    let mounted = true
    void getBusinessDetails({ userId })
      .then((result) => {
        if (mounted && result?.business?._id) {
          setResolvedBusinessId(result.business._id)
        }
      })
      .catch(() => {
        if (mounted) {
          setResolvedBusinessId('')
        }
      })

    return () => {
      mounted = false
    }
  }, [businessId, userId])

  const loadInsights = React.useCallback(async () => {
    if (!userId) {
      setError('Missing user context.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const analyticsParams: { userId: string; businessId: string } = {
        userId,
        businessId: resolvedBusinessId || '',
      }

      const [dashboard, nextDay, margins, anomalies, suggestions, global, coach] = await Promise.allSettled([
        getAnalyticsDashboard(analyticsParams),
        getNextDayDemand(analyticsParams),
        getProfitMargins(analyticsParams),
        getAnomalyAlerts(analyticsParams),
        getCrossSellSuggestions(analyticsParams),
        getGlobalIntelligence({ userId }),
        getCoachProactiveSuggestions(analyticsParams),
      ])

      const profile = await getDemandModelProfile(analyticsParams).catch(() => null)
      setModelProfile(profile)

      const settledValues = [dashboard, nextDay, margins, anomalies, suggestions, global, coach]
      const hasAtLeastOneSuccess = settledValues.some(entry => entry.status === 'fulfilled')

      if (!hasAtLeastOneSuccess) {
        setError('Unable to load AI insights right now.')
        setData(null)
        return
      }

      setData({
        dashboard: dashboard.status === 'fulfilled' ? dashboard.value : null,
        nextDay: nextDay.status === 'fulfilled' ? nextDay.value : null,
        margins: margins.status === 'fulfilled' ? margins.value : null,
        anomalies: anomalies.status === 'fulfilled' ? anomalies.value : null,
        suggestions: suggestions.status === 'fulfilled' ? suggestions.value : [],
        global: global.status === 'fulfilled' ? global.value : null,
        coach: coach.status === 'fulfilled' ? coach.value : [],
      })
    } catch {
      setError('Unable to load AI insights right now.')
    } finally {
      setLoading(false)
    }
  }, [userId, resolvedBusinessId])

  React.useEffect(() => {
    void loadInsights()
  }, [loadInsights])

  const handleTrainModel = React.useCallback(async () => {
    if (!userId) {
      setTrainError('Missing user context.')
      return
    }

    if (!resolvedBusinessId) {
      setTrainError('Missing business context. Please complete signup/login again.')
      return
    }

    try {
      setTraining(true)
      setTrainError(null)

      const result = await trainDemandModel({
        userId,
        businessId: resolvedBusinessId,
        lookbackDays: 180,
        horizonDays: 7,
      })

      setTrainResult(result)

      const profile = await getDemandModelProfile({ userId, businessId: resolvedBusinessId }).catch(() => null)
      setModelProfile(profile)

      await loadInsights()
    } catch {
      setTrainError('Model training failed. Please try again.')
    } finally {
      setTraining(false)
    }
  }, [userId, resolvedBusinessId, loadInsights])

  const nextDaySales = Number(
    data?.nextDay?.predictedSales ||
    data?.nextDay?.data?.predictedSales ||
    data?.dashboard?.demandForecast?.nextDay?.predictedSales ||
    0
  )

  const predictionConfidence = Number(
    data?.nextDay?.confidence ||
    data?.nextDay?.data?.confidence ||
    data?.dashboard?.demandForecast?.nextDay?.confidence ||
    0
  )

  const modelDiagnostics = modelProfile || null
  const diagnosticsConfidence = Number(modelDiagnostics?.metrics?.confidence || 0)
  const diagnosticsClusters = Number(modelDiagnostics?.metrics?.clusters || 0)
  const diagnosticsVolatility = Number(modelDiagnostics?.metrics?.volatility || 0)
  const diagnosticsRows = Number(modelDiagnostics?.trainingRows || 0)
  const diagnosticsTrainedAt = modelDiagnostics?.trainedAt
    ? new Date(modelDiagnostics.trainedAt).toLocaleString('en-IN')
    : 'Not trained yet'
  const blendWeights = modelDiagnostics?.params?.blendWeights || {}

  const topForecastItems = (data?.dashboard?.demandForecast?.itemWise || []).slice(0, 5)
  const inventoryRecommendations =
    data?.dashboard?.inventory?.recommendations ||
    topForecastItems.map((item: any) => ({
      itemName: item.itemName,
      predictedQty: Number(item.predictedQty || 0),
      suggestedStockQty: Math.max(1, Math.ceil(Number(item.predictedQty || 0) * 1.2)),
    }))
  const inventoryAlerts = data?.dashboard?.inventory?.lowStockAlerts || []
  const highMarginItems = data?.margins?.highMarginItems || data?.dashboard?.profitAnalysis?.margins?.highMarginItems || []
  const lowMarginItems = data?.margins?.lowMarginItems || data?.dashboard?.profitAnalysis?.margins?.lowMarginItems || []
  const activeAlerts = data?.anomalies?.activeAlerts || data?.anomalies?.data?.activeAlerts || data?.dashboard?.anomalies?.alerts || []
  const crossSell = data?.suggestions || []
  const globalSuggestions = data?.global?.vendorsLikeYou || []
  const coachTips = data?.coach || []
  const topCoachTips = coachTips.slice(0, 3)
  const topCrossSell = crossSell.slice(0, 3)
  const topGlobal = globalSuggestions.slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full min-h-0 bg-[#f4f7fa] flex flex-col"
    >
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-5 py-6 pb-16 max-w-4xl w-full mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onToggleSidebar}
            className="md:hidden w-10 h-10 rounded-xl border border-slate-900/10 bg-slate-900 text-white flex items-center justify-center shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">
            {language === 'EN' ? 'AI Insights' : 'AI इनसाइट्स'}
          </div>
          <div className="w-10" />
        </div>

        <div className="mb-4">
          <h1 className="text-[32px] font-light tracking-[-0.03em] text-slate-900">
            {language === 'EN' ? `Smart Predictions` : 'स्मार्ट प्रेडिक्शन'}
          </h1>
          <p className="text-[14px] text-slate-600 font-medium mt-1">
            {language === 'EN' ? `For ${userName || 'your business'}.` : `${userName || 'आपके बिजनेस'} के लिए।`}
          </p>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => void handleTrainModel()}
              disabled={training || loading}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-semibold disabled:opacity-50"
            >
              {training ? 'Training…' : 'Train Model'}
            </button>
            {trainResult?.trained && (
              <p className="text-xs text-slate-600">
                Trained on {Number(trainResult.trainingRows || 0)} rows, confidence {Math.round(Number(trainResult.confidence || 0) * 100)}%.
              </p>
            )}
            {trainResult && !trainResult.trained && (
              <p className="text-xs text-rose-700">{trainResult.reason || 'Training could not be completed.'}</p>
            )}
          </div>
          {trainError && <p className="text-xs text-rose-700 mt-2">{trainError}</p>}
        </div>

        {loading && <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-600">Loading predictions...</div>}
        {error && <div className="bg-white border border-rose-200 rounded-2xl p-4 text-sm text-rose-700">{error}</div>}

        {!loading && !error && (
          <div className="space-y-3 pb-2">
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-1">Next Day Sales</p>
                <p className="text-2xl font-semibold text-slate-900">₹{Math.round(nextDaySales).toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-1">Confidence</p>
                <p className="text-2xl font-semibold text-slate-900">{Math.round(predictionConfidence * 100)}%</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-1">Active Alerts</p>
                <p className="text-2xl font-semibold text-slate-900">{activeAlerts.length}</p>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900 mb-2">Model Summary</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-slate-700">
                <p>Model: {modelDiagnostics?.modelName || 'hybrid_kmeans_rule'}</p>
                <p>Last trained: {diagnosticsTrainedAt}</p>
                <p>Rows: {diagnosticsRows}</p>
                <p>Clusters: {diagnosticsClusters}</p>
                <p>Confidence: {Math.round(diagnosticsConfidence * 100)}%</p>
                <p>Volatility: {diagnosticsVolatility.toFixed(3)}</p>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Blend: regression {Math.round(Number(blendWeights.regression || 0) * 100)}%, cluster {Math.round(Number(blendWeights.cluster || 0) * 100)}%, movingAvg {Math.round(Number(blendWeights.movingAvg || 0) * 100)}%
              </p>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900 mb-2">Demand & Inventory</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topForecastItems.length === 0 && inventoryRecommendations.length === 0 && inventoryAlerts.length === 0 && (
                    <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No forecast yet.
                    </div>
                  )}

                  {topForecastItems.map((item: any, index: number) => (
                    <div key={`${item.itemName}-${index}`} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Demand</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{item.itemName}</p>
                      <p className="text-sm text-slate-700">{Math.round(item.predictedQty || 0)} units</p>
                    </div>
                  ))}

                  {inventoryRecommendations.slice(0, 3).map((item: any, index: number) => (
                    <div key={`inv-${item.itemName || index}`} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Stock Target</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{item.itemName}</p>
                      <p className="text-sm text-slate-700">{Math.round(item.suggestedStockQty || 0)} units</p>
                    </div>
                  ))}

                  {inventoryAlerts.map((alert: any, index: number) => (
                    <div key={`alert-${alert.itemName || index}`} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Alert</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{alert.itemName}</p>
                      <p className="text-sm text-rose-700">{alert.message || 'Low stock risk'}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900 mb-2">Growth Suggestions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">High Margin</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">{highMarginItems.length}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Low Margin</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">{lowMarginItems.length}</p>
                  </div>

                  {topCrossSell.length === 0 && topGlobal.length === 0 && topCoachTips.length === 0 && (
                    <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No suggestions yet.
                    </div>
                  )}

                  {topCrossSell.map((row: any, index: number) => (
                    <div key={`cross-${index}`} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Cross-sell</p>
                      <p className="text-sm text-slate-800 mt-1">{Array.isArray(row.combo) ? row.combo.join(' + ') : row.reason || 'Cross-sell suggestion'}</p>
                    </div>
                  ))}

                  {topGlobal.map((item: any, index: number) => (
                    <div key={`global-${index}`} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Market Signal</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{item.item}</p>
                      <p className="text-sm text-slate-700">{item.reason}</p>
                    </div>
                  ))}

                  {topCoachTips.map((tip: any, index: number) => (
                    <div key={`coach-${index}`} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Coach Tip</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{tip.title || 'Tip'}</p>
                      <p className="text-sm text-slate-700">{tip.message || ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </motion.div>
  )
}