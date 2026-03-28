const axios = require("axios");
const env = require("../config/env");
const { preprocessText } = require("../utils/normalization");

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
  { pattern: /\b(aaj|today|आज)\b/i, value: "today" },
  { pattern: /\b(kal|yesterday|कल)\b/i, value: "yesterday" },
  { pattern: /\b(pichle hafte|last week|pichla hafta|pichhle hafte|पिछले हफ्ते|पिछला हफ्ता|पिछले सप्ताह)\b/i, value: "last_week" },
  { pattern: /\b(pichle mahine|last month|pichla mahina|pichhle mahine|पिछले महीने|पिछला महीना)\b/i, value: "last_month" },
];

const TOP_PRODUCT_PATTERNS = [
  /\b(top product|sabse zyada|most sold|best selling|sabse jyada|सबसे ज्यादा|सबसे अधिक|टॉप प्रोडक्ट|सबसे बिका)\b/i,
];

const SALES_COUNT_PATTERNS = [
  /\b(transaction|transactions|entries|kitne bill|kitni sale hui|sales count|count|लेनदेन|ट्रांजैक्शन|कितने बिल|कितनी बिक्री हुई|गिनती|संख्या)\b/i,
];

const PROFIT_PATTERNS = [
  /\b(profit|fayda|faida|munafa|net|net amount|net profit|nuksan|loss|मुनाफा|फायदा|लाभ|घाटा|नुकसान|नेट प्रॉफिट)\b/i,
];

const PRODUCT_SALES_PATTERNS = [
  /\b(kitne bike|kitna bika|kitni biki|sold|bika|biki|कितने बिके|कितना बिका|कितनी बिकी|बिका|बिकी|बिके)\b/i,
];

const TOP_PRODUCT_TERMS = ["सबसे ज्यादा", "सबसे अधिक", "टॉप प्रोडक्ट", "सबसे बिका"];
const SALES_COUNT_TERMS = ["लेनदेन", "ट्रांजैक्शन", "ट्रांजेक्शन", "गिनती", "संख्या", "काउंट", "कितने ट्रांजैक्शन"];
const PROFIT_TERMS = ["प्रॉफिट", "मुनाफा", "फायदा", "लाभ", "घाटा", "नुकसान", "नेट प्रॉफिट"];
const PRODUCT_SALES_TERMS = ["कितना बिका", "कितनी बिकी", "कितने बिके", "बिका", "बिकी", "बिके"];
const TOTAL_SALES_TERMS = ["बेचा", "बिक्री", "सेल्स", "राजस्व", "कुल बिक्री", "टोटल सेल", "आज की बिक्री", "कुल"];

function containsAnyPhrase(message, terms) {
  return terms.some((term) => message.includes(term));
}

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
  if (containsAnyPhrase(message, ["आज"])) {
    return "today";
  }

  if (containsAnyPhrase(message, ["कल"])) {
    return "yesterday";
  }

  if (containsAnyPhrase(message, ["पिछले हफ्ते", "पिछला हफ्ता", "पिछले सप्ताह"])) {
    return "last_week";
  }

  if (containsAnyPhrase(message, ["पिछले महीने", "पिछला महीना"])) {
    return "last_month";
  }

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
    "आज",
    "कल",
    "पिछले",
    "पिछला",
    "हफ्ते",
    "हफ्ता",
    "सप्ताह",
    "महीने",
    "महीना",
    "कुल",
    "बिक्री",
    "सेल्स",
    "राजस्व",
    "कितना",
    "कितनी",
    "कितने",
    "मुनाफा",
    "फायदा",
    "नुकसान",
    "टॉप",
    "प्रोडक्ट",
    "लेनदेन",
    "ट्रांजैक्शन",
    "गिनती",
    "संख्या",
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
  const normalizedMessage = preprocessText(String(message || "")).trim().toLowerCase();

  if (!normalizedMessage) {
    return getUnknownIntent();
  }

  const timeRange = inferTimeRange(normalizedMessage);
  const product = extractProductFromMessage(normalizedMessage);

  if (TOP_PRODUCT_PATTERNS.some((pattern) => pattern.test(normalizedMessage)) || containsAnyPhrase(normalizedMessage, TOP_PRODUCT_TERMS)) {
    return {
      intent: "GET_TOP_PRODUCT",
      timeRange,
      product: null,
    };
  }

  if (SALES_COUNT_PATTERNS.some((pattern) => pattern.test(normalizedMessage)) || containsAnyPhrase(normalizedMessage, SALES_COUNT_TERMS)) {
    return {
      intent: "GET_SALES_COUNT",
      timeRange,
      product: null,
    };
  }

  if (PROFIT_PATTERNS.some((pattern) => pattern.test(normalizedMessage)) || containsAnyPhrase(normalizedMessage, PROFIT_TERMS)) {
    return {
      intent: "GET_PROFIT",
      timeRange,
      product: null,
    };
  }

  if ((PRODUCT_SALES_PATTERNS.some((pattern) => pattern.test(normalizedMessage)) || containsAnyPhrase(normalizedMessage, PRODUCT_SALES_TERMS)) && product) {
    return {
      intent: "GET_PRODUCT_SALES",
      timeRange,
      product,
    };
  }

  if (
    /\b(becha|bikri|sales|sale|revenue|kitna|kitni|बेचा|बिक्री|सेल्स|राजस्व|कुल)\b/i.test(normalizedMessage)
    || containsAnyPhrase(normalizedMessage, TOTAL_SALES_TERMS)
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
