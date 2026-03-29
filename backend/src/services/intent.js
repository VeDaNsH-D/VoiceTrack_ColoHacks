const { extractIntent } = require("./intentService");

function detectIntentByRules(text) {
  const input = String(text || "").trim().toLowerCase();

  if (!input) {
    return "chat";
  }

  if (/\d/.test(input)) {
    return "transaction";
  }

  if (/(profit|today|total)/i.test(input)) {
    return "dashboard";
  }

  if (/(trend|peak|time)/i.test(input)) {
    return "heatmap";
  }

  if (/(improve|suggest)/i.test(input)) {
    return "insight";
  }

  return "chat";
}

function mapLlmIntent(intentPayload, text) {
  const normalizedIntent = String(intentPayload?.intent || "UNKNOWN").toUpperCase();
  const input = String(text || "").toLowerCase();

  if (normalizedIntent === "GET_PROFIT" || normalizedIntent === "GET_TOTAL_SALES" || normalizedIntent === "GET_SALES_COUNT") {
    return "dashboard";
  }

  if (normalizedIntent === "GET_PRODUCT_SALES") {
    return /\d/.test(input) ? "transaction" : "dashboard";
  }

  if (normalizedIntent === "GET_TOP_PRODUCT") {
    if (/(trend|peak|time|hour|timing)/i.test(input)) {
      return "heatmap";
    }
    return "dashboard";
  }

  if (/(trend|peak|time|hour|timing)/i.test(input)) {
    return "heatmap";
  }

  if (/(improve|suggest|advice|recommend)/i.test(input)) {
    return "insight";
  }

  return detectIntentByRules(input);
}

async function detectIntent(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) {
    return "chat";
  }

  try {
    const llmIntent = await extractIntent(cleaned);
    return mapLlmIntent(llmIntent, cleaned);
  } catch (error) {
    return detectIntentByRules(cleaned);
  }
}

module.exports = {
  detectIntent,
};
