const axios = require("axios");
const env = require("../config/env");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function generateChatReply(chatHistory) {
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
        model: env.groqModel,
        messages: chatHistory,
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
      const error = new Error("Groq returned an empty response");
      error.statusCode = 502;
      error.code = "EMPTY_GROQ_RESPONSE";
      throw error;
    }

    return reply;
  } catch (error) {
    if (error.response) {
      const serviceError = new Error("Groq API request failed");
      serviceError.statusCode = error.response.status || 502;
      serviceError.code = "GROQ_API_ERROR";
      serviceError.details = error.response.data;
      throw serviceError;
    }

    if (error.code === "ECONNABORTED") {
      const timeoutError = new Error("Groq API request timed out");
      timeoutError.statusCode = 504;
      timeoutError.code = "GROQ_API_TIMEOUT";
      throw timeoutError;
    }

    throw error;
  }
}

module.exports = {
  generateChatReply,
};
