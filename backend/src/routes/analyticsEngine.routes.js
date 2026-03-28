const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const User = require("../models/user.model");
const {
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
} = require("../controllers/analyticsEngine.controller");
const {
  getMarginChangeAlerts,
  getMarginHistoryEndpoint,
  getMarginConcerns,
  getMarginReport,
} = require("../controllers/marginAlerts.controller");

router.use(async (req, res, next) => {
  try {
    const userId = req.query?.userId || req.body?.userId;
    const existingBusinessId = req.query?.businessId || req.body?.businessId;

    if (!userId || existingBusinessId) {
      return next();
    }

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const user = await User.findById(userId).select("businessId").lean();
    if (!user?.businessId) {
      return res.status(400).json({ error: "No business linked to this userId" });
    }

    const resolvedBusinessId = String(user.businessId);
    req.query.businessId = resolvedBusinessId;

    if (req.body && typeof req.body === "object") {
      req.body.businessId = resolvedBusinessId;
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

// ==================== DEMAND PREDICTION ====================
router.get("/demand/next-day", getNextDaySalesPrediction);
router.get("/demand/item-wise", getItemWiseForecast);
router.get("/demand/time-patterns", getTimeBasedPatterns);
router.get("/demand/seasonal-trends", getSeasonalTrends);

// ==================== PROFIT ANALYSIS ====================
router.get("/profit/item-analysis", getItemProfitAnalysis);
router.get("/profit/margins", getMarginAnalysis);

// ==================== PATTERN & CLUSTERING ====================
router.get("/patterns/clusters", getItemClusters);
router.get("/patterns/customer-behavior", getCustomerBehaviorPatterns);

// ==================== MARKET BASKET & RECOMMENDATIONS ====================
router.get("/recommendations/combos", getFrequentCombos);
router.get("/recommendations/suggestions", getComboSuggestions);

// ==================== ANOMALY DETECTION ====================
router.get("/alerts/anomalies", getAnomalyAlerts);
router.post("/alerts/resolve/:alertId", resolveAlert);
router.get("/alerts/margin-changes", getMarginChangeAlerts);

// ==================== PERSONALIZATION ====================
router.get("/personalization/profile", getPersonalizationProfile);
router.get("/personalization/autofill", getAutoFill);

// ==================== VENDOR PATTERNS ====================
router.get("/vendors/patterns", getVendorPatternInsights);
router.get("/vendors/recommendations", getVendorRecommendationInsights);

// ==================== GLOBAL INTELLIGENCE ====================
router.get("/global/intelligence", getGlobalInsights);

// ==================== AI BUSINESS COACH ====================
router.get("/coach/proactive", getProactiveCoachSuggestions);
router.post("/coach/qa", coachQuestionAnswer);
router.post("/coach/decision-guidance", getGuidance);
router.get("/coach/voice", getVoiceCoaching);

// ==================== MODEL TRAINING ====================
router.get("/model/profile", getModelProfile);
router.post("/model/train", trainModel);

// ==================== MARGIN ALERTS ====================
router.get("/margins/history/:itemName", getMarginHistoryEndpoint);
router.get("/margins/concerns", getMarginConcerns);
router.get("/margins/report", getMarginReport);

// ==================== COMPREHENSIVE DASHBOARD ====================
router.get("/dashboard", getComprehensiveDashboard);

module.exports = router;
