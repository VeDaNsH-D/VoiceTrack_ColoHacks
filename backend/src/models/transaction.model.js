const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0.01 },
    category: { type: String, default: "general" } // ✅ ADDED
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, default: "general" } // ✅ OPTIONAL ADD
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      default: null,
      index: true,
    },
    rawLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RawLog",
      default: null,
      index: true,
    },

    rawText: { type: String, required: true, trim: true },
    normalizedText: { type: String, required: true, trim: true },
    summary: { type: String, default: "", trim: true },
    embedding: { type: [Number], default: void 0 },

    // ✅ CORE TRANSACTION DATA
    sales: { type: [saleSchema], default: [] },
    expenses: { type: [expenseSchema], default: [] },

    totals: {
      salesAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      expenseAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      netAmount: {
        type: Number,
        required: true,
        default: 0,
      },
    },

    // ✅ LOCATION (CRITICAL FOR MAP)
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    // ✅ AI METADATA
    meta: {
      confidence: { type: Number, required: true, min: 0, max: 1 },
      source: {
        type: String,
        enum: ["rules", "llm", "fallback"],
        required: true,
      },
      needsClarification: { type: Boolean, default: false },
      clarificationQuestion: { type: String, default: null },
    },

    // ✅ FILECOIN AUDIO STORAGE
    audioStorage: {
      cid: { type: String, default: null, index: true }, // IPFS Content Identifier
      gateway_url: { type: String, default: null }, // Full URL to access audio
      storage_provider: { type: String, default: "filecoin" }, // "filecoin", "ipfs", etc.
      stored_at: { type: Date, default: null },
      provider_response: { type: mongoose.Schema.Types.Mixed, default: {} },
      audio_metadata: {
        original_filename: { type: String, default: null },
        mime_type: { type: String, default: "audio/webm" },
        size_bytes: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true }
);

// ✅ INDEXES (UNCHANGED + OPTIONAL LOCATION INDEX)
transactionSchema.index({ businessId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ "meta.source": 1, createdAt: -1 });
transactionSchema.index({ "audioStorage.cid": 1 }); // Index for Filecoin CID retrieval

// (Optional for faster geo queries later)
transactionSchema.index({ "location.lat": 1, "location.lng": 1 });

// ✅ AUTO TOTAL CALCULATION
transactionSchema.pre("validate", function populateTotals() {
  const salesAmount = (this.sales || []).reduce(
    (sum, sale) => sum + sale.qty * sale.price,
    0
  );

  const expenseAmount = (this.expenses || []).reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  this.totals = {
    salesAmount,
    expenseAmount,
    netAmount: salesAmount - expenseAmount,
  };
});

module.exports =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);