const axios = require("axios");
const env = require("../config/env");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const NUMBER_WORDS = new Map([
  ["zero", 0], ["shunya", 0],
  ["one", 1], ["ek", 1], ["एक", 1],
  ["two", 2], ["do", 2], ["दो", 2],
  ["three", 3], ["teen", 3], ["तीन", 3],
  ["four", 4], ["char", 4], ["chaar", 4], ["चार", 4],
  ["five", 5], ["paanch", 5], ["पांच", 5], ["पाँच", 5],
  ["six", 6], ["cheh", 6], ["छह", 6],
  ["seven", 7], ["saat", 7], ["सात", 7],
  ["eight", 8], ["aath", 8], ["आठ", 8],
  ["nine", 9], ["nau", 9], ["नौ", 9],
  ["ten", 10], ["das", 10], ["दस", 10],
  ["twenty", 20], ["bees", 20], ["बीस", 20],
  ["thirty", 30], ["tees", 30], ["तीस", 30],
  ["forty", 40], ["chalis", 40], ["chaalis", 40], ["चालीस", 40],
  ["fifty", 50], ["pachaas", 50], ["पचास", 50],
  ["sixty", 60], ["saath", 60], ["साठ", 60],
  ["seventy", 70], ["sattar", 70], ["सत्तर", 70],
  ["eighty", 80], ["assi", 80], ["अस्सी", 80],
  ["ninety", 90], ["nabbe", 90], ["नब्बे", 90],
  ["hundred", 100], ["sau", 100], ["सो", 100], ["सौ", 100],
]);

function parseWordNumber(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return NaN;
  }

  if (NUMBER_WORDS.has(normalized)) {
    return NUMBER_WORDS.get(normalized);
  }

  const tokens = normalized.split(" ").filter(Boolean);
  if (!tokens.length || tokens.length > 3) {
    return NaN;
  }

  let total = 0;
  for (const token of tokens) {
    const numeric = NUMBER_WORDS.get(token);
    if (typeof numeric !== "number") {
      return NaN;
    }

    if (numeric === 100) {
      total = Math.max(1, total) * 100;
    } else {
      total += numeric;
    }
  }

  return total;
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = String(value || "").trim();
  if (!text) {
    return 0;
  }

  const numericText = text
    .replace(/[₹,]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const num = Number(numericText);
  if (Number.isFinite(num)) {
    return num;
  }

  const fromWords = parseWordNumber(numericText);
  if (Number.isFinite(fromWords)) {
    return fromWords;
  }

  return Number.isFinite(num) ? num : 0;
}

function parseJsonObject(rawText) {
  const text = String(rawText || "").trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    const block = text.match(/\{[\s\S]*\}/);
    if (!block) {
      return null;
    }

    try {
      return JSON.parse(block[0]);
    } catch (_) {
      return null;
    }
  }
}

function inferTypeFromText(text) {
  const value = String(text || "").toLowerCase();
  if (/बेच|bech|sold|sale|income|received|कमाया|bika|bikri/.test(value)) {
    return "credit";
  }
  return "debit";
}

function normalizeTransactions(json, transcript) {
  const list = Array.isArray(json?.transactions) ? json.transactions : [];
  const fallbackType = inferTypeFromText(transcript);

  return list
    .map((row) => {
      const typeRaw = String(row?.type || "").toLowerCase();
      const type = typeRaw === "credit" || typeRaw === "debit" ? typeRaw : fallbackType;
      let quantity = toNumber(row?.quantity);
      let price = toNumber(row?.price);
      let total = toNumber(row?.total);
      const item = String(row?.item || "").trim();
      const approx = Boolean(row?.approx) || /around|approx|लगभग|करीब|between/i.test(transcript);
      let confidence = clamp(toNumber(row?.confidence) || 0.72, 0, 1);

      if (quantity <= 0) quantity = 1;
      if (total <= 0 && quantity > 0 && price > 0) total = quantity * price;
      if (price <= 0 && total > 0 && quantity > 0) price = total / quantity;

      if (!item || price <= 0 || total <= 0) {
        confidence = Math.min(confidence, 0.58);
      }

      return {
        item: item || (type === "credit" ? "sale" : "expense"),
        quantity: Number(Math.max(1, quantity).toFixed(4)),
        price: Number(Math.max(0, price).toFixed(4)),
        total: Number(Math.max(0, total).toFixed(4)),
        type,
        confidence,
        approx,
      };
    })
    .filter((tx) => tx.total > 0 && tx.price > 0);
}

