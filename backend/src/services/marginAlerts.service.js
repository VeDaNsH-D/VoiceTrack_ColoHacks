const { AnomalyAlert, ProfitAnalysis } = require("../models/analytics.model");
const { calculateItemProfits } = require("./analyticsEngine.service");

/**
 * Monitor margin changes and generate alerts
 */
async function monitorMarginChanges(userId, businessId) {
  try {
    // Get current day's margins
    const currentMargins = await calculateItemProfits(userId, businessId, "daily");

    // Get previous day's margins
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const previousMargins = await ProfitAnalysis.find(
      {
        userId,
        businessId,
        period: "daily",
        periodDate: {
          $gte: new Date(yesterday.toDateString()),
          $lt: new Date(new Date(yesterday.getTime() + 24 * 60 * 60 * 1000).toDateString()),
        },
      },
      { itemName: 1, marginPercent: 1 }
    );

    const previousMarginMap = new Map(previousMargins.map((m) => [m.itemName, m.marginPercent]));

    const alerts = [];

    // Check for significant margin changes
    for (const item of currentMargins) {
      const previousMargin = previousMarginMap.get(item.itemName);

      if (previousMargin !== undefined) {
        const marginChange = item.marginPercent - previousMargin;
        const marginChangePercent = (Math.abs(marginChange) / Math.abs(previousMargin)) * 100;

        // Alert if margin changed by more than 15%
        if (marginChangePercent > 15) {
          const alertType = marginChange < 0 ? "margin_drop" : "margin_increase";
          const severity =
            marginChangePercent > 30 ? "high" : marginChangePercent > 20 ? "medium" : "low";

          const alert = {
            userId,
            businessId,
            alertType,
            itemName: item.itemName,
            severity,
            message:
              marginChange < 0
                ? `Margin for ${item.itemName} dropped ${marginChangePercent.toFixed(1)}%`
                : `Margin for ${item.itemName} increased ${marginChangePercent.toFixed(1)}%`,
            expectedValue: previousMargin,
            actualValue: item.marginPercent,
            deviationPercent: marginChangePercent,
            triggeredAt: new Date(),
          };

          alerts.push(alert);

          // Save alert to database
          await AnomalyAlert.create(alert);
        }
      }
    }

    return alerts;
  } catch (error) {
    console.error("Error monitoring margin changes:", error);
    return [];
  }
}

/**
 * Get margin change history for an item
 */
async function getItemMarginHistory(userId, businessId, itemName, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await ProfitAnalysis.find(
      {
        userId,
        businessId,
        itemName,
        period: "daily",
        periodDate: { $gte: startDate },
      },
      { periodDate: 1, marginPercent: 1, totalProfit: 1, totalRevenue: 1 }
    ).sort({ periodDate: 1 });

    return {
      itemName,
      history,
      trend: calculateMarginTrend(history),
      stats: calculateMarginStats(history),
    };
  } catch (error) {
    console.error("Error getting margin history:", error);
    return null;
  }
}

/**
 * Identify items with concerning margin trends
 */
