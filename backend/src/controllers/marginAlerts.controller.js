const {
  monitorMarginChanges,
  getItemMarginHistory,
  identifyMarginConcerns,
  generateMarginComparisonReport,
} = require("../services/marginAlerts.service");

/**
 * Get current margin change alerts
 * GET /api/analytics/alerts/margin-changes
 */
async function getMarginChangeAlerts(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const alerts = await monitorMarginChanges(userId, businessId);

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get margin history for a specific item
 * GET /api/analytics/margins/history/:itemName
 */
async function getMarginHistoryEndpoint(req, res) {
  try {
    const { userId, businessId } = req.query;
    const { itemName } = req.params;
    const days = req.query.days || 30;

    if (!userId || !businessId || !itemName) {
      return res.status(400).json({ error: "userId, businessId, and itemName required" });
    }

    const history = await getItemMarginHistory(userId, businessId, itemName, parseInt(days));

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get items with margin concerns
 * GET /api/analytics/margins/concerns
 */
async function getMarginConcerns(req, res) {
  try {
    const { userId, businessId } = req.query;
    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const concerns = await identifyMarginConcerns(userId, businessId);

    const grouped = {
      critical: concerns.filter((c) => c.severity === "critical"),
      high: concerns.filter((c) => c.severity === "high"),
      medium: concerns.filter((c) => c.severity === "medium"),
    };

    res.json({
      success: true,
      data: {
        all: concerns,
        groupedBySeverity: grouped,
      },
      summary: {
        totalConcerns: concerns.length,
        criticalCount: grouped.critical.length,
        highCount: grouped.high.length,
        mediumCount: grouped.medium.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Generate margin comparison report
 * GET /api/analytics/margins/report
 */
async function getMarginReport(req, res) {
  try {
    const { userId, businessId } = req.query;
    const days = req.query.days || 30;

    if (!userId || !businessId) {
      return res.status(400).json({ error: "userId and businessId required" });
    }

    const report = await generateMarginComparisonReport(userId, businessId, parseInt(days));

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getMarginChangeAlerts,
  getMarginHistoryEndpoint,
  getMarginConcerns,
  getMarginReport,
};
