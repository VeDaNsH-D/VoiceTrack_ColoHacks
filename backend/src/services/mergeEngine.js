function toRupee(value) {
  const amount = Number(value || 0);
  return `\u20b9${Math.round(amount).toLocaleString("en-IN")}`;
}

function pickPeakHour(dashboardData, heatmapData) {
  if (Number.isFinite(Number(dashboardData?.peakHour?.hour))) {
    return `${String(dashboardData.peakHour.hour).padStart(2, "0")}:00`;
  }

  const timeTrends = Array.isArray(dashboardData?.timeBasedSalesTrends)
    ? dashboardData.timeBasedSalesTrends
    : [];

  if (timeTrends.length) {
    const peak = timeTrends
      .filter((entry) => Number(entry?.avgSalesCount || 0) > 0)
      .sort((a, b) => Number(b.avgSalesCount || 0) - Number(a.avgSalesCount || 0))[0];

    if (peak && Number.isFinite(Number(peak.hour))) {
      return `${String(peak.hour).padStart(2, "0")}:00`;
    }
  }

  const heatTrends = Array.isArray(heatmapData?.trends) ? heatmapData.trends : [];
  const upTrend = heatTrends.find((entry) => String(entry?.trend || "").toLowerCase() === "up");
  if (upTrend?.category) {
    return String(upTrend.category);
  }

  return "";
}

function buildTransactionConfirmation(transactionData) {
  if (!transactionData || typeof transactionData !== "object") {
    return "";
  }

  const sales = Array.isArray(transactionData.sales) ? transactionData.sales : [];
  const expenses = Array.isArray(transactionData.expenses) ? transactionData.expenses : [];

  if (sales.length) {
    const sale = sales[0] || {};
    const qty = Number(sale.qty || 0);
    const item = String(sale.item || "item").trim();
    return `${qty} ${item} record ho gaya`;
  }

  if (expenses.length) {
    const expense = expenses[0] || {};
    const item = String(expense.item || "expense").trim();
    const amount = Number(expense.amount || 0);
    return `${item} ka ${toRupee(amount)} expense record ho gaya`;
  }

  return "Transaction note kar liya";
}

function buildDashboardState(dashboardData) {
  const profit = Number(dashboardData?.totals?.profit || 0);
  const topItem = String(
    dashboardData?.topItem?.item || dashboardData?.topSellingItems?.[0]?.item || ""
  ).trim();

  const parts = [];
  parts.push(`aaj ${toRupee(profit)} ${profit >= 0 ? "profit" : "loss"} hai`);

  if (topItem) {
    parts.push(`${topItem} top item hai`);
  }

  return parts.join(" aur ");
}

function buildDashboardHighlight(dashboardData) {
  const topItem = String(
    dashboardData?.topItem?.item || dashboardData?.topSellingItems?.[0]?.item || ""
  ).trim();
  if (topItem) {
    return `${topItem} top item hai`;
  }
  return "business stable chal raha hai";
}

function buildOptionalInsight(insightData, dashboardData, heatmapData) {
  const explicitInsight = String(insightData || "").trim();
  if (explicitInsight) {
    return explicitInsight;
  }

  const peakHour = pickPeakHour(dashboardData, heatmapData);
  if (peakHour) {
    return `${peakHour} ke around demand zyada hai`;
  }

  return "";
}

function compressForVoice(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .trim();
}

function isProfitQuery(queryText) {
  const query = String(queryText || "").toLowerCase();
  return /(profit|fayda|faida|munafa|loss|nuksan|ghata|नेट|लाभ|घाटा|नुकसान)/i.test(query);
}

function buildResponse(intent, data, queryText = "") {
  const transactionData = data?.transactionData || null;
  const dashboardData = data?.dashboardData || {};
  const heatmapData = data?.heatmapData || {};
  const insightData = data?.insightData || "";

  const segments = [];

  if (intent === "transaction") {
    segments.push(buildTransactionConfirmation(transactionData));
  }

  if (isProfitQuery(queryText)) {
    const profit = Number(dashboardData?.totals?.profit || 0);
    const signWord = profit >= 0 ? "profit" : "loss";
    segments.push(`aaj ka ${signWord} ${toRupee(Math.abs(profit))} hai`);
    segments.push(buildDashboardHighlight(dashboardData));
  } else {
    segments.push(buildDashboardState(dashboardData));
  }

  const optionalInsight = buildOptionalInsight(insightData, dashboardData, heatmapData);
  if (optionalInsight) {
    segments.push(optionalInsight);
  }

  return compressForVoice(segments.filter(Boolean).join(", "));
}

module.exports = {
  buildResponse,
};
