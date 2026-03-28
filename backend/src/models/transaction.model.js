const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0.01 },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
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
  },
  { timestamps: true }
);

transactionSchema.index({ businessId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ "meta.source": 1, createdAt: -1 });

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
