function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeTransactionConfidence(entry) {
  const base = Number(entry?.confidence || 0.6);
  const hasItem = Boolean(String(entry?.item || "").trim());
  const hasPrice = Number(entry?.price || 0) > 0;
  const hasTotal = Number(entry?.total || 0) > 0;
  const hasQuantity = Number(entry?.quantity || 0) > 0;
  const approxPenalty = entry?.approx ? 0.08 : 0;

  let score = base;
  if (!hasItem) score -= 0.15;
  if (!hasPrice) score -= 0.12;
  if (!hasTotal) score -= 0.12;
  if (!hasQuantity) score -= 0.08;
  score -= approxPenalty;

  return clamp(Number(score.toFixed(4)), 0, 1);
}

function evaluateExtractionConfidence(transactions) {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const withScores = safeTransactions.map((entry) => {
    const finalConfidence = computeTransactionConfidence(entry);
    return {
      ...entry,
      confidence: finalConfidence,
    };
  });

  const overall = withScores.length
    ? withScores.reduce((sum, tx) => sum + tx.confidence, 0) / withScores.length
    : 0;

  const lowConfidence = withScores.filter((tx) => tx.confidence < 0.7);
  const requiresConfirmation = overall < 0.7 || lowConfidence.length > 0;

  return {
    transactions: withScores,
    overallConfidence: Number(overall.toFixed(4)),
    requiresConfirmation,
    lowConfidenceCount: lowConfidence.length,
  };
}

function buildConfirmationText(transactions) {
  const lines = ["🤔 I detected:"];

  transactions.forEach((tx) => {
    const amount = Number(tx.total || 0);
    lines.push(`- ${tx.item} ${tx.type === "credit" ? "sale" : "expense"} ₹${amount}`);
  });

  lines.push("", "Confirm?");
  return lines.join("\n");
}

module.exports = {
  evaluateExtractionConfidence,
  buildConfirmationText,
};