async function identifyMarginConcerns(userId, businessId) {
  try {
    const recent = await ProfitAnalysis.find(
      { userId, businessId, period: "daily" },
      { itemName: 1, marginPercent: 1, periodDate: 1 }
    )
      .sort({ periodDate: -1 })
      .limit(100);

    const itemMarginMap = new Map();

    // Group by item and calculate trend
    for (const record of recent) {
      if (!itemMarginMap.has(record.itemName)) {
        itemMarginMap.set(record.itemName, []);
      }
      itemMarginMap.get(record.itemName).push(record);
    }

    const concerns = [];

    for (const [itemName, records] of itemMarginMap) {
      if (records.length < 3) continue;

      const margins = records.map((r) => r.marginPercent).reverse();
      const trend = calculateMarginTrend(records.reverse());
      const volatility = calculateMarginVolatility(margins);
      const currentMargin = margins[0];

      // Flag items with declining margins
      if (trend === "declining" && volatility > 5) {
        concerns.push({
          itemName,
          concern: "declining_with_volatility",
          currentMargin,
          trend,
          volatility,
          severity: volatility > 10 ? "high" : "medium",
          recommendation: "Review pricing or cost structure",
        });
      }

      // Flag items with very low margins
      if (currentMargin < 5) {
        concerns.push({
          itemName,
          concern: "very_low_margin",
          currentMargin,
          severity: currentMargin < 0 ? "critical" : "high",
          recommendation: "Consider raising price or reducing costs",
        });
      }

      // Flag items with high volatility
      if (volatility > 15) {
        concerns.push({
          itemName,
          concern: "high_volatility",
          currentMargin,
          volatility,
          severity: "medium",
          recommendation: "Stabilize pricing and cost controls",
        });
      }
    }

    return concerns.sort((a, b) => {
      const severityScore = { critical: 3, high: 2, medium: 1, low: 0 };
      return severityScore[b.severity] - severityScore[a.severity];
    });
  } catch (error) {
    console.error("Error identifying margin concerns:", error);
    return [];
  }
}

/**
 * Helper: Calculate margin trend
 */
function calculateMarginTrend(records) {
  if (records.length < 3) return "insufficient_data";

  const recent = records.slice(-5).map((r) => r.marginPercent);
  const previous = records.slice(-10, -5).map((r) => r.marginPercent);

  if (previous.length === 0) return "insufficient_data";

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

  return recentAvg > prevAvg ? "improving" : recentAvg < prevAvg ? "declining" : "stable";
}

/**
 * Helper: Calculate margin statistics
 */
function calculateMarginStats(records) {
  if (records.length === 0) {
    return {
      avgMargin: 0,
      minMargin: 0,
      maxMargin: 0,
      stdDev: 0,
    };
  }

  const margins = records.map((r) => r.marginPercent);
  const avg = margins.reduce((a, b) => a + b, 0) / margins.length;
  const min = Math.min(...margins);
  const max = Math.max(...margins);
  const variance = margins.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) / margins.length;
  const stdDev = Math.sqrt(variance);

  return {
    avgMargin: avg.toFixed(2),
    minMargin: min.toFixed(2),
    maxMargin: max.toFixed(2),
    stdDev: stdDev.toFixed(2),
    recordCount: records.length,
  };
}

/**
 * Helper: Calculate margin volatility
 */
function calculateMarginVolatility(margins) {
  if (margins.length < 2) return 0;

  const avg = margins.reduce((a, b) => a + b, 0) / margins.length;
  const variance = margins.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) / margins.length;
  const stdDev = Math.sqrt(variance);

  return stdDev;
}

/**
 * Generate margin comparison report
 */
async function generateMarginComparisonReport(userId, businessId, days = 30) {
  try {
    const items = await calculateItemProfits(userId, businessId, "daily");

    const report = {
      generatedAt: new Date(),
      period: `Last ${days} days`,
      items: items.map((item) => ({
        name: item.itemName,
        currentMargin: item.marginPercent,
        tier: item.marginTier,
        revenue: item.totalRevenue,
        profit: item.totalProfit,
        unitsSold: item.unitsSold,
      })),
      summary: {
        highMarginCount: items.filter((i) => i.marginTier === "high").length,
        mediumMarginCount: items.filter((i) => i.marginTier === "medium").length,
        lowMarginCount: items.filter((i) => i.marginTier === "low").length,
        avgMargin: (items.reduce((sum, i) => sum + i.marginPercent, 0) / items.length).toFixed(2),
        bestMargin: Math.max(...items.map((i) => i.marginPercent)).toFixed(2),
        worstMargin: Math.min(...items.map((i) => i.marginPercent)).toFixed(2),
      },
    };

    return report;
  } catch (error) {
    console.error("Error generating margin report:", error);
    return null;
  }
}

module.exports = {
  monitorMarginChanges,
  getItemMarginHistory,
  identifyMarginConcerns,
  generateMarginComparisonReport,
};
