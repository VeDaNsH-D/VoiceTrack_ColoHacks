const { detectIntent } = require("../services/intent");
const { buildResponse } = require("../services/mergeEngine");
const { processTransactionText } = require("../services/extraction.service");
const { getInsightsSummary } = require("../services/analytics.service");
const { getMapPoints, getAreaInsights } = require("../services/areaInsights.service");

async function processTransaction(text) {
  const result = await processTransactionText(text);
  return result?.result || null;
}

async function getDashboard() {
  return getInsightsSummary();
}

function compactTransactionData(transactionData) {
  if (!transactionData || typeof transactionData !== "object") {
    return {};
  }

  return {
    sales: Array.isArray(transactionData.sales) ? transactionData.sales : [],
    expenses: Array.isArray(transactionData.expenses) ? transactionData.expenses : [],
    meta: transactionData.meta || {},
  };
}

function compactDashboardData(dashboardData) {
  const totals = dashboardData?.totals || {};
  const topItem = dashboardData?.topSellingItems?.[0] || null;
  const peakHour = (Array.isArray(dashboardData?.timeBasedSalesTrends)
    ? dashboardData.timeBasedSalesTrends
    : []
  )
    .filter((entry) => Number(entry?.avgSalesCount || 0) > 0)
    .sort((a, b) => Number(b.avgSalesCount || 0) - Number(a.avgSalesCount || 0))[0] || null;

  return {
    totals: {
      sales: Number(totals.sales || 0),
      expenses: Number(totals.expenses || 0),
      profit: Number(totals.profit || 0),
    },
    transactionCount: Number(dashboardData?.transactionCount || 0),
    topItem: topItem
      ? {
          item: topItem.item,
          quantity: Number(topItem.quantity || 0),
        }
      : null,
    peakHour: peakHour
      ? {
          hour: Number(peakHour.hour || 0),
          avgSalesCount: Number(peakHour.avgSalesCount || 0),
        }
      : null,
    insightCards: Array.isArray(dashboardData?.insightCards)
      ? dashboardData.insightCards.slice(0, 2)
      : [],
  };
}

function compactHeatmapData(heatmapData) {
  const points = Array.isArray(heatmapData?.points) ? heatmapData.points : [];
  const area = heatmapData?.area || null;
  const topAreaItem = area?.topItems?.[0] || null;

  return {
    pointCount: points.length,
    topPoint: points.length
      ? {
          lat: Number(points[0].lat || 0),
          lng: Number(points[0].lng || 0),
          weight: Number(points[0].weight || 0),
        }
      : null,
    area: area
      ? {
          areaName: area.areaName,
          transactionCount: Number(area.transactionCount || 0),
          topItem: topAreaItem
            ? {
                item: topAreaItem.item,
                count: Number(topAreaItem.count || 0),
              }
            : null,
        }
      : null,
    trends: Array.isArray(heatmapData?.trends) ? heatmapData.trends.slice(0, 3) : [],
  };
}

async function getHeatmap() {
  const points = await getMapPoints();
  const firstPoint = Array.isArray(points) && points.length ? points[0] : null;

  if (!firstPoint || !Number.isFinite(Number(firstPoint.lat)) || !Number.isFinite(Number(firstPoint.lng))) {
    return {
      points: Array.isArray(points) ? points.slice(0, 10) : [],
      area: null,
      trends: [],
    };
  }

  const area = await getAreaInsights({
    lat: Number(firstPoint.lat),
    lng: Number(firstPoint.lng),
    radiusKm: 2,
  });

  return {
    points: Array.isArray(points) ? points.slice(0, 20) : [],
    area,
    trends: Array.isArray(area?.trends) ? area.trends : [],
  };
}

async function generateInsights(transactionData, dashboardData, heatmapData) {
  const insightCards = Array.isArray(dashboardData?.insightCards) ? dashboardData.insightCards : [];
  if (insightCards.length && insightCards[0]?.message) {
    return String(insightCards[0].message).trim();
  }

  const topItem = String(dashboardData?.topSellingItems?.[0]?.item || "").trim();
  const trend = Array.isArray(heatmapData?.trends)
    ? heatmapData.trends.find((entry) => String(entry?.trend || "").toLowerCase() === "up")
    : null;

  if (topItem && trend?.category) {
    return `${topItem} fast move kar raha hai, aur ${trend.category} category ka trend up hai`;
  }

  if (transactionData?.meta?.needs_clarification) {
    return "Agle step me quantity ya amount confirm karne se insight aur accurate hogi";
  }

  return "";
}

async function handleAgent(text) {
  const intent = await detectIntent(text);

  let transactionData = {};
  if (intent === "transaction") {
    transactionData = compactTransactionData(await processTransaction(text));
  }

  const [dashboardResult, heatmapResult] = await Promise.allSettled([
    getDashboard(),
    getHeatmap(),
  ]);

  const dashboardData = dashboardResult.status === "fulfilled"
    ? compactDashboardData(dashboardResult.value)
    : {};

  const heatmapData = heatmapResult.status === "fulfilled"
    ? compactHeatmapData(heatmapResult.value)
    : {};

  const insightData = await generateInsights(transactionData, dashboardData, heatmapData);

  const data = {
    transactionData,
    dashboardData,
    heatmapData,
    insightData,
  };

  const reply = buildResponse(intent, data, text);

  return {
    reply,
    intent,
    data,
  };
}

async function postAgent(req, res, next) {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    const result = await handleAgent(text);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  postAgent,
  handleAgent,
};
