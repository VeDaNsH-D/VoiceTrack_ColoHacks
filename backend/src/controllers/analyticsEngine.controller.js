const {
  predictNextDaySales,
  itemWiseDemandForecast,
  analyzeTimeBasedPatterns,
  detectSeasonalTrends,
  calculateItemProfits,
  identifyHighMarginItems,
  clusterItems,
  analyzeCustomerPatterns,
  findFrequentCombinations,
  getComboRecommendations,
  detectAnomalies,
  buildFrequentItemProfile,
  getPricingHabits,
  getVendorPatterns,
  getAutoFillSuggestions,
  getVendorRecommendations,
  getGlobalIntelligence,
  getProactiveSuggestions,
  getCoachAnswer,
  getDecisionGuidance,
  getVoiceCoachingScript,
  getDemandModelProfile,
  trainDemandModel,
} = require("../services/analyticsEngine.service");
const {
  DemandForecast,
  ProfitAnalysis,
  AnomalyAlert,
  PersonalizationProfile,
} = require("../models/analytics.model");
const User = require("../models/user.model");

async function resolveBusinessContext(userId, businessId) {
  if (userId && businessId) {
    return { userId, businessId };
  }

  if (!userId) {
    return { userId: null, businessId: null };
  }

  const user = await User.findById(userId).select("businessId").lean();
  return {
    userId,
    businessId: user?.businessId ? String(user.businessId) : null,
  };
}

// ==================== DEMAND PREDICTION ENDPOINTS ====================

/**
 * Predict next day sales
 * GET /insights/demand/next-day
 */
