const env = require("../config/env");
const { preprocessText } = require("../utils/normalization");
const { validateOutput } = require("./validation.service");

function detectResponseLanguage(text) {
  const input = String(text || "");

  if (/[\u0900-\u097F]/.test(input)) {
    return "marathi";
  }

  if (/\b(aaj|chai|samosa|doodh|liya|aur|ka|matlab|bhai|haan)\b/i.test(input)) {
    return "hinglish";
  }

  return "english";
}

function getClarificationMessage(language) {
  if (language === "marathi") {
    return "कृपया व्यवहार थोडा स्पष्ट सांगाल का? कोणती वस्तू, किती प्रमाण, आणि किती रक्कम होती ते कृपया सांगा.";
  }

  if (language === "hinglish") {
    return "Kripya transaction thoda clearly batayiye. Kaunsi item thi, kitni quantity thi, aur kitna amount tha?";
  }

  return "Could you please restate the transaction clearly with item, quantity, price, and expense amount?";
}

function makeRespectfulClarification(question, language) {
  const fallback = getClarificationMessage(language);
  const value = String(question || "").trim();

  if (!value) {
    return fallback;
  }

  if (language === "marathi") {
    if (/^0 .*काय मतलब/i.test(value) || /^0 .*काय/i.test(value)) {
      return "कृपया सांगाल का, येथे प्रमाण 0 आहे का, की काही वेगळा अर्थ अभिप्रेत आहे?";
    }

    return value;
  }

  if (language === "hinglish") {
    if (/^0 .*kya matlab/i.test(value) || /\bkya matlab hai\?/i.test(value)) {
      return "Kripya batayiye, yahan quantity 0 hai ya aapka kuch aur matlab tha?";
    }

    if (!/kripya|please|kindly/i.test(value)) {
      return `Kripya batayiye, ${value.charAt(0).toLowerCase()}${value.slice(1)}`;
    }

    return value;
  }

  if (/^0 .*what does/i.test(value)) {
    return "Could you please clarify whether the quantity is 0 here, or whether you meant something else?";
  }

  if (!/please|could you|kindly/i.test(value)) {
    return `Could you please clarify: ${value.charAt(0).toLowerCase()}${value.slice(1)}`;
  }

  return value;
}

function createEmptyResponse(language, llmError = null) {
  return {
    sales: [],
    expenses: [],
    meta: {
      confidence: 0.1,
      source: "fallback",
      needs_clarification: true,
      clarification_question: getClarificationMessage(language),
    },
    debug: {
      llm_attempted: false,
      llm_succeeded: false,
      llm_used_live_response: false,
      llm_error: llmError,
    },
  };
}

function mergeDuplicates(data) {
  const salesMap = new Map();
  const expensesMap = new Map();

  for (const sale of data.sales || []) {
    const key = `${sale.item}:${sale.price}`;
    const existing = salesMap.get(key);
    if (existing) {
      existing.qty += sale.qty;
    } else {
      salesMap.set(key, { ...sale });
    }
  }

  for (const expense of data.expenses || []) {
    const existing = expensesMap.get(expense.item);
    if (existing) {
      existing.amount += expense.amount;
    } else {
      expensesMap.set(expense.item, { ...expense });
    }
  }

  return {
    ...data,
    sales: Array.from(salesMap.values()),
    expenses: Array.from(expensesMap.values()),
  };
}

function reconcileExplicitPrices(text, data) {
  const explicitSales = [];
  const regex = /(\d+)\s*([a-z]+)\s*(\d+)(?:\s*ka)?/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    explicitSales.push({
      qty: Number(match[1]),
      item: match[2].trim(),
      price: Number(match[3]),
    });
  }

  if (!explicitSales.length) {
    return data;
  }

  const reconciledSales = (data.sales || []).map((sale) => {
    const explicitMatch = explicitSales.find(
      (entry) => entry.item === sale.item && entry.qty === sale.qty
    );

    if (!explicitMatch) {
      return sale;
    }

    return {
      ...sale,
      price: explicitMatch.price,
    };
  });

  return {
    ...data,
    sales: reconciledSales,
  };
}

