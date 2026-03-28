const axios = require("axios");
const env = require("../config/env");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama3-8b-8192";

const systemPrompt = `You are a friendly voice assistant for small business vendors in India.

You speak Hindi, English, and Hinglish.

Rules:
- Reply in the same language as the user
- Keep responses short and conversational
- Sound like natural speech
- Include numbers clearly (₹, quantities)
- Avoid long explanations
- Use the provided business data and retrieved past context when relevant
- Do not hallucinate facts that are not supported by current data or past context
- If a language is explicitly required, respond only in that language
`;

function normalizeLanguageHint(languageHint, userMessage) {
  if (languageHint === "hi" || languageHint === "en") {
    return languageHint;
  }

  return /[\u0900-\u097F]/.test(String(userMessage || "")) ? "hi" : "en";
}

function isReplyLanguageValid(reply, expectedLanguage) {
  if (!reply) {
    return false;
  }

  if (expectedLanguage === "hi") {
    return /[\u0900-\u097F]/.test(reply);
  }

  return !/[\u0900-\u097F]/.test(reply);
}

function formatCurrency(value) {
  const amount = Number(value) || 0;
  return `₹${amount}`;
}

function capitalizeWords(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildFallbackReply(userMessage, queryResult, languageHint = "en") {
  const message = String(userMessage || "").toLowerCase();
  const language = normalizeLanguageHint(languageHint, userMessage);
  const type = queryResult?.type;

  switch (type) {
    case "total_sales":
      if (language === "hi") {
        if (message.includes("कल") || message.includes("kal")) {
          return `कल आपकी बिक्री ${formatCurrency(queryResult?.value)} रही।`;
        }

        if (message.includes("आज") || message.includes("aaj")) {
          return `आज आपकी कुल बिक्री ${formatCurrency(queryResult?.value)} रही।`;
        }

        return `आपकी कुल बिक्री ${formatCurrency(queryResult?.value)} है।`;
      }

      if (message.includes("kal")) {
        return `Kal tumne ${formatCurrency(queryResult?.value)} ka maal becha.`;
      }

      if (message.includes("aaj")) {
        return `Aaj tumne ${formatCurrency(queryResult?.value)} ka maal becha.`;
      }

      return `Your total sales are ${formatCurrency(queryResult?.value)}.`;
    case "product_sales":
      if (language === "hi") {
        return `${capitalizeWords(queryResult?.product)} की ${Number(queryResult?.quantity) || 0} यूनिट बिकीं।`;
      }
      return `${capitalizeWords(queryResult?.product)} ke ${Number(queryResult?.quantity) || 0} pieces bike.`;
    case "top_product":
      if (language === "hi") {
        return `${capitalizeWords(queryResult?.product)} सबसे ज्यादा बिका, ${Number(queryResult?.quantity) || 0} यूनिट।`;
      }
      return `${capitalizeWords(queryResult?.product)} sabse zyada bika, ${Number(queryResult?.quantity) || 0} pieces.`;
    case "sales_count":
      if (language === "hi") {
        return `आपके कुल ${Number(queryResult?.value) || 0} ट्रांजैक्शन हैं।`;
      }
      return `You have ${Number(queryResult?.value) || 0} transactions.`;
    case "profit": {
      const profit = Number(queryResult?.value) || 0;
      if (language === "hi") {
        if (profit >= 0) {
          return `आपका नेट प्रॉफिट ${formatCurrency(profit)} है।`;
        }
        return `आपका नेट लॉस ${formatCurrency(Math.abs(profit))} है।`;
      }
      if (profit >= 0) {
        return `Your net profit is ${formatCurrency(profit)}.`;
      }
      return `Your net loss is ${formatCurrency(Math.abs(profit))}.`;
    }
    default:
      return language === "hi" ? "अभी मेरे पास यही डेटा उपलब्ध है।" : "That is what I could find right now.";
  }
}

function buildRagUserPrompt(userMessage, queryResult, context, languageHint) {
  const contextBlock = context || "No relevant past context found.";
  const requiredLanguage = normalizeLanguageHint(languageHint, userMessage) === "hi" ? "Hindi" : "English";

  return [
    `User question: ${userMessage}`,
    `Language requirement: Reply strictly in ${requiredLanguage}.`,
    `Current data: ${JSON.stringify(queryResult)}`,
    "Past context:",
    contextBlock,
    "Generate a natural, helpful reply using current data first and past context only when relevant.",
  ].join("\n\n");
}

async function generateResponse(userMessage, queryResult, context = "", languageHint = null) {
  const cleanedMessage = typeof userMessage === "string" ? userMessage.trim() : "";
  const normalizedLanguage = normalizeLanguageHint(languageHint, cleanedMessage);

  if (!cleanedMessage) {
    return {
      reply: buildFallbackReply("", queryResult, normalizedLanguage),
      audioNeeded: true,
    };
  }

  if (!env.groqApiKey) {
    return {
      reply: buildFallbackReply(cleanedMessage, queryResult, normalizedLanguage),
      audioNeeded: true,
    };
  }

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: GROQ_MODEL,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: buildRagUserPrompt(cleanedMessage, queryResult, context, normalizedLanguage),
          },
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

    const reply = response?.data?.choices?.[0]?.message?.content?.trim();

    if (!reply || !isReplyLanguageValid(reply, normalizedLanguage)) {
      return {
        reply: buildFallbackReply(cleanedMessage, queryResult, normalizedLanguage),
        audioNeeded: true,
      };
    }

    return {
      reply,
      audioNeeded: true,
    };
  } catch (error) {
    return {
      reply: buildFallbackReply(cleanedMessage, queryResult, normalizedLanguage),
      audioNeeded: true,
    };
  }
}

module.exports = {
  generateResponse,
  buildFallbackReply,
  buildRagUserPrompt,
  systemPrompt,
};