async function getNextDaySalesPrediction(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const prediction = await predictNextDaySales(userId, businessId);

    res.json({
      success: true,
      data: prediction,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get item-wise demand forecast
 * GET /insights/demand/item-wise
 */
async function getItemWiseForecast(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const forecasts = await itemWiseDemandForecast(userId, businessId);

    // Save forecasts to database
    for (const forecast of forecasts) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + 1);
      await DemandForecast.findOneAndUpdate(
        {
          userId,
          businessId,
          itemName: forecast.itemName,
          forecastDate: forecastDate.toDateString(),
        },
        {
          userId,
          businessId,
          itemName: forecast.itemName,
          forecastDate,
          predictedQty: forecast.predictedQty,
          confidence: forecast.confidence,
          method: forecast.method,
        },
        { upsert: true }
      );
    }

    res.json({
      success: true,
      data: forecasts,
      count: forecasts.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get time-based demand patterns
 * GET /insights/demand/time-patterns
 */
async function getTimeBasedPatterns(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const patterns = await analyzeTimeBasedPatterns(userId, businessId);

    res.json({
      success: true,
      data: patterns,
      insights: {
        peakHour: patterns[0]?.hour,
        lowestHour: patterns[patterns.length - 1]?.hour,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get seasonal trends
 * GET /insights/demand/seasonal-trends
 */
async function getSeasonalTrends(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const trends = await detectSeasonalTrends(userId, businessId);

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ==================== PROFIT ANALYSIS ENDPOINTS ====================

/**
 * Get profit per item analysis
 * GET /insights/profit/item-analysis
 */
async function getItemProfitAnalysis(req, res) {
  try {
    const { userId, businessId, period = "daily" } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const profits = await calculateItemProfits(userId, businessId, period);

    // Save to database
    for (const item of profits) {
      const periodDate = new Date();
      await ProfitAnalysis.findOneAndUpdate(
        {
          userId,
          businessId,
          itemName: item.itemName,
          period,
          periodDate: periodDate.toDateString(),
        },
        {
          userId,
          businessId,
          itemName: item.itemName,
          period,
          periodDate,
          totalRevenue: item.totalRevenue,
          totalProfit: item.totalProfit,
          marginPercent: parseFloat(item.marginPercent),
          unitsSold: item.unitsSold,
          avgPrice: parseFloat(item.avgPrice),
          marginTier: item.marginTier,
        },
        { upsert: true }
      );
    }

    res.json({
      success: true,
      data: profits,
      summary: {
        topProfitItem: profits[0],
        lowestProfitItem: profits[profits.length - 1],
        totalProfit: profits.reduce((sum, p) => sum + p.totalProfit, 0),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get high and low margin items
 * GET /insights/profit/margins
 */
async function getMarginAnalysis(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const analysis = await identifyHighMarginItems(userId, businessId);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ==================== PATTERN & CLUSTERING ENDPOINTS ====================

/**
 * Get item clustering analysis
 * GET /insights/patterns/clusters
 */
async function getItemClusters(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const clustering = await clusterItems(userId, businessId);

    res.json({
      success: true,
      data: clustering,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get customer behavior patterns
 * GET /insights/patterns/customer-behavior
 */
async function getCustomerBehaviorPatterns(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const patterns = await analyzeCustomerPatterns(userId, businessId);

    res.json({
      success: true,
      data: patterns,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ==================== MARKET BASKET & RECOMMENDATIONS ====================

/**
 * Get frequent item combinations
 * GET /insights/recommendations/combos
 */
async function getFrequentCombos(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const combos = await findFrequentCombinations(userId, businessId);

    res.json({
      success: true,
      data: combos,
      count: combos.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get combo recommendations
 * GET /insights/recommendations/suggestions
 */
async function getComboSuggestions(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const recommendations = await getComboRecommendations(userId, businessId);

    res.json({
      success: true,
      data: recommendations.recommendations,
      topCombos: recommendations.topCombos,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ==================== ANOMALY DETECTION ====================

/**
 * Get anomaly alerts
 * GET /insights/alerts/anomalies
 */
async function getAnomalyAlerts(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const anomalies = await detectAnomalies(userId, businessId);

    // Save alerts to database
    for (const anomaly of anomalies) {
      if (!anomaly.type) continue;
      await AnomalyAlert.create({
        userId,
        businessId,
        alertType: anomaly.type,
        severity: anomaly.severity || "medium",
        message: anomaly.message,
        expectedValue: anomaly.expectedValue,
        actualValue: anomaly.actualValue,
        deviationPercent: anomaly.deviationPercent,
      });
    }

    const active = await AnomalyAlert.find({
      userId,
      businessId,
      isResolved: false,
    })
      .sort({ triggeredAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: {
        activeAlerts: active,
        recentDetections: anomalies,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Resolve an anomaly alert
 * POST /insights/alerts/resolve/:alertId
 */
async function resolveAlert(req, res) {
  try {
    const { alertId } = req.params;
    const { userId } = req.query;

    const alert = await AnomalyAlert.findByIdAndUpdate(
      alertId,
      {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
      { new: true }
    );

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ==================== PERSONALIZATION ====================

/**
 * Get personalization profile
 * GET /insights/personalization/profile
 */
async function getPersonalizationProfile(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const frequentItems = await buildFrequentItemProfile(userId);
    const pricingHabits = await getPricingHabits(userId);

    let profile = await PersonalizationProfile.findOne({ userId });
    if (!profile) {
      profile = await PersonalizationProfile.create({
        userId,
        frequentItems,
        pricingHabits,
      });
    } else {
      profile.frequentItems = frequentItems;
      profile.pricingHabits = pricingHabits;
      profile.lastUpdated = new Date();
      await profile.save();
    }

    res.json({
      success: true,
      data: {
        frequentItems,
        pricingHabits,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getAutoFill(req, res) {
  try {
    const { userId, q = "" } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const suggestions = await getAutoFillSuggestions(userId, q);
    return res.json({ success: true, data: suggestions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getVendorPatternInsights(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const patterns = await getVendorPatterns(userId, businessId);
    return res.json({ success: true, data: patterns });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getVendorRecommendationInsights(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const recommendations = await getVendorRecommendations(userId, businessId);
    return res.json({ success: true, data: recommendations });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getGlobalInsights(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const data = await getGlobalIntelligence(userId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getProactiveCoachSuggestions(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const data = await getProactiveSuggestions(userId, businessId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function coachQuestionAnswer(req, res) {
  try {
    const { userId, businessId, question } = req.body || {};
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const data = await getCoachAnswer(userId, businessId, question);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getGuidance(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const data = await getDecisionGuidance(userId, businessId, req.body || {});
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getVoiceCoaching(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const data = await getVoiceCoachingScript(userId, businessId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function trainModel(req, res) {
  try {
    const requestedUserId = req.body?.userId || req.query?.userId;
    const requestedBusinessId = req.body?.businessId || req.query?.businessId;
    const { userId, businessId } = await resolveBusinessContext(requestedUserId, requestedBusinessId);
    const lookbackDays = req.body?.lookbackDays || req.query?.lookbackDays || 180;
    const horizonDays = req.body?.horizonDays || req.query?.horizonDays || 7;

    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const result = await trainDemandModel(userId, businessId, { lookbackDays, horizonDays });
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getModelProfile(req, res) {
  try {
    const requestedUserId = req.query?.userId;
    const requestedBusinessId = req.query?.businessId;
    const { userId, businessId } = await resolveBusinessContext(requestedUserId, requestedBusinessId);
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const profile = await getDemandModelProfile(userId, businessId);
    return res.json({ success: true, data: profile });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// ==================== COMPREHENSIVE INSIGHTS DASHBOARD ====================

/**
 * Get complete insights dashboard
 * GET /insights/dashboard
 */
async function getComprehensiveDashboard(req, res) {
  try {
    const requestedUserId = req.query?.userId;
    const requestedBusinessId = req.query?.businessId;
    const { userId, businessId } = await resolveBusinessContext(requestedUserId, requestedBusinessId);
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const [
      nextDayPrediction,
      itemForecast,
      timePatterns,
      seasonalTrends,
      itemProfits,
      margins,
      clustering,
      customerBehavior,
      combos,
      anomalies,
      personalization,
    ] = await Promise.all([
      predictNextDaySales(userId, businessId),
      itemWiseDemandForecast(userId, businessId),
      analyzeTimeBasedPatterns(userId, businessId),
      detectSeasonalTrends(userId, businessId),
      calculateItemProfits(userId, businessId, "daily"),
      identifyHighMarginItems(userId, businessId),
      clusterItems(userId, businessId),
      analyzeCustomerPatterns(userId, businessId),
      getComboRecommendations(userId, businessId),
      detectAnomalies(userId, businessId),
      (async () => {
        const profile = await PersonalizationProfile.findOne({ userId });
        return profile || {};
      })(),
    ]);

    const topAlerts = await AnomalyAlert.find({ userId, businessId, isResolved: false })
      .sort({ triggeredAt: -1 })
      .limit(5);

    const inventoryRecommendations = itemForecast
      .slice(0, 8)
      .map((item) => ({
        itemName: item.itemName,
        predictedQty: Number(item.predictedQty || 0),
        suggestedStockQty: Math.max(1, Math.ceil(Number(item.predictedQty || 0) * 1.2)),
        confidence: Number(item.confidence || 0),
      }));

    const lowStockAlerts = inventoryRecommendations
      .filter((item) => item.predictedQty >= 5)
      .slice(0, 5)
      .map((item) => ({
        itemName: item.itemName,
        severity: item.predictedQty >= 15 ? "high" : "medium",
        message: `Expected demand is ${item.predictedQty} units. Prepare at least ${item.suggestedStockQty}.`,
      }));

    res.json({
      success: true,
      dashboard: {
        demandForecast: {
          nextDay: nextDayPrediction,
          itemWise: itemForecast.slice(0, 10),
          timePatterns: timePatterns.filter((p) => p.avgSalesCount > 0),
          seasonalTrends,
        },
        profitAnalysis: {
          topItems: itemProfits.slice(0, 5),
          margins,
        },
        patterns: {
          clusters: clustering,
          customerBehavior,
        },
        recommendations: {
          combos: combos.topCombos,
          suggestions: combos.recommendations,
        },
        anomalies: {
          alerts: topAlerts,
          detections: anomalies,
        },
        inventory: {
          recommendations: inventoryRecommendations,
          lowStockAlerts,
          summary: {
            trackedItems: inventoryRecommendations.length,
            highDemandItems: inventoryRecommendations.filter((item) => item.predictedQty >= 10).length,
          },
        },
        personalization,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getNextDaySalesPrediction,
  getItemWiseForecast,
  getTimeBasedPatterns,
  getSeasonalTrends,
  getItemProfitAnalysis,
  getMarginAnalysis,
  getItemClusters,
  getCustomerBehaviorPatterns,
  getFrequentCombos,
  getComboSuggestions,
  getAnomalyAlerts,
  resolveAlert,
  getPersonalizationProfile,
  getAutoFill,
  getVendorPatternInsights,
  getVendorRecommendationInsights,
  getGlobalInsights,
  getProactiveCoachSuggestions,
  coachQuestionAnswer,
  getGuidance,
  getVoiceCoaching,
  getModelProfile,
  trainModel,
  getComprehensiveDashboard,
};
