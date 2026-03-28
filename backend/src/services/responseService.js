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
`;

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

function buildFallbackReply(userMessage, queryResult) {
  const message = String(userMessage || "").toLowerCase();
  const type = queryResult?.type;

  switch (type) {
    case "total_sales":
      if (message.includes("kal")) {
        return `Kal tumne ${formatCurrency(queryResult?.value)} ka maal becha.`;
      }

      if (message.includes("aaj")) {
        return `Aaj tumne ${formatCurrency(queryResult?.value)} ka maal becha.`;
      }

      return `Tumhari total sales ${formatCurrency(queryResult?.value)} rahi.`;
    case "product_sales":
      return `${capitalizeWords(queryResult?.product)} ke ${Number(queryResult?.quantity) || 0} pieces bike.`;
    case "top_product":
      return `${capitalizeWords(queryResult?.product)} sabse zyada bika, ${Number(queryResult?.quantity) || 0} pieces.`;
    case "sales_count":
      return `Tumne ${Number(queryResult?.value) || 0} transactions kiye.`;
    default:
      return "Mujhe abhi itna hi mila.";
  }
}

async function generateResponse(userMessage, queryResult) {
  const cleanedMessage = typeof userMessage === "string" ? userMessage.trim() : "";

  if (!cleanedMessage) {
    return {
      reply: buildFallbackReply("", queryResult),
      audioNeeded: true,
    };
  }

  if (!env.groqApiKey) {
    return {
      reply: buildFallbackReply(cleanedMessage, queryResult),
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
          { role: "user", content: cleanedMessage },
          { role: "assistant", content: JSON.stringify(queryResult) },
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

    if (!reply) {
      return {
        reply: buildFallbackReply(cleanedMessage, queryResult),
        audioNeeded: true,
      };
    }

    return {
      reply,
      audioNeeded: true,
    };
  } catch (error) {
    return {
      reply: buildFallbackReply(cleanedMessage, queryResult),
      audioNeeded: true,
    };
  }
}

module.exports = {
  generateResponse,
  buildFallbackReply,
  systemPrompt,
};
