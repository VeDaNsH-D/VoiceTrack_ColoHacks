const mongoose = require("mongoose");
const Transaction = require("../models/transaction.model");
const User = require("../models/user.model");
const { generateEmbedding } = require("./embeddingService");
const logger = require("../utils/logger");

function getUserIdFilter(userId) {
  if (mongoose.Types.ObjectId.isValid(userId)) {
    return new mongoose.Types.ObjectId(userId);
  }

  return userId;
}

async function getRelevantContext(userId, query) {
  const cleanedQuery = typeof query === "string" ? query.trim() : "";
  const cleanedUserId = typeof userId === "string" ? userId.trim() : "";

  if (!cleanedQuery || !cleanedUserId || mongoose.connection.readyState !== 1) {
    return [];
  }

  try {
    let scopeMatch = null;
    if (mongoose.Types.ObjectId.isValid(cleanedUserId)) {
      const user = await User.findById(cleanedUserId).select("businessId").lean();
      if (user?.businessId) {
        scopeMatch = { businessId: user.businessId };
      } else {
        scopeMatch = { userId: getUserIdFilter(cleanedUserId) };
      }
    }

    if (!scopeMatch) {
      return [];
    }

    const embedding = await generateEmbedding(cleanedQuery);

    if (!Array.isArray(embedding) || embedding.length !== 384) {
      return [];
    }

    const results = await Transaction.aggregate([
      {
        $vectorSearch: {
          index: "VoiceTrace",
          path: "embedding",
          queryVector: embedding,
          numCandidates: 50,
          limit: 3,
        },
      },
      {
        $match: scopeMatch,
      },
      {
        $project: {
          summary: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    return results
      .map((doc) => (typeof doc.summary === "string" ? doc.summary.trim() : ""))
      .filter(Boolean);
  } catch (error) {
    logger.warn("Vector search failed, continuing without context", {
      userId: cleanedUserId,
      query: cleanedQuery,
      error: error.message,
      code: error.code,
    });
    return [];
  }
}

module.exports = {
  getRelevantContext,
};
