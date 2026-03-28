const {
  DemandForecast,
  DemandModelProfile,
  ProfitAnalysis,
  ItemCluster,
  AnomalyAlert,
  PersonalizationProfile,
  GlobalIntelligence,
  MarketBasket,
  CoachInteraction,
} = require("../models/analytics.model");
const { listTransactions } = require("./transaction.store");

// ==================== HELPER FUNCTIONS ====================

function normalizeItemName(value) {
  return String(value || "").trim().toLowerCase();
}

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDateRange(days = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}

function getMovingAverage(values, window = 7) {
  if (values.length < window) return values.reduce((a, b) => a + b, 0) / values.length;
  let sum = 0;
  for (let i = 0; i < window; i++) sum += values[i];
  return sum / window;
}

function calculateTrend(values) {
  if (values.length < 2) return "stable";
  const recent = values.slice(-5);
  const previous = values.slice(-10, -5);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
  const change = ((recentAvg - prevAvg) / prevAvg) * 100;
  return change > 5 ? "up" : change < -5 ? "down" : "stable";
}

function calculateStandardDeviation(values) {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((x) => Math.pow(x - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function linearRegressionNext(values) {
  if (!values.length) return 0;
  if (values.length === 1) return values[0];

  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return Math.max(0, intercept + slope * n);
}

function normalizeRows(rows) {
  if (!rows.length) {
    return { normalized: [], stats: [] };
  }

  const dimensions = rows[0].length;
  const stats = Array.from({ length: dimensions }, () => ({ min: Infinity, max: -Infinity }));

  rows.forEach((row) => {
    row.forEach((value, index) => {
      stats[index].min = Math.min(stats[index].min, value);
      stats[index].max = Math.max(stats[index].max, value);
    });
  });

  const normalized = rows.map((row) =>
    row.map((value, index) => {
      const { min, max } = stats[index];
      if (max === min) return 0;
      return (value - min) / (max - min);
    })
  );

  return { normalized, stats };
}

function denormalize(value, min, max) {
  if (max === min) return min;
  return min + value * (max - min);
}

function kMeansVectors(rows, k = 3, iterations = 25) {
  if (!rows.length) {
    return { centroids: [], assignments: [], inertia: 0 };
  }

  const pointCount = rows.length;
  const clusterCount = Math.max(1, Math.min(k, pointCount));
  const dimensions = rows[0].length;

  const centroids = [];
  for (let c = 0; c < clusterCount; c++) {
    const idx = Math.floor((c * pointCount) / clusterCount);
    centroids.push([...rows[idx]]);
  }

  let assignments = new Array(pointCount).fill(0);

  for (let step = 0; step < iterations; step++) {
    let changed = false;

    for (let i = 0; i < pointCount; i++) {
      let bestCluster = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let c = 0; c < clusterCount; c++) {
        let distance = 0;
        for (let d = 0; d < dimensions; d++) {
          const delta = rows[i][d] - centroids[c][d];
          distance += delta * delta;
        }
        if (distance < bestDistance) {
          bestDistance = distance;
          bestCluster = c;
        }
      }

      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    const sums = Array.from({ length: clusterCount }, () => new Array(dimensions).fill(0));
    const counts = new Array(clusterCount).fill(0);

    for (let i = 0; i < pointCount; i++) {
      const cluster = assignments[i];
      counts[cluster] += 1;
      for (let d = 0; d < dimensions; d++) {
        sums[cluster][d] += rows[i][d];
      }
    }

    for (let c = 0; c < clusterCount; c++) {
      if (!counts[c]) continue;
      for (let d = 0; d < dimensions; d++) {
        centroids[c][d] = sums[c][d] / counts[c];
      }
    }

    if (!changed) {
      break;
    }
  }

  let inertia = 0;
  for (let i = 0; i < pointCount; i++) {
    const centroid = centroids[assignments[i]];
    let squaredDistance = 0;
    for (let d = 0; d < dimensions; d++) {
      const delta = rows[i][d] - centroid[d];
      squaredDistance += delta * delta;
    }
    inertia += squaredDistance;
  }

  return { centroids, assignments, inertia };
}

function dailySeriesFromTransactions(transactions) {
  const map = new Map();
  transactions.forEach((transaction) => {
    const day = new Date(transaction.createdAt).toISOString().slice(0, 10);
    const row = map.get(day) || {
      day,
      sales: 0,
      expense: 0,
      txCount: 0,
      qty: 0,
    };
    row.sales += safeNumber(transaction.totals?.salesAmount);
    row.expense += safeNumber(transaction.totals?.expenseAmount);
    row.txCount += 1;
    row.qty += (transaction.sales || []).reduce((sum, sale) => sum + safeNumber(sale.qty), 0);
    map.set(day, row);
  });

  return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
}

// ==================== DEMAND PREDICTION ====================

async function predictNextDaySales(userId, businessId) {
  const { start, end } = getDateRange(120);
  const allTransactions = await listTransactions();
  const transactions = allTransactions.filter(
    (t) =>
      String(t.userId?._id || t.userId) === String(userId) &&
      String(t.businessId?._id || t.businessId) === String(businessId) &&
      new Date(t.createdAt) >= start &&
      new Date(t.createdAt) <= end
  );

  const daily = dailySeriesFromTransactions(transactions);
  if (!daily.length) {
    return {
      predictedSales: 0,
      confidence: 0.4,
      trend: "stable",
      method: "hybrid_kmeans_rule",
      modelInfo: {
        trainingDays: 0,
        clusters: 0,
        features: ["dayOfWeek", "isWeekend", "sales", "txCount"],
      },
    };
  }

  const salesSeries = daily.map((row) => row.sales);
  const movingAvgPrediction = getMovingAverage(salesSeries.slice(-14), Math.min(7, salesSeries.length));
  const regressionPrediction = linearRegressionNext(salesSeries);

  const featureRows = daily.map((row) => {
    const date = new Date(row.day);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;
    return [dayOfWeek, isWeekend, row.sales, row.txCount];
  });

  const { normalized, stats } = normalizeRows(featureRows);
  const k = Math.min(4, Math.max(2, Math.round(Math.sqrt(normalized.length / 2))));
  const clusterModel = kMeansVectors(normalized, k, 30);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDow = tomorrow.getDay();
  const tomorrowWeekend = tomorrowDow === 0 || tomorrowDow === 6 ? 1 : 0;

  const recentTxAvg = getMovingAverage(daily.slice(-14).map((row) => row.txCount), Math.min(7, daily.length));
  const tomorrowVectorRaw = [tomorrowDow, tomorrowWeekend, movingAvgPrediction, recentTxAvg];
  const tomorrowVector = tomorrowVectorRaw.map((value, index) => {
    const { min, max } = stats[index];
    return max === min ? 0 : (value - min) / (max - min);
  });

  let closestCentroid = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  clusterModel.centroids.forEach((centroid, index) => {
    const distance = centroid.reduce((sum, cValue, dim) => {
      const delta = cValue - tomorrowVector[dim];
      return sum + delta * delta;
    }, 0);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestCentroid = index;
    }
  });

  const centroidSalesNormalized = clusterModel.centroids[closestCentroid]?.[2] ?? 0;
  const clusterSalesPrediction = denormalize(centroidSalesNormalized, stats[2].min, stats[2].max);

  const blendPrediction =
    0.5 * regressionPrediction +
    0.35 * clusterSalesPrediction +
    0.15 * movingAvgPrediction;

  const trend = calculateTrend(salesSeries);
  const meanSales = getMovingAverage(salesSeries, salesSeries.length);
  const volatility = meanSales > 0 ? calculateStandardDeviation(salesSeries) / meanSales : 1;
  const dataScore = clamp(daily.length / 120, 0, 1);
  const fitScore = clamp(1 - clusterModel.inertia / Math.max(1, normalized.length * 2.5), 0, 1);
  const stabilityScore = clamp(1 - volatility, 0, 1);
  const confidence = clamp(0.45 + dataScore * 0.25 + fitScore * 0.2 + stabilityScore * 0.1, 0.45, 0.98);

  return {
    predictedSales: Math.round(Math.max(0, blendPrediction)),
    confidence: parseFloat(confidence.toFixed(2)),
    trend,
    method: "hybrid_kmeans_rule",
    modelInfo: {
      trainingDays: daily.length,
      clusters: clusterModel.centroids.length,
      features: ["dayOfWeek", "isWeekend", "sales", "txCount"],
    },
  };
}

async function itemWiseDemandForecast(userId, businessId) {
  const { start, end } = getDateRange(120);
  const allTransactions = await listTransactions();
  const transactions = allTransactions.filter(
    (t) =>
      String(t.userId?._id || t.userId) === String(userId) &&
      String(t.businessId?._id || t.businessId) === String(businessId) &&
      new Date(t.createdAt) >= start &&
      new Date(t.createdAt) <= end
  );

  const itemDailyQty = new Map();
  transactions.forEach((t) => {
    (t.sales || []).forEach((sale) => {
      const item = normalizeItemName(sale.item);
      const day = new Date(t.createdAt).toISOString().split("T")[0];
      const key = `${item}|${day}`;
      itemDailyQty.set(key, (itemDailyQty.get(key) || 0) + safeNumber(sale.qty));
    });
  });

  const forecasts = new Map();
  for (const [key] of itemDailyQty) {
    const [item] = key.split("|");
    const itemQtys = Array.from(itemDailyQty.entries())
      .filter(([k]) => k.startsWith(item))
      .map(([, q]) => q);

    if (itemQtys.length > 0 && !forecasts.has(item)) {
      const qtyByTime = [...itemQtys];
      const movingAvg = getMovingAverage(qtyByTime.slice(-14), Math.min(7, qtyByTime.length));
      const regression = linearRegressionNext(qtyByTime);

      const vectors = qtyByTime.map((qty, index) => [index, qty]);
      const { normalized, stats } = normalizeRows(vectors);
      const model = kMeansVectors(normalized, Math.min(3, Math.max(1, Math.round(Math.sqrt(qtyByTime.length / 2)))), 20);
      const nextVectorRaw = [qtyByTime.length, movingAvg];
      const nextVector = nextVectorRaw.map((value, idx) => {
        const { min, max } = stats[idx];
        return max === min ? 0 : (value - min) / (max - min);
      });

      let bestCluster = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      model.centroids.forEach((centroid, idx) => {
        const distance = centroid.reduce((sum, cVal, d) => {
          const delta = cVal - nextVector[d];
          return sum + delta * delta;
        }, 0);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestCluster = idx;
        }
      });

      const clusterQty = denormalize(model.centroids[bestCluster]?.[1] ?? 0, stats[1].min, stats[1].max);
      const prediction = 0.5 * movingAvg + 0.35 * regression + 0.15 * clusterQty;
      const variability = calculateStandardDeviation(qtyByTime) / Math.max(1, getMovingAverage(qtyByTime, qtyByTime.length));
      const confidence = clamp(0.5 + clamp(qtyByTime.length / 90, 0, 1) * 0.3 + clamp(1 - variability, 0, 1) * 0.2, 0.45, 0.97);

      forecasts.set(item, {
        itemName: item,
        predictedQty: Math.round(Math.max(0, prediction)),
        confidence: Number(confidence.toFixed(2)),
        method: "hybrid_kmeans_rule",
        historicalCount: qtyByTime.length,
      });
    }
  }

  return Array.from(forecasts.values()).sort((a, b) => b.historicalCount - a.historicalCount);
}

async function analyzeTimeBasedPatterns(userId, businessId) {
  const { start, end } = getDateRange(30);
  const allTransactions = await listTransactions();
  const transactions = allTransactions.filter(
    (t) =>
      String(t.userId?._id || t.userId) === String(userId) &&
      String(t.businessId?._id || t.businessId) === String(businessId) &&
      new Date(t.createdAt) >= start &&
      new Date(t.createdAt) <= end
  );

  const hourlyStats = new Map();
  transactions.forEach((t) => {
    const hour = new Date(t.createdAt).getHours();
    const stats = hourlyStats.get(hour) || {
      hour,
      salesCount: 0,
      totalSales: 0,
      itemsMap: new Map(),
    };
    stats.salesCount++;
    stats.totalSales += t.totals?.salesAmount || 0;
    (t.sales || []).forEach((s) => {
      const item = normalizeItemName(s.item);
      stats.itemsMap.set(item, (stats.itemsMap.get(item) || 0) + safeNumber(s.qty));
    });
    hourlyStats.set(hour, stats);
  });

  const patterns = Array.from(hourlyStats.values()).map((stats) => ({
    hour: stats.hour,
    avgSalesCount: Math.round(stats.salesCount / 30),
    avgSalesAmount: Math.round(stats.totalSales / 30),
    topItems: Array.from(stats.itemsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([item, qty]) => ({ itemName: item, avgQty: (qty / 30).toFixed(1) })),
  }));

  return patterns.sort((a, b) => a.hour - b.hour);
}

async function detectSeasonalTrends(userId, businessId) {
  const { start, end } = getDateRange(90);
  const allTransactions = await listTransactions();
  const transactions = allTransactions.filter(
    (t) =>
      String(t.userId?._id || t.userId) === String(userId) &&
      String(t.businessId?._id || t.businessId) === String(businessId) &&
      new Date(t.createdAt) >= start &&
      new Date(t.createdAt) <= end
  );

  const weeklyStats = new Map();
  transactions.forEach((t) => {
    const date = new Date(t.createdAt);
    const week = Math.floor((date.getDate() - date.getDay() + 6) / 7);
    const month = date.getMonth();
    const key = `${month}-w${week}`;
    const stats = weeklyStats.get(key) || { week: key, sales: 0, count: 0 };
    stats.sales += t.totals?.salesAmount || 0;
    stats.count++;
    weeklyStats.set(key, stats);
  });

  const patterns = Array.from(weeklyStats.values())
    .map((s) => ({ ...s, avgSales: Math.round(s.sales / Math.max(1, s.count)) }))
    .sort((a, b) => a.week.localeCompare(b.week));

  return {
    weeklyBreakdown: patterns,
    peakWeeks: patterns.sort((a, b) => b.avgSales - a.avgSales).slice(0, 3),
    lowWeeks: patterns.sort((a, b) => a.avgSales - b.avgSales).slice(0, 2),
  };
}

// ==================== PROFIT ANALYSIS ====================

async function calculateItemProfits(userId, businessId, period = "daily") {
  const { start, end } = getDateRange(period === "daily" ? 1 : period === "weekly" ? 7 : 30);
  const allTransactions = await listTransactions();
  const transactions = allTransactions.filter(
    (t) =>
      String(t.userId?._id || t.userId) === String(userId) &&
      String(t.businessId?._id || t.businessId) === String(businessId) &&
      new Date(t.createdAt) >= start &&
      new Date(t.createdAt) <= end
  );

  const itemStats = new Map();
  transactions.forEach((t) => {
    (t.sales || []).forEach((sale) => {
      const item = normalizeItemName(sale.item);
      const stats = itemStats.get(item) || {
        itemName: item,
        totalRevenue: 0,
        unitsSold: 0,
        transactions: 0,
      };
      const revenue = safeNumber(sale.qty) * safeNumber(sale.price);
      stats.totalRevenue += revenue;
      stats.unitsSold += safeNumber(sale.qty);
      stats.transactions++;
      itemStats.set(item, stats);
    });
  });

  let totalAllExpenses = 0;
  transactions.forEach((t) => {
    totalAllExpenses += t.totals?.expenseAmount || 0;
  });
  const avgExpensePerTransaction = transactions.length > 0 ? totalAllExpenses / transactions.length : 0;

  return Array.from(itemStats.values()).map((stats) => {
    const allocatedExpense = stats.transactions * avgExpensePerTransaction;
    const profit = stats.totalRevenue - allocatedExpense;
    const margin = stats.totalRevenue > 0 ? ((profit / stats.totalRevenue) * 100).toFixed(2) : 0;
    const marginTier = margin > 30 ? "high" : margin > 10 ? "medium" : "low";

    return {
      itemName: stats.itemName,
      totalRevenue: Math.round(stats.totalRevenue),
      totalProfit: Math.round(profit),
      marginPercent: parseFloat(margin),
      unitsSold: stats.unitsSold,
      avgPrice: (stats.totalRevenue / stats.unitsSold).toFixed(2),
      marginTier,
    };
  }).sort((a, b) => b.totalProfit - a.totalProfit);
}

async function identifyHighMarginItems(userId, businessId) {
  const items = await calculateItemProfits(userId, businessId, "weekly");
  return {
    highMarginItems: items.filter((i) => i.marginTier === "high").slice(0, 10),
    lowMarginItems: items.filter((i) => i.marginTier === "low").slice(0, 10),
    avgMarginPercent: (items.reduce((sum, i) => sum + i.marginPercent, 0) / items.length).toFixed(2),
  };
}

// ==================== PATTERN LEARNING ====================

async function clusterItems(userId, businessId) {
  const items = await calculateItemProfits(userId, businessId, "monthly");
  
  const clusters = {
    highProfitHighVolume: [],
    highProfitLowVolume: [],
    lowProfitHighVolume: [],
    fastMoving: [],
    steadyPerformers: [],
  };

  items.forEach((item) => {
    if (item.marginTier === "high" && item.unitsSold > 50) {
      clusters.highProfitHighVolume.push(item);
    } else if (item.marginTier === "high" && item.unitsSold <= 50) {
      clusters.highProfitLowVolume.push(item);
    } else if (item.marginTier !== "high" && item.unitsSold > 50) {
      clusters.lowProfitHighVolume.push(item);
    }
    if (item.unitsSold > 200) {
      clusters.fastMoving.push(item);
    } else if (item.unitsSold > 30) {
      clusters.steadyPerformers.push(item);
    }
  });

  return {
    clusters,
    summary: {
      totalUniqueItems: items.length,
      starProducts: clusters.highProfitHighVolume.length,
      niche: clusters.highProfitLowVolume.length,
      volumeLeaders: clusters.lowProfitHighVolume.length,
    },
  };
}

async function analyzeCustomerPatterns(userId, businessId) {
  const { start, end } = getDateRange(60);
  const allTransactions = await listTransactions();
  const transactions = allTransactions.filter(
    (t) =>
      String(t.userId?._id || t.userId) === String(userId) &&
      String(t.businessId?._id || t.businessId) === String(businessId) &&
      new Date(t.createdAt) >= start &&
      new Date(t.createdAt) <= end
  );

  const patterns = {
    frequencyPattern: {},
    timingPattern: {},
    basketSize: [],
    repeatItems: new Map(),
  };

  transactions.forEach((t) => {
    const day = new Date(t.createdAt).getDay();
    patterns.frequencyPattern[day] = (patterns.frequencyPattern[day] || 0) + 1;

    const hour = new Date(t.createdAt).getHours();
    patterns.timingPattern[hour] = (patterns.timingPattern[hour] || 0) + 1;

    patterns.basketSize.push(t.sales?.length || 0);

    (t.sales || []).forEach((s) => {
      const item = normalizeItemName(s.item);
      patterns.repeatItems.set(item, (patterns.repeatItems.get(item) || 0) + 1);
    });
  });

  return {
    frequencyByDayOfWeek: patterns.frequencyPattern,
    peakHours: Object.entries(patterns.timingPattern)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour, count]) => ({ hour: parseInt(hour), frequency: count })),
    avgBasketSize: (
      patterns.basketSize.reduce((a, b) => a + b, 0) / patterns.basketSize.length
    ).toFixed(2),
    topRepeatItems: Array.from(patterns.repeatItems.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([item, count]) => ({ itemName: item, frequency: count })),
  };
}

