const axios = require("axios");
const env = require("../config/env");
const logger = require("../utils/logger");

function normalizeEmbeddingResponse(data) {
  if (Array.isArray(data) && data.every((value) => typeof value === "number")) {
    return data;
  }

  if (Array.isArray(data) && Array.isArray(data[0])) {
    return data[0];
  }

  if (data && Array.isArray(data.embedding)) {
    return data.embedding;
  }

  if (data && Array.isArray(data.embeddings) && Array.isArray(data.embeddings[0])) {
    return data.embeddings[0];
  }

  return null;
}

async function generateEmbedding(text) {
  const cleanedText = typeof text === "string" ? text.trim() : "";

  if (!cleanedText) {
    return null;
  }

  if (!env.huggingFaceApiKey) {
    logger.warn("Embedding skipped because Hugging Face API key is not configured");
    return null;
  }

  try {
    const response = await axios.post(
      env.huggingFaceEmbeddingUrl,
      {
        inputs: [cleanedText],
        options: {
          wait_for_model: true,
          use_cache: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${env.huggingFaceApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const embedding = normalizeEmbeddingResponse(response.data);

    if (!Array.isArray(embedding) || embedding.length !== 384) {
      logger.warn("Embedding generation returned unexpected dimensions", {
        length: Array.isArray(embedding) ? embedding.length : null,
      });
      return null;
    }

    return embedding;
  } catch (error) {
    logger.warn("Embedding generation failed", {
      error: error.message,
      status: error.response?.status,
      responseData: error.response?.data,
    });
    return null;
  }
}

module.exports = {
  generateEmbedding,
  normalizeEmbeddingResponse,
};
