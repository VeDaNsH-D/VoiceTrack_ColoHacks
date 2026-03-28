const axios = require("axios");
const env = require("../config/env");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama3-8b-8192";

const systemPrompt = `You are an AI that extracts structured intent from user queries.

The user is a small business vendor asking about their sales.

Return ONLY JSON. No explanation.

Understand Hindi, English, and Hinglish.`;

const ALLOWED_INTENTS = new Set([
  "GET_TOTAL_SALES",
  "GET_PRODUCT_SALES",
  "GET_TOP_PRODUCT",
  "GET_SALES_COUNT",
  "GET_PROFIT",
  "UNKNOWN",
]);

const ALLOWED_TIME_RANGES = new Set([
  "today",
  "yesterday",
  "last_week",
  "last_month",
  "custom",
  null,
]);

const TIME_RANGE_PATTERNS = [
  { pattern: /\b(aaj|today)\b/i, value: "today" },
  { pattern: /\b(kal|yesterday)\b/i, value: "yesterday" },
  { pattern: /\b(pichle hafte|last week|pichla hafta|pichhle hafte)\b/i, value: "last_week" },
  { pattern: /\b(pichle mahine|last month|pichla mahina|pichhle mahine)\b/i, value: "last_month" },
];

const TOP_PRODUCT_PATTERNS = [
  /\b(top product|sabse zyada|most sold|best selling|sabse jyada)\b/i,
];

const SALES_COUNT_PATTERNS = [
  /\b(transaction|transactions|entries|kitne bill|kitni sale hui|sales count|count)\b/i,
];

const PROFIT_PATTERNS = [
  /\b(profit|fayda|faida|munafa|net|net amount|net profit|nuksan|loss)\b/i,
];

const PRODUCT_SALES_PATTERNS = [
  /\b(kitne bike|kitna bika|kitni biki|sold|bika|biki)\b/i,
];

function getUnknownIntent() {
  return {
    intent: "UNKNOWN",
    timeRange: null,
    product: null,
  };
}

function extractJsonObject(rawContent) {
  const trimmedContent = String(rawContent || "").trim();

  if (!trimmedContent) {
    return "";
  }

  const withoutCodeFence = trimmedContent
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const directObjectMatch = withoutCodeFence.match(/\{[\s\S]*\}/);
  return directObjectMatch ? directObjectMatch[0] : withoutCodeFence;
}

function normalizeIntentPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return getUnknownIntent();
  }

  const normalizedIntent = ALLOWED_INTENTS.has(payload.intent)
    ? payload.intent
    : "UNKNOWN";

  const normalizedTimeRange = ALLOWED_TIME_RANGES.has(payload.timeRange)
    ? payload.timeRange
    : null;

  const normalizedProduct =
    typeof payload.product === "string" && payload.product.trim()
      ? payload.product.trim().toLowerCase()
      : null;

  return {
    intent: normalizedIntent,
    timeRange: normalizedTimeRange,
    product: normalizedProduct,
  };
}

function parseIntentResponse(rawContent) {
  try {
    const jsonContent = extractJsonObject(rawContent);
    const parsed = JSON.parse(jsonContent);
    return normalizeIntentPayload(parsed);
  } catch (error) {
    return getUnknownIntent();
  }
}

function inferTimeRange(message) {
  for (const rule of TIME_RANGE_PATTERNS) {
    if (rule.pattern.test(message)) {
      return rule.value;
    }
  }

  return null;
}

function extractProductFromMessage(message) {
  const normalizedMessage = String(message || "")
    .toLowerCase()
    .replace(/[?.!,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedMessage) {
    return null;
  }

  const stopWords = new Set([
    "aaj",
    "kal",
    "pichle",
    "pichhle",
    "hafte",
    "hafta",
    "mahine",
    "mahina",
    "ka",
    "ki",
    "kitna",
    "kitni",
    "kitne",
    "becha",
    "bike",
    "bika",
    "biki",
    "hua",
    "hui",
    "hui",
    "total",
    "sales",
    "sale",
    "revenue",
    "kya",
    "tha",
    "the",
    "hai",
    "today",
    "yesterday",
    "last",
    "week",
    "month",
    "count",
    "transactions",
    "transaction",
    "top",
    "product",
    "sabse",
    "zyada",
    "jyada",
  ]);

  const words = normalizedMessage
    .split(" ")
    .filter((word) => word && !stopWords.has(word));

  if (!words.length) {
    return null;
  }

  return words.join(" ");
}

function inferIntentFromRules(message) {
  const normalizedMessage = String(message || "").trim().toLowerCase();

  if (!normalizedMessage) {
    return getUnknownIntent();
  }

  const timeRange = inferTimeRange(normalizedMessage);
  const product = extractProductFromMessage(normalizedMessage);

  if (TOP_PRODUCT_PATTERNS.some((pattern) => pattern.test(normalizedMessage))) {
    return {
      intent: "GET_TOP_PRODUCT",
      timeRange,
      product: null,
    };
  }

  if (SALES_COUNT_PATTERNS.some((pattern) => pattern.test(normalizedMessage))) {
    return {
      intent: "GET_SALES_COUNT",
      timeRange,
      product: null,
    };
  }

  if (PROFIT_PATTERNS.some((pattern) => pattern.test(normalizedMessage))) {
    return {
      intent: "GET_PROFIT",
      timeRange,
      product: null,
    };
  }

  if (PRODUCT_SALES_PATTERNS.some((pattern) => pattern.test(normalizedMessage)) && product) {
    return {
      intent: "GET_PRODUCT_SALES",
      timeRange,
      product,
    };
  }

  if (
    /\b(becha|bikri|sales|sale|revenue|kitna|kitni)\b/i.test(normalizedMessage)
  ) {
    return {
      intent: "GET_TOTAL_SALES",
      timeRange,
      product: null,
    };
  }

  return getUnknownIntent();
}

async function extractIntent(message) {
  const cleanedMessage = typeof message === "string" ? message.trim() : "";

  if (!cleanedMessage) {
    return getUnknownIntent();
  }

  if (!env.groqApiKey) {
    const error = new Error("GROQ_API_KEY is not configured");
    error.statusCode = 500;
    error.code = "GROQ_API_KEY_MISSING";
    throw error;
  }

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: GROQ_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: cleanedMessage },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${env.groqApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const rawContent = response?.data?.choices?.[0]?.message?.content;
    const parsedIntent = parseIntentResponse(rawContent);

    if (parsedIntent.intent !== "UNKNOWN") {
      return parsedIntent;
    }

    return inferIntentFromRules(cleanedMessage);
  } catch (error) {
    return inferIntentFromRules(cleanedMessage);
  }
}

module.exports = {
  extractIntent,
  parseIntentResponse,
  inferIntentFromRules,
  systemPrompt,
};
