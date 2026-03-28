const mongoose = require("mongoose");

// Demand Forecast Schema
const demandForecastSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    itemName: { type: String, required: true, trim: true },
    forecastDate: { type: Date, required: true, index: true },
    predictedQty: { type: Number, required: true, min: 0 },
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    actualQty: { type: Number, default: null },
    accuracy: { type: Number, min: 0, max: 1, default: null },
    method: {
      type: String,
      enum: ["moving_avg", "linear_trend", "seasonal", "ml"],
      default: "moving_avg",
    },
  },
  { timestamps: true }
);
demandForecastSchema.index({ userId: 1, businessId: 1, forecastDate: -1 });
demandForecastSchema.index({ itemName: 1, forecastDate: -1 });

// Demand Model Profile Schema
const demandModelProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    modelName: {
      type: String,
      default: "hybrid_kmeans_rule",
      index: true,
    },
    trainedAt: { type: Date, default: Date.now, index: true },
    trainingWindowDays: { type: Number, default: 180 },
    trainingRows: { type: Number, default: 0 },
    metrics: {
      confidence: { type: Number, min: 0, max: 1, default: 0.5 },
      volatility: { type: Number, default: 0 },
      clusters: { type: Number, default: 0 },
      featuresUsed: { type: [String], default: [] },
    },
    params: {
      k: Number,
      horizonDays: Number,
      blendWeights: {
        regression: Number,
        cluster: Number,
        movingAvg: Number,
      },
    },
  },
  { timestamps: true }
);
demandModelProfileSchema.index({ userId: 1, businessId: 1 }, { unique: true });

// Profit Analysis Schema
const profitAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    itemName: { type: String, required: true, trim: true },
    period: { type: String, enum: ["daily", "weekly", "monthly"], default: "daily" },
    periodDate: { type: Date, required: true, index: true },
    totalRevenue: { type: Number, required: true, min: 0 },
    totalExpense: { type: Number, required: true, min: 0 },
    totalProfit: { type: Number, required: true },
    marginPercent: { type: Number, required: true },
    unitsSold: { type: Number, required: true, min: 0 },
    avgPrice: { type: Number, required: true, min: 0 },
    marginTier: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
  },
  { timestamps: true }
);
profitAnalysisSchema.index({ userId: 1, businessId: 1, periodDate: -1 });
profitAnalysisSchema.index({ marginTier: 1, periodDate: -1 });

// Item Clustering Schema
const itemClusterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    clusterId: { type: String, required: true },
    clusterName: String,
    items: [String],
    characteristics: {
      avgMargin: Number,
      avgVolume: Number,
      volatility: Number,
      trend: { type: String, enum: ["up", "down", "stable"] },
    },
    scoreCard: {
      profitability: { type: Number, min: 0, max: 100 },
      velocity: { type: Number, min: 0, max: 100 },
      stability: { type: Number, min: 0, max: 100 },
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
itemClusterSchema.index({ userId: 1, clusterId: 1 });

// Anomaly Alert Schema
const anomalyAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    alertType: {
      type: String,
      enum: [
        "sales_drop",
        "unusual_expense",
        "missing_data",
        "performance_deviation",
        "margin_drop",
        "margin_increase",
      ],
      required: true,
      index: true,
    },
    itemName: String,
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    message: String,
    expectedValue: Number,
    actualValue: Number,
    deviationPercent: Number,
    isResolved: { type: Boolean, default: false },
    resolvedAt: Date,
    resolvedBy: String,
    triggeredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);
anomalyAlertSchema.index({ userId: 1, alertType: 1, triggeredAt: -1 });

// Personalization Profile Schema
const personalizationProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    frequentItems: [
      {
        itemName: String,
        frequency: Number,
        lastUsed: Date,
        avgPrice: Number,
      },
    ],
    pricingHabits: {
      avgTransactionSize: Number,
      preferredPriceRange: { min: Number, max: Number },
      priceSensitivity: { type: String, enum: ["low", "medium", "high"] },
    },
    preferredVendors: [
      {
        vendorName: String,
        frequency: Number,
        lastInteraction: Date,
      },
    ],
    autoFillPatterns: [
      {
        pattern: String,
        matchScore: { type: Number, min: 0, max: 1 },
        usageCount: Number,
      },
    ],
    preferences: {
      enableAutoFill: { type: Boolean, default: true },
      enableRecommendations: { type: Boolean, default: true },
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Global Intelligence Schema
const globalIntelligenceSchema = new mongoose.Schema(
  {
    aggregationType: {
      type: String,
      enum: ["global", "location", "category", "time_period"],
      required: true,
      index: true,
    },
    aggregationKey: String,
    metrics: {
      topItems: [
        {
          itemName: String,
          salesVolume: Number,
          avgPrice: Number,
          marginPercent: Number,
        },
      ],
      topCombos: [
        {
          items: [String],
          frequency: Number,
          avgProfit: Number,
        },
      ],
      marketTrends: [
        {
          trend: String,
          direction: String,
          strength: Number,
        },
      ],
    },
    vendorMetrics: {
      totalVendors: Number,
      avgProfit: Number,
      avgVolume: Number,
      profitDistribution: {
        low: Number,
        medium: Number,
        high: Number,
      },
    },
    seasonalData: [
      {
        season: String,
        avgSales: Number,
        avgProfit: Number,
        topItems: [String],
      },
    ],
    lastUpdated: { type: Date, default: Date.now, index: true },
    dataVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);
globalIntelligenceSchema.index({ aggregationType: 1, aggregationKey: 1 });

// Market Basket Analysis Schema
const marketBasketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    antecedent: [String],
    consequent: [String],
    support: { type: Number, min: 0, max: 1, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    lift: { type: Number, required: true },
    frequency: { type: Number, required: true, min: 1 },
    avgProfit: Number,
    lastOccurred: Date,
  },
  { timestamps: true }
);
marketBasketSchema.index({ userId: 1, businessId: 1, confidence: -1 });

// AI Coach Interaction Schema
const coachInteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      index: true,
    },
    interactionType: {
      type: String,
      enum: ["proactive_suggestion", "qa_response", "decision_guidance", "voice_coaching"],
      required: true,
    },
    context: {
      metric: String,
      metricValue: Number,
      threshold: Number,
      anomaly: Boolean,
    },
    suggestion: String,
    actionTaken: Boolean,
    actionResult: String,
    userRating: { type: Number, min: 1, max: 5 },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);
coachInteractionSchema.index({ userId: 1, timestamp: -1 });

module.exports = {
  DemandForecast: mongoose.model("DemandForecast", demandForecastSchema),
  DemandModelProfile: mongoose.model("DemandModelProfile", demandModelProfileSchema),
  ProfitAnalysis: mongoose.model("ProfitAnalysis", profitAnalysisSchema),
  ItemCluster: mongoose.model("ItemCluster", itemClusterSchema),
  AnomalyAlert: mongoose.model("AnomalyAlert", anomalyAlertSchema),
  PersonalizationProfile: mongoose.model(
    "PersonalizationProfile",
    personalizationProfileSchema
  ),
  GlobalIntelligence: mongoose.model("GlobalIntelligence", globalIntelligenceSchema),
  MarketBasket: mongoose.model("MarketBasket", marketBasketSchema),
  CoachInteraction: mongoose.model("CoachInteraction", coachInteractionSchema),
};
