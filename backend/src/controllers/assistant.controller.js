const { extractIntent } = require("../services/intentService");
const { handleQuery } = require("../services/queryService");
const { generateResponse } = require("../services/responseService");
const { getRelevantContext } = require("../services/vectorService");

function isHindiLike(text) {
  const input = String(text || "");
  return /[\u0900-\u097F]/.test(input) || /\b(aaj|kal|kitna|kitni|bikri|fayda|nuksan|sabse)\b/i.test(input);
}

function formatRupee(value) {
  const amount = Number(value || 0);
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function buildClarification(message) {
  if (isHindiLike(message)) {
    return "Main samjha nahi. Kya aap total sales, kisi item ki sales, top product, ya transaction count ke baare mein puchhna chahte hain?";
  }

  return "I could not understand that clearly. Please ask about total sales, product sales, top product, or transaction count.";
}

function buildGroundedReply(message, queryResult) {
  const hindi = isHindiLike(message);
  const type = queryResult?.type;

  if (type === "total_sales") {
    return hindi
      ? `${formatRupee(queryResult?.value)} ki total bikri mili.`
      : `Your total sales are ${formatRupee(queryResult?.value)}.`;
  }

  if (type === "product_sales") {
    const qty = Number(queryResult?.quantity || 0);
    const product = queryResult?.product || (hindi ? "is item" : "that item");
    return hindi
      ? `${product} ki ${qty} quantity biki.`
      : `${qty} units of ${product} were sold.`;
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

  return buildClarification(message);
}

async function queryAssistant(req, res) {
  const { userId, message } = req.body || {};

  if (typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({
      error: {
        message: "userId is required",
        code: "INVALID_USER_ID",
      },
    });
  }

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: {
        message: "message is required",
        code: "INVALID_MESSAGE",
      },
    });
  }

  try {
    const intent = await extractIntent(message);
    const queryResult = await handleQuery(userId.trim(), intent);
    const isUnknown = queryResult?.type === "unknown";
    const clarificationQuestion = isUnknown ? buildClarification(message) : null;
    const contextDocs = isUnknown
      ? []
      : await getRelevantContext(userId.trim(), message);
    const response = isUnknown
      ? { reply: clarificationQuestion, audioNeeded: true }
      : await generateResponse(message, queryResult, contextDocs.join("\n"));

    return res.status(200).json({
      intent,
      queryResult,
      contextDocs,
      reply: response?.reply || buildGroundedReply(message, queryResult),
      audioNeeded: true,
      needsClarification: isUnknown,
      clarificationQuestion,
    });
  } catch (error) {
    console.error("Assistant query failed", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    return res.status(500).json({
      error: {
        message: "Something went wrong",
        code: "ASSISTANT_QUERY_FAILED",
      },
    });
  }
}

module.exports = {
  queryAssistant,
};