function detectAmbiguity(text, data) {
  const language = detectResponseLanguage(text);
  const hasData = (data.sales?.length || 0) + (data.expenses?.length || 0) > 0;
  const normalizedText = String(text || "").toLowerCase();
  const mentionsSale = /\b(becha|bika|biki|sold|sale|sales|bikri)\b/i.test(normalizedText);
  const mentionsExpense = /\b(kharida|kharidi|expense|kharcha|paid|pay|rent|transport|cost)\b/i.test(normalizedText);
  const hasSales = (data.sales?.length || 0) > 0;
  const hasExpenses = (data.expenses?.length || 0) > 0;
  const suspiciousNumbers = /\b\d{4,}\s*hazar\b/i.test(normalizedText);

  if (!hasData) {
    return {
      ambiguous: true,
      clarification_question: getClarificationMessage(language),
    };
  }

  if (data.meta?.needs_clarification) {
    return {
      ambiguous: true,
      clarification_question: makeRespectfulClarification(
        data.meta.clarification_question,
        language
      ),
    };
  }

  if ((mentionsSale && !hasSales) || (mentionsExpense && !hasExpenses) || suspiciousNumbers) {
    return {
      ambiguous: true,
      clarification_question: getClarificationMessage(language),
    };
  }

  return {
    ambiguous: false,
    clarification_question: null,
  };
}

function computeConfidence(data, source) {
  const hasStructuredData =
    (data.sales?.length || 0) + (data.expenses?.length || 0) > 0;
  const completeness = !data.meta?.needs_clarification ? 0.35 : 0.15;
  const validationScore =
    hasStructuredData ||
    (data.meta?.needs_clarification && data.meta?.clarification_question)
      ? 0.35
      : 0;
  const llmBase = source === "llm" ? 0.2 : 0;

  return Math.max(
    0.05,
    Math.min(0.9, Number((llmBase + completeness + validationScore).toFixed(2)))
  );
}

const EXPENSE_KEYWORDS = new Set([
  "transport",
  "rent",
  "gas",
  "diesel",
  "petrol",
  "milk",
  "doodh",
  "expense",
  "kharcha",
  "helper",
  "salary",
  "wages",
  "utilities",
  "raw",
  "material",
]);

function normalizeItemToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]/gu, "")
    .trim();
}

function extractRuleSales(segment) {
  const salePattern = /(\d+)\s+([\p{L}\p{M}]+)\s+(\d+)\s*(?:ka|ki|ke|का|की|के|rs|rupees?|₹)?/giu;
  const salePatternVerbFirst = /(?:sold|becha|bechi|beche|bika|bike|biki|बेचा|बेची|बेचे)\s+(\d+)\s+([\p{L}\p{M}]+)(?:\s+(?:at|for|ka|ki|ke))?\s+(\d+)/giu;
  const sales = [];
  let match;

  while ((match = salePattern.exec(segment)) !== null) {
    const qty = Number(match[1]);
    const item = normalizeItemToken(match[2]);
    const price = Number(match[3]);

    if (!qty || !item || !price) {
      continue;
    }

    sales.push({ item, qty, price });
  }

  while ((match = salePatternVerbFirst.exec(segment)) !== null) {
    const qty = Number(match[1]);
    const item = normalizeItemToken(match[2]);
    const totalOrPrice = Number(match[3]);

    if (!qty || !item || !totalOrPrice) {
      continue;
    }

    const price = Math.max(1, Math.round(totalOrPrice / qty));
    sales.push({ item, qty, price });
  }

  return sales;
}

