const analyticsService = require("../services/analytics.service");

async function getInsights(req, res, next) {
  try {
    const userId = typeof req.query?.userId === "string" ? req.query.userId : null;
    const businessId = typeof req.query?.businessId === "string" ? req.query.businessId : null;
    const result = await analyticsService.getInsightsSummary({ userId, businessId });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getSuggestions(req, res, next) {
  try {
    const userId = typeof req.query?.userId === "string" ? req.query.userId : null;
    const businessId = typeof req.query?.businessId === "string" ? req.query.businessId : null;
    const result = await analyticsService.getInsightsSummary({ userId, businessId });
    res.status(200).json({
      suggestions: result.suggestions,
      combos: result.combos,
      insightCards: result.insightCards,
    });
  } catch (error) {
    next(error);
  }
}

async function getForecast(req, res, next) {
  try {
    const userId = typeof req.query?.userId === "string" ? req.query.userId : null;
    const businessId = typeof req.query?.businessId === "string" ? req.query.businessId : null;
    const result = await analyticsService.getInsightsSummary({ userId, businessId });
    res.status(200).json({
      forecast: result.forecast,
      inventory: result.inventory,
      trends: result.timeBasedSalesTrends,
    });
  } catch (error) {
    next(error);
  }
}

async function getAnomalies(req, res, next) {
  try {
    const userId = typeof req.query?.userId === "string" ? req.query.userId : null;
    const businessId = typeof req.query?.businessId === "string" ? req.query.businessId : null;
    const result = await analyticsService.getInsightsSummary({ userId, businessId });
    res.status(200).json({
      anomalies: result.anomalies,
      lowConfidenceCount: result.lowConfidenceCount,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getInsights,
  getSuggestions,
  getForecast,
  getAnomalies,
};
