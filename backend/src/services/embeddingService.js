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

async function requestEmbedding(payload) {
  const response = await axios.post(
    env.huggingFaceEmbeddingUrl,
    payload,
    {
      headers: {
        Authorization: `Bearer ${env.huggingFaceApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  return normalizeEmbeddingResponse(response.data);
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
    const payloadCandidates = [
      {
        inputs: cleanedText,
        options: {
          wait_for_model: true,
          use_cache: true,
        },
      },
      {
        inputs: [cleanedText],
        options: {
          wait_for_model: true,
          use_cache: true,
        },
      },
      {
        inputs: {
          source_sentence: cleanedText,
          sentences: [cleanedText],
        },
        options: {
          wait_for_model: true,
          use_cache: true,
        },
      },
    ];

    let embedding = null;
    for (const payload of payloadCandidates) {
      try {
        embedding = await requestEmbedding(payload);
        if (Array.isArray(embedding)) {
          break;
        }
      } catch (error) {
        // Try the next payload shape; some HF endpoints expect different input format.
      }
    }

    if (!Array.isArray(embedding) || embedding.length !== 384) {
      logger.warn("Embedding generation returned unexpected dimensions", {
        length: Array.isArray(embedding) ? embedding.length : null,
        endpoint: env.huggingFaceEmbeddingUrl,
      });
      return null;
    }

    return embedding;
  } catch (error) {
    const rootError = error?.response ? error : null;
    logger.warn("Embedding generation failed", {
      error: (rootError || error)?.message,
      status: (rootError || error)?.response?.status,
      responseData: (rootError || error)?.response?.data,
      endpoint: env.huggingFaceEmbeddingUrl,
    });
    return null;
  }
}

module.exports = {
  generateEmbedding,
  normalizeEmbeddingResponse,
};