function extractRuleExpenses(segment) {
  const expenses = [];
  const normalized = String(segment || "").toLowerCase();

  const amountFirstPattern = /(\d+)\s*(?:ka|ki|ke)?\s+([\p{L}\p{M}]+)/giu;
  let amountFirst;
  while ((amountFirst = amountFirstPattern.exec(segment)) !== null) {
    const amount = Number(amountFirst[1]);
    const item = normalizeItemToken(amountFirst[2]);
    if (!amount || !item) {
      continue;
    }

    if (
      normalized.includes("khar") ||
      normalized.includes("खरी") ||
      normalized.includes("paid") ||
      normalized.includes("liya") ||
      EXPENSE_KEYWORDS.has(item)
    ) {
      expenses.push({ item, amount });
    }
  }

  const itemFirstPattern = /([\p{L}\p{M}]+)\s+(\d+)/giu;
  let itemFirst;
  while ((itemFirst = itemFirstPattern.exec(segment)) !== null) {
    const item = normalizeItemToken(itemFirst[1]);
    const amount = Number(itemFirst[2]);
    if (!amount || !item || !EXPENSE_KEYWORDS.has(item)) {
      continue;
    }
    expenses.push({ item, amount });
  }

  const amountItemVerbPattern = /(\d+)\s+(?:रुपये|रुपया|rs|rupees?)?\s*([\p{L}\p{M}]+)\s+(?:kharida|kharidi|खरीदा|खरीदी|liya|bought)/giu;
  let amountItemVerb;
  while ((amountItemVerb = amountItemVerbPattern.exec(segment)) !== null) {
    const amount = Number(amountItemVerb[1]);
    const item = normalizeItemToken(amountItemVerb[2]);

    if (!amount || !item) {
      continue;
    }

    expenses.push({ item, amount });
  }

  return expenses;
}

function ruleBasedExtractionSync(text) {
  const responseLanguage = detectResponseLanguage(text);
  const normalizedText = preprocessText(text);
  const segments = normalizedText
    .split(/,|\.|\band\b|\baur\b|और/gi)
    .map((part) => part.trim())
    .filter(Boolean);

  const sales = [];
  const expenses = [];

  for (const segment of segments) {
    const normalizedSegment = segment.toLowerCase();
    const saleIntent = /\b(becha|beche|bechi|bika|biki|bike|sold|sale|sales|bikri|बेचा|बेचे|बेची|बिका|बिकी)\b/i.test(
      normalizedSegment
    );
    const expenseIntent = /\b(kharida|kharidi|kharcha|paid|pay|liya|expense|rent|transport|cost|खरीदा|खरीदी|खर्च)\b/i.test(
      normalizedSegment
    );

    if (saleIntent || !expenseIntent) {
      sales.push(...extractRuleSales(segment));
    }

    if (expenseIntent || /\b(rent|transport|doodh|milk|gas|diesel|petrol)\b/i.test(normalizedSegment)) {
      expenses.push(...extractRuleExpenses(segment));
    }
  }

  const hasData = sales.length + expenses.length > 0;
  return {
    sales,
    expenses,
    meta: {
      source: "rules",
      needs_clarification: !hasData,
      clarification_question: !hasData
        ? getClarificationMessage(responseLanguage)
        : null,
    },
    debug: {
      llm_attempted: false,
      llm_succeeded: false,
      llm_used_live_response: false,
      llm_error: null,
    },
  };
}

