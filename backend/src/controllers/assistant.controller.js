const { extractIntent } = require("../services/intentService");
const { handleQuery } = require("../services/queryService");
const { generateResponse } = require("../services/responseService");
const { getRelevantContext } = require("../services/vectorService");
const { preprocessText } = require("../utils/normalization");
const { sendSuccess, sendError } = require("../utils/apiResponse");

function isHindiLike(text) {
  const input = String(text || "");
  return /[\u0900-\u0D7F]/.test(input) || /\b(aaj|kal|kitna|kitni|bikri|fayda|nuksan|sabse|sales|profit|transaction|top)\b/i.test(input);
}

function detectReplyLanguage(text) {
  return /[\u0900-\u097F]/.test(String(text || "")) ? "hi" : "en";
}

function normalizeForIntent(message) {
  const rawMessage = String(message || "").trim();
  if (!rawMessage) {
    return "";
  }

  const normalized = preprocessText(rawMessage);
  return normalized || rawMessage.toLowerCase();
}

function formatRupee(value) {
  const amount = Number(value || 0);
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function buildClarification(language) {
  if (language === "hi") {
    return "मैं समझ नहीं पाया। क्या आप कुल बिक्री, प्रॉफिट, किसी आइटम की बिक्री, टॉप प्रोडक्ट, या ट्रांजैक्शन काउंट के बारे में पूछना चाहते हैं?";
  }

  return "I could not understand that clearly. Please ask about total sales, profit, product sales, top product, or transaction count.";
}

function buildGroundedReply(queryResult, language) {
  const hindi = language === "hi";
  const type = queryResult?.type;

  if (type === "total_sales") {
    return hindi
      ? `${formatRupee(queryResult?.value)} ki total bikri mili.`
      : `Your total sales are ${formatRupee(queryResult?.value)}.`;
  }

  if (type === "next_day_sales") {
    const trend = String(queryResult?.trend || "flat").toLowerCase();
    const trendText = trend === "up"
      ? (hindi ? "trend up dikh raha hai" : "trend looks up")
      : trend === "down"
        ? (hindi ? "trend thoda down hai" : "trend looks slightly down")
        : (hindi ? "trend stable hai" : "trend looks stable");

    return hindi
      ? `Agle din ki sales approx ${formatRupee(queryResult?.value)} ho sakti hai, ${trendText}.`
      : `Next day sales may be around ${formatRupee(queryResult?.value)}, ${trendText}.`;
  }

  if (type === "product_sales") {
    const qty = Number(queryResult?.quantity || 0);
    const amount = Number(queryResult?.amount || 0);
    const product = queryResult?.product || (hindi ? "is item" : "that item");
    return hindi
      ? `${product} ki ${qty} quantity biki, total ${formatRupee(amount)}.`
      : `${qty} units of ${product} were sold, total ${formatRupee(amount)}.`;
  }

  if (type === "top_product") {
    if (!queryResult?.product) {
      return hindi
        ? "Abhi top product nikalne ke liye data kam hai."
        : "There is not enough data yet to identify a top product.";
    }

    return hindi
      ? `${queryResult.product} sabse zyada bika, quantity ${Number(queryResult?.quantity || 0)}.`
      : `${queryResult.product} is your top product with ${Number(queryResult?.quantity || 0)} units sold.`;
  }

  if (type === "sales_count") {
    return hindi
      ? `Aapke ${Number(queryResult?.value || 0)} transactions mile.`
      : `You have ${Number(queryResult?.value || 0)} transactions.`;
  }

  if (type === "profit") {
    const profit = Number(queryResult?.value || 0);

    if (profit >= 0) {
      return hindi
        ? `Aapka net fayda ${formatRupee(profit)} hai.`
        : `Your net profit is ${formatRupee(profit)}.`;
    }

    return hindi
      ? `Aapka net nuksan ${formatRupee(Math.abs(profit))} hai.`
      : `Your net loss is ${formatRupee(Math.abs(profit))}.`;
  }

  return buildClarification(language);
}

async function queryAssistant(req, res) {
  const { userId, message } = req.body || {};

  if (typeof userId !== "string" || !userId.trim()) {
    return sendError(res, "userId is required", 400, { code: "INVALID_USER_ID" });
  }

  if (typeof message !== "string" || !message.trim()) {
    return sendError(res, "message is required", 400, { code: "INVALID_MESSAGE" });
  }

  try {
    const rawMessage = message.trim();
    const replyLanguage = detectReplyLanguage(rawMessage);
    const normalizedMessage = normalizeForIntent(rawMessage);
    const intent = await extractIntent(normalizedMessage || rawMessage);
    const queryResult = await handleQuery(userId.trim(), intent);
    const isUnknown = queryResult?.type === "unknown";
    const clarificationQuestion = isUnknown ? buildClarification(replyLanguage) : null;
    const contextDocs = isUnknown
      ? []
      : await getRelevantContext(userId.trim(), rawMessage);
    const response = isUnknown
      ? { reply: clarificationQuestion, audioNeeded: true }
      : await generateResponse(rawMessage, queryResult, contextDocs.join("\n"), replyLanguage);

    return sendSuccess(res, {
      intent,
      queryResult,
      contextDocs,
      reply: response?.reply || buildGroundedReply(queryResult, replyLanguage),
      audioNeeded: true,
      needsClarification: isUnknown,
      clarificationQuestion,
    }, "Assistant response generated");
  } catch (error) {
    console.error("Assistant query failed", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    return sendError(res, "Something went wrong", 500, {
      code: "ASSISTANT_QUERY_FAILED",
    });
  }
}

module.exports = {
  queryAssistant,
};
