const { generateChatReply } = require("../services/groqService");
const {
  getUserChat,
  addUserMessage,
  addAssistantMessage,
} = require("../utils/chatMemory");

const FILLER_WORDS = new Set([
  "uh",
  "um",
  "hmm",
  "huh",
  "ah",
  "er",
  "like",
  "matlab",
]);

function cleanInput(message, sttProvider) {
  const normalizedProvider = String(sttProvider || "").toLowerCase();

  let cleanedMessage = String(message || "")
    .trim()
    .toLowerCase();

  if (!cleanedMessage) {
    return "";
  }

  cleanedMessage = cleanedMessage
    .split(/\s+/)
    .filter((word) => !FILLER_WORDS.has(word))
    .join(" ");

  if (normalizedProvider === "whisper") {
    cleanedMessage = cleanedMessage
      .replace(/[^\p{L}\p{N}\s?.!,]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return cleanedMessage;
}

async function chat(req, res) {
  const {
    userId,
    message,
    source = "voice",
    sttProvider = "sarvam",
  } = req.body || {};

  if (typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({ error: "Something went wrong" });
  }

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Something went wrong" });
  }

  try {
    const cleanedMessage = cleanInput(message, sttProvider);

    if (!cleanedMessage) {
      return res.status(400).json({ error: "Something went wrong" });
    }

    getUserChat(userId);
    addUserMessage(userId, cleanedMessage);

    const chatHistory = getUserChat(userId);
    const reply = await generateChatReply(chatHistory);

    addAssistantMessage(userId, reply);

    console.log({
      userId,
      input: message,
      output: reply,
      source,
      sttProvider,
      timestamp: new Date(),
    });

    return res.status(200).json({
      reply,
      audioNeeded: true,
    });
  } catch (error) {
    console.error("Chat controller error", {
      message: error.message,
      code: error.code,
      details: error.details,
    });

    return res.status(500).json({
      error: "Something went wrong",
    });
  }
}

module.exports = {
  chat,
};