async function callLlmFallback(text) {
  const responseLanguage = detectResponseLanguage(text);

  if (!env.geminiApiKey) {
    return {
      ...createEmptyResponse(responseLanguage, "missing_api_key"),
      debug: {
        llm_attempted: false,
        llm_succeeded: false,
        llm_used_live_response: false,
        llm_error: "missing_api_key",
      },
    };
  }

  const prompt = [
    "Extract structured transaction data from the user text.",
    "Return ONLY valid JSON.",
    "Do not add explanations.",
    "Do not hallucinate missing values.",
    "If unclear, set needs_clarification to true.",
    "The clarification_question must be in the same language or language-mix as the user's input.",
    "The clarification_question must be respectful, polite, and natural.",
    `User language style: ${responseLanguage}`,
    'Format: {"sales":[{"item":"string","qty":1,"price":1}],"expenses":[{"item":"string","amount":1}],"needs_clarification":false,"clarification_question":null}',
    `Input: ${text}`,
  ].join("\n");

  try {
    const response = await fetch(`${env.geminiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.geminiApiKey}`,
      },
      body: JSON.stringify({
        model: env.geminiModel,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You convert raw transaction text into strict JSON with sales and expenses.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed with status ${response.status}`);
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content || "{}");

    return {
      sales: parsed.sales || [],
      expenses: parsed.expenses || [],
      meta: {
        source: "llm",
        needs_clarification: Boolean(parsed.needs_clarification),
        clarification_question: makeRespectfulClarification(
          parsed.clarification_question,
          responseLanguage
        ),
      },
      debug: {
        llm_attempted: true,
        llm_succeeded: true,
        llm_used_live_response: true,
        llm_error: null,
      },
    };
  } catch (error) {
    return {
      ...createEmptyResponse(error.message || "unknown_llm_error"),
      meta: {
        ...createEmptyResponse(responseLanguage, error.message || "unknown_llm_error").meta,
      },
      debug: {
        llm_attempted: true,
        llm_succeeded: false,
        llm_used_live_response: false,
        llm_error: error.message || "unknown_llm_error",
      },
    };
  }
}

async function callLLM(text) {
  return callLlmFallback(text);
}

async function processTransactionText(text) {
  const responseLanguage = detectResponseLanguage(text);
  const normalizedText = preprocessText(text);
  const llmCandidate = await callLlmFallback(normalizedText);
  const ruleCandidate = ruleBasedExtractionSync(normalizedText);
  const llmHasData = (llmCandidate.sales?.length || 0) + (llmCandidate.expenses?.length || 0) > 0;
  const ruleHasData = (ruleCandidate.sales?.length || 0) + (ruleCandidate.expenses?.length || 0) > 0;
  const shouldUseRules =
    !llmCandidate.debug?.llm_succeeded ||
    !llmHasData ||
    (llmCandidate.meta?.needs_clarification && ruleHasData);
  const selectedCandidate = shouldUseRules ? ruleCandidate : llmCandidate;
  const mergedCandidate = mergeDuplicates(
    reconcileExplicitPrices(normalizedText, selectedCandidate)
  );
  const ambiguity = detectAmbiguity(normalizedText, mergedCandidate);
  const selectedSource = shouldUseRules ? "rules" : "llm";
  const validated = validateOutput({
    sales: mergedCandidate.sales,
    expenses: mergedCandidate.expenses,
    meta: {
      source: selectedSource,
      needs_clarification:
        mergedCandidate.meta?.needs_clarification || ambiguity.ambiguous,
      clarification_question:
        mergedCandidate.meta?.clarification_question ||
        ambiguity.clarification_question,
    },
  });

  if (validated.valid) {
    return {
      normalizedText,
      result: {
        ...validated.data,
        meta: {
          ...validated.data.meta,
          source: selectedSource,
          confidence: computeConfidence(validated.data, selectedSource),
        },
        debug: {
          llm_attempted: Boolean(llmCandidate.debug?.llm_attempted),
          llm_succeeded: Boolean(llmCandidate.debug?.llm_succeeded),
          llm_used_live_response: Boolean(
            llmCandidate.debug?.llm_used_live_response
          ),
          llm_error: llmCandidate.debug?.llm_error || null,
        },
      },
    };
  }

  return {
    normalizedText,
    result: {
      ...createEmptyResponse(
        responseLanguage,
        llmCandidate.debug?.llm_error || "llm_output_failed_validation"
      ),
      debug: {
        llm_attempted: Boolean(llmCandidate.debug?.llm_attempted),
        llm_succeeded: false,
        llm_used_live_response: false,
        llm_error:
          llmCandidate.debug?.llm_error || "llm_output_failed_validation",
      },
    },
  };
}

async function extractWithRules(text) {
  return ruleBasedExtractionSync(preprocessText(text));
}

async function ruleBasedExtraction(text) {
  return ruleBasedExtractionSync(preprocessText(text));
}

module.exports = {
  preprocessText,
  extractWithRules,
  ruleBasedExtraction,
  detectAmbiguity,
  callLLM,
  callLlmFallback,
  validateOutput,
  computeConfidence,
  mergeDuplicates,
  processTransactionText,
};
