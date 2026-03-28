const axios = require("axios");
const env = require("../config/env");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function detectLanguageStyle(text) {
  const value = String(text || "");
  const lowered = value.toLowerCase();

  for (const ch of value) {
    if (ch >= "\u0900" && ch <= "\u097F") {
      return "hindi";
    }
  }

  const hinglishMarkers = [
    "aaj",
    "maine",
    "becha",
    "bechi",
    "haan",
    "nahi",
    "nahin",
    "kitna",
    "kitni",
    "rupaye",
    "chai",
    "kharcha",
    "theek",
    "kar",
    "liye",
  ];

  if (hinglishMarkers.some((marker) => lowered.includes(marker))) {
    return "hinglish";
  }

  return "english";
}

function toTtsLanguage(style) {
  return style === "hindi" ? "hi" : "en";
}

function buildSummaryLines(transactions) {
  const rows = Array.isArray(transactions) ? transactions : [];
  if (!rows.length) {
    return "No transactions detected.";
  }

  return rows
    .map((tx, idx) => {
      const item = String(tx?.item || "item").trim();
      const quantity = Number(tx?.quantity || 0);
      const total = Number(tx?.total || 0);
      const type = tx?.type === "credit" ? "credit" : "debit";
      return `${idx + 1}. item=${item}, qty=${quantity}, total_inr=${total}, type=${type}`;
    })
    .join("\n");
}

function buildFallbackReply({ style, requiresConfirmation, transactions }) {
  const first = Array.isArray(transactions) && transactions.length ? transactions[0] : null;
  const item = String(first?.item || "transaction").trim();
  const amount = Number(first?.total || 0);

  if (requiresConfirmation) {
    if (style === "hindi") {
      return "मैंने ट्रांजैक्शन समझा है। कृपया कन्फर्म करें या एडिट बताएं।";
    }
    if (style === "hinglish") {
      return "Maine transaction samjha hai. Please confirm karo ya edit batao.";
    }
    return "I understood the transaction. Please confirm or share edits.";
  }

  if (style === "hindi") {
    return `ठीक है, ${item} की एंट्री ₹${amount} के साथ सेव कर दी गई।`;
  }
  if (style === "hinglish") {
    return `Theek hai, ${item} ki entry ₹${amount} ke saath save ho gayi.`;
  }
  return `Okay, ${item} was saved with amount ₹${amount}.`;
}

async function generateVoiceReply({
  rawTranscript,
  transactions,
  requiresConfirmation,
  clarificationQuestion,
}) {
  const transcript = String(rawTranscript || "").trim();
  const style = detectLanguageStyle(transcript);
  const ttsLanguage = toTtsLanguage(style);

  if (!env.groqApiKey) {
    return {
      text: buildFallbackReply({ style, requiresConfirmation, transactions }),
      style,
      ttsLanguage,
      modelUsed: "fallback",
    };
  }

  const styleInstruction =
    style === "hindi"
      ? "Hindi in Devanagari script"
      : style === "hinglish"
        ? "Hinglish in Roman script"
        : "English";

  const confirmationInstruction = requiresConfirmation
    ? "Ask for confirmation in a natural way. Mention confirm/edit/cancel briefly."
    : "Acknowledge that entries are recorded.";

  const userPrompt = [
    `Input language style: ${styleInstruction}`,
    `Original narration: ${transcript}`,
    "Parsed transactions:",
    buildSummaryLines(transactions),
    clarificationQuestion ? `Clarification cue: ${clarificationQuestion}` : "",
    "Task:",
    confirmationInstruction,
    "Keep response under 28 words.",
    "Do not invent new numbers.",
    "Return only plain text reply.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: env.groqModel || "llama-3.1-8b-instant",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a voice ledger assistant for Indian small businesses. Reply in the SAME language and script as the user narration.",
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${env.groqApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    const text = String(response?.data?.choices?.[0]?.message?.content || "").trim();
    if (!text) {
      throw new Error("Empty Groq reply text");
    }

    return {
      text,
      style,
      ttsLanguage,
      modelUsed: "groq",
    };
  } catch (_) {
    return {
      text: buildFallbackReply({ style, requiresConfirmation, transactions }),
      style,
      ttsLanguage,
      modelUsed: "fallback",
    };
  }
}

module.exports = {
  generateVoiceReply,
  detectLanguageStyle,
  toTtsLanguage,
};
