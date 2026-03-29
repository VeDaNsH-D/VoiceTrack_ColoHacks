const { listTransactions } = require("./transaction.store");

const RAW_MATERIAL_HINTS = new Set(["milk", "doodh", "tea", "chai", "sugar", "oil", "gas"]);

function normalizeItemName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatDay(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function formatHour(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return 0;
  }
  return date.getHours();
}

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getAverage(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildComboSuggestions(itemPairCounter) {
  return Array.from(itemPairCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pair, count]) => {
      const [left, right] = pair.split("|");
      return {
        combo: [left, right],
        confidence: Math.min(0.95, Number((0.5 + count * 0.1).toFixed(2))),
        reason: `Seen together ${count} times in recent sales.`,
      };
    });
}

function normalizeId(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

async function getInsightsSummary(scope = null) {
  const allTransactions = await listTransactions();
  const normalizedUserId = normalizeId(
    typeof scope === "string" ? scope : scope?.userId
  );
  const normalizedBusinessId = normalizeId(
    typeof scope === "string" ? "" : scope?.businessId
  );

  const resolveEntryIds = (transaction) => ({
    entryUserId: transaction.userId
      ? String(transaction.userId._id || transaction.userId)
      : "",
    entryBusinessId: transaction.businessId
      ? String(transaction.businessId._id || transaction.businessId)
      : "",
  });

  let transactions = allTransactions;
  if (normalizedBusinessId) {
    transactions = allTransactions.filter((transaction) => {
      const { entryBusinessId } = resolveEntryIds(transaction);
      return entryBusinessId === normalizedBusinessId;
    });

    // Backward compatibility: older entries may not have businessId populated.
    if (!transactions.length && normalizedUserId) {
      transactions = allTransactions.filter((transaction) => {
        const { entryUserId } = resolveEntryIds(transaction);
        return entryUserId === normalizedUserId;
      });
    }
  } else if (normalizedUserId) {
    transactions = allTransactions.filter((transaction) => {
      const { entryUserId } = resolveEntryIds(transaction);
      return entryUserId === normalizedUserId;
    });
  }

  const dailyLedgerMap = new Map();
  const itemStatsMap = new Map();
  const hourStatsMap = new Map();
  const rawMaterialMap = new Map();
  const itemPairCounter = new Map();
  let lowConfidenceCount = 0;

  const totals = transactions.reduce((accumulator, transaction) => {
    const dayKey = formatDay(transaction.createdAt || transaction.updatedAt);
    const hourKey = formatHour(transaction.createdAt || transaction.updatedAt);

    const daily = dailyLedgerMap.get(dayKey) || {
      date: dayKey,
      sales: 0,
      expenses: 0,
      profit: 0,
      transactionCount: 0,
    };
    const hourly = hourStatsMap.get(hourKey) || {
      hour: hourKey,
      sales: 0,
      quantity: 0,
      transactionCount: 0,
    };

    const soldItemsInTransaction = [];

    for (const sale of transaction.sales || []) {
      const qty = safeNumber(sale.qty);
      const price = safeNumber(sale.price);
      const item = normalizeItemName(sale.item);
      const revenue = qty * price;

      accumulator.sales += revenue;
      daily.sales += revenue;
      hourly.sales += revenue;
      hourly.quantity += qty;

      if (!item) {
        continue;
      }

      soldItemsInTransaction.push(item);
      const itemStats = itemStatsMap.get(item) || {
        item,
        quantity: 0,
        revenue: 0,
        occurrences: 0,
      };
      itemStats.quantity += qty;
      itemStats.revenue += revenue;
      itemStats.occurrences += 1;
      itemStatsMap.set(item, itemStats);
    }

    for (const expense of transaction.expenses || []) {
      const amount = safeNumber(expense.amount);
      const item = normalizeItemName(expense.item);

      accumulator.expenses += amount;
      daily.expenses += amount;

      if (item && RAW_MATERIAL_HINTS.has(item)) {
        const material = rawMaterialMap.get(item) || { item, spend: 0, usageEstimate: 0 };
        material.spend += amount;
        material.usageEstimate += amount;
        rawMaterialMap.set(item, material);
      }
    }

    for (let i = 0; i < soldItemsInTransaction.length; i += 1) {
      for (let j = i + 1; j < soldItemsInTransaction.length; j += 1) {
        const left = soldItemsInTransaction[i];
        const right = soldItemsInTransaction[j];
        if (!left || !right || left === right) {
          continue;
        }
        const key = [left, right].sort().join("|");
        itemPairCounter.set(key, (itemPairCounter.get(key) || 0) + 1);
      }
    }

    if (safeNumber(transaction.meta?.confidence) < 0.55) {
      lowConfidenceCount += 1;
    }

    daily.transactionCount += 1;
    daily.profit = daily.sales - daily.expenses;
    hourly.transactionCount += 1;
    dailyLedgerMap.set(dayKey, daily);
    hourStatsMap.set(hourKey, hourly);

    return accumulator;
  }, { sales: 0, expenses: 0 });

  const dailyLedger = Array.from(dailyLedgerMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const topSellingItems = Array.from(itemStatsMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);
  const lowPerformingItems = Array.from(itemStatsMap.values())
    .filter((entry) => entry.quantity > 0)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);
  const hourlyTrends = Array.from(hourStatsMap.values()).sort((a, b) => a.hour - b.hour);
  const rawMaterialTracking = Array.from(rawMaterialMap.values()).sort(
    (a, b) => b.spend - a.spend
  );
  const comboSuggestions = buildComboSuggestions(itemPairCounter);

  const profit = totals.sales - totals.expenses;
  const dailyProfits = dailyLedger.map((entry) => entry.profit);
  const rollingAverageProfit = getAverage(dailyProfits.slice(-7));
  const forecast = {
    nextDaySales: Number(Math.max(0, getAverage(dailyLedger.slice(-7).map((d) => d.sales))).toFixed(2)),
    nextDayProfit: Number(Math.max(0, rollingAverageProfit).toFixed(2)),
    trend: dailyLedger.length >= 2
      ? dailyLedger[dailyLedger.length - 1].profit >= dailyLedger[dailyLedger.length - 2].profit
        ? "up"
        : "down"
      : "flat",
  };

  const previousDay = dailyLedger.length >= 2 ? dailyLedger[dailyLedger.length - 2] : null;
  const latestDay = dailyLedger.length ? dailyLedger[dailyLedger.length - 1] : null;
  const suddenDrop =
    previousDay && latestDay
      ? previousDay.sales > 0 && latestDay.sales / previousDay.sales < 0.6
      : false;

  const anomalies = {
    suddenSalesDrop: suddenDrop,
    unusualExpense: dailyLedger.some((entry) => entry.expenses > getAverage(dailyLedger.map((d) => d.expenses)) * 1.8),
    missingData: transactions.some(
      (entry) => (entry.sales?.length || 0) + (entry.expenses?.length || 0) === 0
    ),
    performanceDeviation: Math.abs((latestDay?.profit || 0) - rollingAverageProfit) > Math.abs(rollingAverageProfit) * 0.5,
  };

  const insightCards = [
    {
      type: "profit",
      title: "Daily profit trend",
      message:
        profit >= 0
          ? `You are profitable by Rs ${Math.round(profit).toLocaleString("en-IN")}.`
          : `Expenses exceed sales by Rs ${Math.round(Math.abs(profit)).toLocaleString("en-IN")}.`,
    },
    {
      type: "forecast",
      title: "Tomorrow expectation",
      message: `Projected next-day sales are Rs ${Math.round(forecast.nextDaySales).toLocaleString("en-IN")}.`,
    },
    {
      type: "quality",
      title: "Capture confidence",
      message:
        lowConfidenceCount > 0
          ? `${lowConfidenceCount} entries need clarification to improve ledger quality.`
          : "Recent entries look consistent and high confidence.",
    },
  ];

  return {
    totals: {
      sales: Number(totals.sales.toFixed(2)),
      expenses: Number(totals.expenses.toFixed(2)),
      profit: Number(profit.toFixed(2)),
    },
    transactionCount: transactions.length,
    lowConfidenceCount,
    dailyLedger,
    topSellingItems,
    lowPerformingItems,
    itemFrequency: topSellingItems.map((entry) => ({ item: entry.item, count: entry.occurrences })),
    timeBasedSalesTrends: hourlyTrends,
    inventory: {
      rawMaterialTracking,
      lowStockAlerts: rawMaterialTracking
        .filter((entry) => entry.spend > getAverage(rawMaterialTracking.map((v) => v.spend)) * 1.5)
        .map((entry) => ({ item: entry.item, severity: "high" })),
      nextDaySuggestions: rawMaterialTracking.slice(0, 4).map((entry) => ({
        item: entry.item,
        recommendation: `Keep stock worth around Rs ${Math.round(entry.spend / Math.max(1, dailyLedger.length)).toLocaleString("en-IN")}`,
      })),
    },
    forecast,
    combos: comboSuggestions,
    anomalies,
    insightCards,
    suggestions: {
      pricing: topSellingItems.slice(0, 3).map((entry) => ({
        item: entry.item,
        hint: `Consider testing +Rs 1 on ${entry.item} during peak hours.`,
      })),
      crossSell: comboSuggestions,
      businessTips: [
        "Capture expenses in real-time to improve daily profit accuracy.",
        "Review low-confidence entries and confirm quantity/price.",
      ],
      proactiveNudges: anomalies.suddenSalesDrop
        ? ["Sales dropped sharply compared to yesterday. Run a combo offer in evening hours."]
        : ["Steady demand detected. Keep top 3 items prepared before peak time."],
    },
  };
}

module.exports = {
  getInsightsSummary,
};