// ==================== MARKET BASKET ANALYSIS ====================

async function findFrequentCombinations(userId, businessId) {
  const { start, end } = getDateRange(30);
  const allTransactions = await listTransactions();
  const transactions = allTransactions.filter(
    (t) =>
      String(t.userId?._id || t.userId) === String(userId) &&
      String(t.businessId?._id || t.businessId) === String(businessId) &&
      new Date(t.createdAt) >= start &&
      new Date(t.createdAt) <= end
  );

  const pairCounts = new Map();
  const itemCounts = new Map();
  const totalTransactions = transactions.length;

  transactions.forEach((t) => {
    const items = (t.sales || [])
      .map((s) => normalizeItemName(s.item))
      .filter((x) => x);

    items.forEach((item) => {
      itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
    });

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const pair = [items[i], items[j]].sort().join("|");
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
      }
    }
  });

  const combos = Array.from(pairCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([pair, count]) => {
      const [item1, item2] = pair.split("|");
      const support = count / totalTransactions;
      const confidence1 = count / (itemCounts.get(item1) || 1);
      const confidence2 = count / (itemCounts.get(item2) || 1);
      const lift =
        support /
        ((itemCounts.get(item1) || 1) / totalTransactions) /
        ((itemCounts.get(item2) || 1) / totalTransactions);

      return {
        items: [item1, item2],
        frequency: count,
        support: support.toFixed(3),
        confidence: Math.max(confidence1, confidence2).toFixed(3),
        lift: lift.toFixed(2),
      };
    })
    .sort((a, b) => b.frequency - a.frequency);

  return combos.slice(0, 20);
}