function buildGroqPrompt(transcript) {
  return [
    "Extract all financial transactions from this narration.",
    "Narration may include Hindi, Hinglish, or English and may be messy/unstructured.",
    "",
    `Text: ${transcript}`,
    "",
    "Return STRICT JSON only:",
    "{",
    '  "transactions": [',
    "    {",
    '      "item": string,',
    '      "quantity": number,',
    '      "price": number,',
    '      "total": number,',
    '      "type": "credit" | "debit",',
    '      "confidence": number,',
    '      "approx": boolean',
    "    }",
    "  ]",
    "}",
    "",
    "Rules:",
    "- Extract multiple transactions when present.",
    "- For '10 chips for 5 rupees', quantity=10, price=5, total=50.",
    "- For '10 rupees for 5 chips', quantity=5, price=10, total=50.",
    "- If values are approximate (around/about/लगभग/करीब), set approx=true.",
    "- If uncertain, set lower confidence.",
    "- Do not output prose, markdown, or explanation.",
  ].join("\n");
}

async function parseWithGroq(transcript) {
  if (!env.groqApiKey) {
    return null;
  }

  const prompt = buildGroqPrompt(transcript);

  const response = await axios.post(
    GROQ_URL,
    {
      model: env.groqModel || "llama-3.1-8b-instant",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a transaction extraction engine. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${env.groqApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return response?.data?.choices?.[0]?.message?.content || null;
}

function fallbackParse(transcript) {
  const segments = String(transcript || "")
    .split(/(?:\.|,| और | and | फिर | then )/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const tx = [];
  const globalType = inferTypeFromText(transcript);

  for (const segment of segments) {
    let type = inferTypeFromText(segment);
    if (type === "debit" && globalType === "credit") type = "credit";

    const approx = /around|approx|लगभग|करीब|between/i.test(segment);

    const qtyItemPrice = segment.match(
      /(\d+(?:\.\d+)?)\s+([\p{L}\p{M}][\p{L}\p{M}\s]{1,30}?)\s+(?:for|at|@|ke|का|की|के)\s*(\d+(?:\.\d+)?)/iu
    );

    if (qtyItemPrice) {
      const quantity = Number(qtyItemPrice[1]);
      const item = String(qtyItemPrice[2] || "").trim();
      const price = Number(qtyItemPrice[3]);

      if (quantity > 0 && price > 0 && !/^(rupees?|rs|₹|रुपये|रुपया)$/i.test(item)) {
        tx.push({ item, quantity, price, total: quantity * price, type, confidence: 0.74, approx });
        continue;
      }
    }

    const priceQtyItem = segment.match(
      /(\d+(?:\.\d+)?)\s*(?:rupees?|rs|₹|रुपये|रुपया)?\s+(?:for|ke|का|की|के)\s*(\d+(?:\.\d+)?)\s+([\p{L}\p{M}][\p{L}\p{M}\s]{1,30})/iu
    );

    if (priceQtyItem) {
      const price = Number(priceQtyItem[1]);
      const quantity = Number(priceQtyItem[2]);
      const item = String(priceQtyItem[3] || "").trim();

      if (quantity > 0 && price > 0) {
        tx.push({ item, quantity, price, total: quantity * price, type, confidence: 0.74, approx });
        continue;
      }
    }
  }

  return { transactions: tx };
}

async function parseMultipleTransactions({ transcript, rawTranscript }) {
  const input = String(rawTranscript || transcript || "").trim();
  if (!input) {
    return {
      modelUsed: "fallback",
      transactions: [],
      parserConfidence: 0,
      needsClarification: true,
      clarificationQuestion: "Please repeat the transaction clearly.",
    };
  }

  try {
    const groqRaw = await parseWithGroq(input);
    const parsed = parseJsonObject(groqRaw);
    const transactions = normalizeTransactions(parsed, input);

    if (transactions.length > 0) {
      const parserConfidence = Number(
        (
          transactions.reduce((sum, tx) => sum + Number(tx.confidence || 0), 0) /
          transactions.length
        ).toFixed(4)
      );

      return {
        modelUsed: "groq",
        transactions,
        parserConfidence,
        needsClarification: parserConfidence < 0.7,
        clarificationQuestion: null,
      };
    }
  } catch (_) {
    // Fall through to deterministic parser.
  }

  const fallback = fallbackParse(input);
  const transactions = normalizeTransactions(fallback, input);
  const parserConfidence = transactions.length
    ? Number(
      (
        transactions.reduce((sum, tx) => sum + Number(tx.confidence || 0), 0) /
        transactions.length
      ).toFixed(4)
    )
    : 0;

  return {
    modelUsed: "fallback",
    transactions,
    parserConfidence,
    needsClarification: parserConfidence < 0.7,
    clarificationQuestion: transactions.length
      ? null
      : "I could not decode this narration. Please repeat with item and amount.",
  };
}

module.exports = {
  parseMultipleTransactions,
};