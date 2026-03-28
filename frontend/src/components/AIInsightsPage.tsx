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
    if (!userId || !resolvedBusinessId) {
      setError('Missing user or business context.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [dashboard, nextDay, margins, anomalies, suggestions, global, coach] = await Promise.all([
        getAnalyticsDashboard({ userId, businessId: resolvedBusinessId }),
        getNextDayDemand({ userId, businessId: resolvedBusinessId }),
        getProfitMargins({ userId, businessId: resolvedBusinessId }),
        getAnomalyAlerts({ userId, businessId: resolvedBusinessId }),
        getCrossSellSuggestions({ userId, businessId: resolvedBusinessId }),
        getGlobalIntelligence({ userId }),
        getCoachProactiveSuggestions({ userId, businessId: resolvedBusinessId }),
      ])

      const profile = await getDemandModelProfile({ userId, businessId: resolvedBusinessId }).catch(() => null)
      setModelProfile(profile)

      setData({
        dashboard,
        nextDay,
        margins,
        anomalies,
        suggestions,
        global,
        coach,
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
    if (!userId || !resolvedBusinessId) {
      setTrainError('Missing user or business context.')
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-app-gradient flex flex-col"
    >
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-10 pb-32">
        <div className="mb-6 flex items-center justify-between mt-4">
          <button
            onClick={onToggleSidebar}
            className="w-11 h-11 rounded-full glass-card flex items-center justify-center shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="text-[12px] font-bold uppercase tracking-widest text-[#1A1A1A]/40">
            {language === 'EN' ? 'AI Insights' : 'AI इनसाइट्स'}
          </div>
          <div className="w-11" />
        </div>

        <div className="mb-6">
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#1A1A1A]">
            {language === 'EN' ? `Smart Predictions` : 'स्मार्ट प्रेडिक्शन'}
          </h1>
          <p className="text-[13.5px] text-[#1A1A1A]/50 font-medium mt-1">
            {language === 'EN' ? `For ${userName || 'your business'}.` : `${userName || 'आपके बिजनेस'} के लिए।`}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => void handleTrainModel()}
              disabled={training || loading}
              className="btn-primary !text-[13px] !py-2.5 !px-5 !rounded-2xl disabled:opacity-50"
            >
              {training ? 'Training…' : 'Train Model'}
            </button>
            {trainResult?.trained && (
              <p className="text-xs text-[#1A1A1A]/70">
                Trained on {Number(trainResult.trainingRows || 0)} rows, confidence {Math.round(Number(trainResult.confidence || 0) * 100)}%.
              </p>
            )}
            {trainResult && !trainResult.trained && (
              <p className="text-xs text-[#C44536]">{trainResult.reason || 'Training could not be completed.'}</p>
            )}
          </div>
          {trainError && <p className="text-xs text-[#C44536] mt-2">{trainError}</p>}
        </div>

        {loading && <div className="glass-card rounded-2xl p-4 text-sm text-[#1A1A1A]/70">Loading predictions...</div>}
        {error && <div className="glass-card rounded-2xl p-4 text-sm text-[#C44536]">{error}</div>}

        {!loading && !error && (
          <div className="space-y-4">
            <section className="glass-card rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wider text-[#1A1A1A]/60 mb-2">Next-Day Sales Prediction</p>
              <p className="text-4xl font-bold text-[#1A1A1A]">₹{Math.round(nextDaySales).toLocaleString('en-IN')}</p>
              <p className="text-sm text-[#1A1A1A]/70 mt-2">Confidence: {Math.round(predictionConfidence * 100)}%</p>
            </section>

            <section className="glass-card rounded-2xl p-5">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Model Diagnostics</p>
              <div className="text-sm text-[#1A1A1A]/80 space-y-1">
                <p>Model: {modelDiagnostics?.modelName || 'hybrid_kmeans_rule'}</p>
                <p>Last trained: {diagnosticsTrainedAt}</p>
                <p>Training rows: {diagnosticsRows}</p>
                <p>Clusters: {diagnosticsClusters}</p>
                <p>Model confidence: {Math.round(diagnosticsConfidence * 100)}%</p>
                <p>Volatility score: {diagnosticsVolatility.toFixed(3)}</p>
                <p>
                  Confidence contributors: regression {Math.round(Number(blendWeights.regression || 0) * 100)}%, cluster {Math.round(Number(blendWeights.cluster || 0) * 100)}%, movingAvg {Math.round(Number(blendWeights.movingAvg || 0) * 100)}%
                </p>
              </div>
            </section>

            <section className="glass-card rounded-2xl p-5">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Item-wise Forecast</p>
              <div className="text-sm text-[#1A1A1A]/80 space-y-1">
                {topForecastItems.length === 0 && <p>No item forecast yet.</p>}
                {topForecastItems.map((item: any, index: number) => (
                  <p key={`${item.itemName}-${index}`}>
                    {item.itemName}: {Math.round(item.predictedQty || 0)} units
                  </p>
                ))}
              </div>
            </section>

            <section className="glass-card rounded-2xl p-5">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Inventory Recommendations</p>
              <div className="text-sm text-[#1A1A1A]/80 space-y-1">
                {inventoryRecommendations.length === 0 && <p>No inventory recommendations yet.</p>}
                {inventoryRecommendations.slice(0, 5).map((item: any, index: number) => (
                  <p key={`inv-${item.itemName || index}`}>
                    {item.itemName}: stock {Math.round(item.suggestedStockQty || 0)} units (predicted {Math.round(item.predictedQty || 0)})
                  </p>
                ))}
                {inventoryAlerts.length > 0 && (
                  <p className="pt-1 text-[#C44536]">Alerts: {inventoryAlerts.map((a: any) => a.itemName).join(', ')}</p>
                )}
              </div>
            </section>

            <section className="glass-card rounded-2xl p-5">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Profit Signals</p>
              <p className="text-sm text-[#1A1A1A]/80">High-margin items: {highMarginItems.length}</p>
              <p className="text-sm text-[#1A1A1A]/80">Low-margin items: {lowMarginItems.length}</p>
            </section>

            <section className="glass-card rounded-2xl p-5">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Anomaly Alerts</p>
              <p className="text-sm text-[#1A1A1A]/80">Active alerts: {activeAlerts.length}</p>
            </section>

            <section className="glass-card rounded-2xl p-5">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Cross-sell Suggestions</p>
              <div className="text-sm text-[#1A1A1A]/80 space-y-1">
                {crossSell.length === 0 && <p>No suggestions yet.</p>}
                {crossSell.slice(0, 3).map((row: any, index: number) => (
                  <p key={`cross-${index}`}>{Array.isArray(row.combo) ? row.combo.join(' + ') : row.reason || 'Suggestion'}</p>
                ))}
              </div>
            </section>

            <section className="glass-card rounded-2xl p-5">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Global Intelligence</p>
              <div className="text-sm text-[#1A1A1A]/80 space-y-1">
                {globalSuggestions.length === 0 && <p>No vendors-like-you suggestions yet.</p>}
                {globalSuggestions.slice(0, 3).map((item: any, index: number) => (
                  <p key={`global-${index}`}>{item.item}: {item.reason}</p>
                ))}
              </div>
            </section>

            <section className="glass-card rounded-2xl p-5">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-2">AI Business Coach</p>
              <div className="text-sm text-[#1A1A1A]/80 space-y-1">
                {coachTips.length === 0 && <p>No proactive suggestions yet.</p>}
                {coachTips.slice(0, 3).map((tip: any, index: number) => (
                  <p key={`coach-${index}`}>{tip.title || 'Tip'}: {tip.message || ''}</p>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </motion.div>
  )
}