async function getComboRecommendations(userId, businessId) {
  const combos = await findFrequentCombinations(userId, businessId);
  return {
    topCombos: combos.slice(0, 5),
    allCombos: combos,
    recommendations: combos.slice(0, 10).map((c) => ({
      combo: c.items,
      reason: `These items are frequently purchased together (${c.frequency} times).`,
      confidenceScore: parseFloat(c.confidence),
    })),
  };
}

// ==================== ANOMALY DETECTION ====================

async function detectAnomalies(userId, businessId) {
  const { start, end } = getDateRange(30);
  const allTransactions = await listTransactions();
  const transactions = allTransactions.filter(
    (t) =>
      String(t.userId?._id || t.userId) === String(userId) &&
      String(t.businessId?._id || t.businessId) === String(businessId) &&
      new Date(t.createdAt) >= start &&
      new Date(t.createdAt) <= end
  );

  const alerts = [];

  // Sales drop detection
  const dailySales = new Map();
  transactions.forEach((t) => {
    const day = new Date(t.createdAt).toISOString().split("T")[0];
    dailySales.set(day, (dailySales.get(day) || 0) + (t.totals?.salesAmount || 0));
  });

  const sales = Array.from(dailySales.values());
  if (sales.length > 1) {
    const avg = sales.reduce((a, b) => a + b, 0) / sales.length;
    const stdDev = calculateStandardDeviation(sales);
    const lastSale = sales[sales.length - 1];

    if (lastSale < avg - 2 * stdDev) {
      alerts.push({
        type: "sales_drop",
        severity: "high",
        message: `Sales dropped ${((1 - lastSale / avg) * 100).toFixed(1)}% below average`,
        expectedValue: Math.round(avg),
        actualValue: Math.round(lastSale),
        deviationPercent: ((1 - lastSale / avg) * 100).toFixed(1),
      });
    }
  }

  // Unusual expense detection
  const expenseSeries = transactions
    .map((t) => safeNumber(t.totals?.expenseAmount))
    .filter((value) => value > 0);

  if (expenseSeries.length > 3) {
    const avgExpense = expenseSeries.reduce((a, b) => a + b, 0) / expenseSeries.length;
    const stdExpense = calculateStandardDeviation(expenseSeries);
    const lastExpense = expenseSeries[expenseSeries.length - 1];

    if (lastExpense > avgExpense + 2 * stdExpense) {
      alerts.push({
        type: "unusual_expense",
        severity: "high",
        message: `Expense spike detected: ${((lastExpense / avgExpense - 1) * 100).toFixed(1)}% above normal`,
        expectedValue: Math.round(avgExpense),
        actualValue: Math.round(lastExpense),
        deviationPercent: ((lastExpense / avgExpense - 1) * 100).toFixed(1),
      });
    }
  }

  // Performance deviation alerts (net amount volatility)
  const netSeries = transactions.map((t) => safeNumber(t.totals?.netAmount));
  if (netSeries.length > 5) {
    const avgNet = netSeries.reduce((a, b) => a + b, 0) / netSeries.length;
    const stdNet = calculateStandardDeviation(netSeries);
    const latestNet = netSeries[0];
    if (Math.abs(latestNet - avgNet) > 2 * stdNet) {
      alerts.push({
        type: "performance_deviation",
        severity: "medium",
        message: `Net performance deviated by ${Math.abs(((latestNet - avgNet) / (avgNet || 1)) * 100).toFixed(1)}%`,
        expectedValue: Math.round(avgNet),
        actualValue: Math.round(latestNet),
        deviationPercent: Math.abs(((latestNet - avgNet) / (avgNet || 1)) * 100).toFixed(1),
      });
    }
  }

  // Missing data detection
  if (transactions.length === 0) {
    alerts.push({
      type: "missing_data",
      severity: "medium",
      message: "No transactions recorded in the past week",
    });
  }

  return alerts;
}

// ==================== PERSONALIZATION ====================

async function buildFrequentItemProfile(userId) {
  const allTransactions = await listTransactions();
  const transactions = allTransactions.filter(
    (t) => String(t.userId?._id || t.userId) === String(userId)
  );

  const frequentItems = new Map();
  const now = new Date();

  transactions.forEach((t) => {
    (t.sales || []).forEach((s) => {
      const item = normalizeItemName(s.item);
      const existing = frequentItems.get(item) || { frequency: 0, lastUsed: new Date(0), priceSum: 0, count: 0 };
      existing.frequency++;
      existing.lastUsed = new Date(t.createdAt) > existing.lastUsed ? new Date(t.createdAt) : existing.lastUsed;
      existing.priceSum += safeNumber(s.price);
      existing.count++;
      frequentItems.set(item, existing);
    });
  });

  return Array.from(frequentItems.entries())
    .map(([itemName, data]) => ({
      itemName,
      frequency: data.frequency,
      lastUsed: data.lastUsed,
      avgPrice: (data.priceSum / data.count).toFixed(2),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);
}

async function getPricingHabits(userId) {
  const allTransactions = await listTransactions();
  const transactions = allTransactions.filter(
    (t) => String(t.userId?._id || t.userId) === String(userId)
  );

  const prices = [];
  const transactionSizes = [];

  transactions.forEach((t) => {
    transactionSizes.push(t.totals?.salesAmount || 0);
    (t.sales || []).forEach((s) => {
      prices.push(safeNumber(s.price));
    });
  });

  prices.sort((a, b) => a - b);
  transactionSizes.sort((a, b) => a - b);

  if (!prices.length || !transactionSizes.length) {
    return {
      avgTransactionSize: "0.00",
      preferredPriceRange: { min: 0, max: 0 },
      priceSensitivity: "medium",
    };
  }

  return {
    avgTransactionSize: (transactionSizes.reduce((a, b) => a + b, 0) / transactionSizes.length).toFixed(2),
    preferredPriceRange: {
      min: prices[Math.floor(prices.length * 0.25)],
      max: prices[Math.floor(prices.length * 0.75)],
    },
    priceSensitivity:
      prices[Math.floor(prices.length * 0.75)] - prices[Math.floor(prices.length * 0.25)] < 50
        ? "low"
        : "high",
  };
}

async function getVendorPatterns(userId, businessId) {
  const { start, end } = getDateRange(60);
  const allTransactions = await listTransactions();
  const transactions = allTransactions.filter(
    (t) =>
      String(t.userId?._id || t.userId) === String(userId) &&
      String(t.businessId?._id || t.businessId) === String(businessId) &&
      new Date(t.createdAt) >= start &&
      new Date(t.createdAt) <= end
  );

  const vendorMap = new Map();
  transactions.forEach((t) => {
    (t.expenses || []).forEach((expense) => {
      const vendor = normalizeItemName(expense.item);
      if (!vendor) return;
      const row = vendorMap.get(vendor) || { vendor, spend: 0, transactions: 0 };
      row.spend += safeNumber(expense.amount);
      row.transactions += 1;
      vendorMap.set(vendor, row);
    });
  });

  return Array.from(vendorMap.values())
    .map((row) => ({
      vendor: row.vendor,
      totalSpend: Math.round(row.spend),
      frequency: row.transactions,
      avgSpend: Number((row.spend / Math.max(1, row.transactions)).toFixed(2)),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 15);
}

async function getAutoFillSuggestions(userId, partialText = "") {
  const frequentItems = await buildFrequentItemProfile(userId);
  const normalized = normalizeItemName(partialText);
  return frequentItems
    .filter((item) => !normalized || item.itemName.includes(normalized))
    .slice(0, 8)
    .map((item) => ({
      text: item.itemName,
      suggestedPrice: Number(item.avgPrice),
      confidence: Math.min(0.95, 0.4 + item.frequency * 0.03),
    }));
}

async function getVendorRecommendations(userId, businessId) {
  const vendors = await getVendorPatterns(userId, businessId);
  return vendors.slice(0, 5).map((vendor) => ({
    vendor: vendor.vendor,
    reason: `You used this vendor ${vendor.frequency} times recently.`,
    expectedSpendRange: {
      min: Math.round(vendor.avgSpend * 0.9),
      max: Math.round(vendor.avgSpend * 1.1),
    },
  }));
}

async function getGlobalIntelligence(userId) {
  const allTransactions = await listTransactions();
  const currentUserTx = allTransactions.filter(
    (t) => String(t.userId?._id || t.userId) === String(userId)
  );
  const otherVendorsTx = allTransactions.filter(
    (t) => String(t.userId?._id || t.userId) !== String(userId)
  );

  const buildTopItems = (rows) => {
    const itemMap = new Map();
    rows.forEach((t) => {
      (t.sales || []).forEach((sale) => {
        const item = normalizeItemName(sale.item);
        const total = itemMap.get(item) || 0;
        itemMap.set(item, total + safeNumber(sale.qty));
      });
    });
    return Array.from(itemMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([itemName, volume]) => ({ itemName, volume }));
  };

  const marketTrends = buildTopItems(otherVendorsTx);
  const yourTrends = buildTopItems(currentUserTx);
  const yourSet = new Set(yourTrends.map((row) => row.itemName));

  return {
    anonymizedVendorCount: new Set(
      otherVendorsTx.map((t) => String(t.userId?._id || t.userId || ""))
    ).size,
    marketTrends,
    vendorsLikeYou: marketTrends
      .filter((trend) => !yourSet.has(trend.itemName))
      .slice(0, 5)
      .map((trend) => ({
        item: trend.itemName,
        reason: "Trending among similar vendors",
      })),
    locationInsights: {
      region: "default",
      note: "No location field found; using global aggregate until location metadata is available.",
    },
  };
}

async function getProactiveSuggestions(userId, businessId) {
  const [anomalies, nextDay, margins] = await Promise.all([
    detectAnomalies(userId, businessId),
    predictNextDaySales(userId, businessId),
    identifyHighMarginItems(userId, businessId),
  ]);

  const tips = [];

  if (anomalies.length) {
    tips.push({
      type: "risk",
      title: "Review active anomaly",
      message: anomalies[0].message,
    });
  }

  if (nextDay.predictedSales > 0) {
    tips.push({
      type: "demand",
      title: "Prep inventory for tomorrow",
      message: `Expected sales around ${nextDay.predictedSales}. Stock top-selling items early.`,
    });
  }

  if (margins.lowMarginItems?.length) {
    tips.push({
      type: "profit",
      title: "Improve low-margin items",
      message: `Focus on ${margins.lowMarginItems.slice(0, 2).map((i) => i.itemName).join(", ")} to improve profitability.`,
    });
  }

  return tips;
}

async function getCoachAnswer(userId, businessId, question) {
  const text = normalizeItemName(question);
  if (!text) {
    return {
      answer: "Ask me about sales, margins, combos, or anomalies.",
      category: "general",
    };
  }

  if (text.includes("margin") || text.includes("profit")) {
    const margins = await identifyHighMarginItems(userId, businessId);
    return {
      category: "profit",
      answer: `You currently have ${margins.highMarginItems.length} high-margin items and ${margins.lowMarginItems.length} low-margin items. Prioritize pricing updates for low-margin products first.`,
    };
  }

  if (text.includes("combo") || text.includes("cross") || text.includes("sell")) {
    const combos = await getComboRecommendations(userId, businessId);
    const top = combos.topCombos[0];
    return {
      category: "recommendation",
      answer: top
        ? `Try promoting ${top.items.join(" + ")} as a bundle. It appears frequently together.`
        : "Not enough history for combo guidance yet.",
    };
  }

  const nextDay = await predictNextDaySales(userId, businessId);
  return {
    category: "forecast",
    answer: `Tomorrow's predicted sales are ${nextDay.predictedSales} with ${Math.round(
      nextDay.confidence * 100
    )}% confidence.`,
  };
}

async function getDecisionGuidance(userId, businessId, context = {}) {
  const [margins, forecast, anomalies] = await Promise.all([
    identifyHighMarginItems(userId, businessId),
    predictNextDaySales(userId, businessId),
    detectAnomalies(userId, businessId),
  ]);

  return {
    decision: context.decision || "inventory_planning",
    guidance: [
      `Forecast for tomorrow: ${forecast.predictedSales}`,
      `High-margin items: ${margins.highMarginItems.length}`,
      `Open risks detected: ${anomalies.length}`,
    ],
    recommendedAction:
      anomalies.length > 0
        ? "Fix anomaly before scaling spend."
        : "Increase stock for top demand items and push bundles.",
  };
}

async function getVoiceCoachingScript(userId, businessId) {
  const suggestions = await getProactiveSuggestions(userId, businessId);
  const lines = suggestions.length
    ? suggestions.map((tip, index) => `${index + 1}. ${tip.title}: ${tip.message}`)
    : ["No urgent coaching tips right now. Keep logging transactions for better recommendations."];

  return {
    script: `Business coaching update. ${lines.join(" ")}`,
    tips: suggestions,
  };
}

async function trainDemandModel(userId, businessId, options = {}) {
  const lookbackDays = Number(options.lookbackDays || 180);
  const horizonDays = Number(options.horizonDays || 7);
  const { start, end } = getDateRange(lookbackDays);

  const allTransactions = await listTransactions();
  const transactions = allTransactions.filter(
    (t) =>
      String(t.userId?._id || t.userId) === String(userId) &&
      String(t.businessId?._id || t.businessId) === String(businessId) &&
      new Date(t.createdAt) >= start &&
      new Date(t.createdAt) <= end
  );

  if (transactions.length < 20) {
    return {
      trained: false,
      reason: "Not enough training data. Add at least 20 transactions.",
      trainingRows: transactions.length,
    };
  }

  const daily = dailySeriesFromTransactions(transactions);
  const salesSeries = daily.map((row) => row.sales);
  const avgSales = getMovingAverage(salesSeries, salesSeries.length);
  const volatility = avgSales > 0 ? calculateStandardDeviation(salesSeries) / avgSales : 1;

  const basePrediction = await predictNextDaySales(userId, businessId);
  const itemForecasts = (await itemWiseDemandForecast(userId, businessId)).slice(0, 20);

  const dowMap = new Map();
  daily.forEach((row) => {
    const dow = new Date(row.day).getDay();
    const existing = dowMap.get(dow) || { sales: 0, count: 0 };
    existing.sales += row.sales;
    existing.count += 1;
    dowMap.set(dow, existing);
  });

  const base = Math.max(1, avgSales);

  for (let dayOffset = 1; dayOffset <= horizonDays; dayOffset++) {
    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + dayOffset);
    const dow = forecastDate.getDay();
    const dowEntry = dowMap.get(dow);
    const seasonalFactor = dowEntry ? (dowEntry.sales / Math.max(1, dowEntry.count)) / base : 1;

    for (const item of itemForecasts) {
      const predictedQty = Math.max(0, Math.round(Number(item.predictedQty || 0) * seasonalFactor));
      await DemandForecast.findOneAndUpdate(
        {
          userId,
          businessId,
          itemName: item.itemName,
          forecastDate: forecastDate.toDateString(),
        },
        {
          userId,
          businessId,
          itemName: item.itemName,
          forecastDate,
          predictedQty,
          confidence: basePrediction.confidence,
          method: "ml",
        },
        { upsert: true, returnDocument: "after" }
      );
    }
  }

  const k = Math.min(4, Math.max(2, Math.round(Math.sqrt(daily.length / 2))));
  const profile = await DemandModelProfile.findOneAndUpdate(
    { userId, businessId },
    {
      userId,
      businessId,
      modelName: "hybrid_kmeans_rule",
      trainedAt: new Date(),
      trainingWindowDays: lookbackDays,
      trainingRows: transactions.length,
      metrics: {
        confidence: basePrediction.confidence,
        volatility: Number(volatility.toFixed(4)),
        clusters: k,
        featuresUsed: ["dayOfWeek", "isWeekend", "sales", "txCount"],
      },
      params: {
        k,
        horizonDays,
        blendWeights: {
          regression: 0.5,
          cluster: 0.35,
          movingAvg: 0.15,
        },
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return {
    trained: true,
    modelName: profile.modelName,
    trainedAt: profile.trainedAt,
    trainingRows: transactions.length,
    confidence: basePrediction.confidence,
    horizonDays,
    seededForecastRows: itemForecasts.length * horizonDays,
  };
}

async function getDemandModelProfile(userId, businessId) {
  const profile = await DemandModelProfile.findOne({ userId, businessId }).lean();
  if (!profile) {
    return null;
  }

  return {
    modelName: profile.modelName,
    trainedAt: profile.trainedAt,
    trainingWindowDays: profile.trainingWindowDays,
    trainingRows: profile.trainingRows,
    metrics: profile.metrics || {},
    params: profile.params || {},
  };
}

// ==================== EXPORT ====================

module.exports = {
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
};
