const mongoose = require("mongoose");
const Transaction = require("../models/transaction.model");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function getDateRange(timeRange) {
  const now = new Date();

  switch (timeRange) {
    case "today":
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
    case "yesterday": {
      const yesterday = new Date(now.getTime() - MS_PER_DAY);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
      };
    }
    case "last_week":
      return {
        startDate: new Date(now.getTime() - 7 * MS_PER_DAY),
        endDate: now,
      };
    case "last_month":
      return {
        startDate: new Date(now.getTime() - 30 * MS_PER_DAY),
        endDate: now,
      };
    default:
      return null;
  }
}

function normalizeProduct(product) {
  return typeof product === "string" && product.trim()
    ? product.trim().toLowerCase()
    : null;
}

function getUserIdFilter(userId) {
  if (mongoose.Types.ObjectId.isValid(userId)) {
    return new mongoose.Types.ObjectId(userId);
  }

  return userId;
}

function buildBaseFilter(userId, timeRange) {
  const filter = {
    userId: getUserIdFilter(userId),
  };

  const dateRange = getDateRange(timeRange);

  if (dateRange) {
    filter.createdAt = {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate,
    };
  }

  return filter;
}

async function getTotalSales(filter) {
  const [result] = await Transaction.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$totals.salesAmount" },
      },
    },
  ]);

  return {
    type: "total_sales",
    value: result?.totalSales || 0,
  };
}

async function getProductSales(filter, product) {
  if (!product) {
    return {
      type: "product_sales",
      product: null,
      quantity: 0,
    };
  }

  const [result] = await Transaction.aggregate([
    { $match: filter },
    { $unwind: "$sales" },
    {
      $match: {
        "sales.item": { $regex: `^${escapeRegex(product)}$`, $options: "i" },
      },
    },
    {
      $group: {
        _id: null,
        quantity: { $sum: "$sales.qty" },
      },
    },
  ]);

  return {
    type: "product_sales",
    product,
    quantity: result?.quantity || 0,
  };
}

async function getTopProduct(filter) {
  const [result] = await Transaction.aggregate([
    { $match: filter },
    { $unwind: "$sales" },
    {
      $group: {
        _id: { $toLower: "$sales.item" },
        quantity: { $sum: "$sales.qty" },
      },
    },
    { $sort: { quantity: -1, _id: 1 } },
    { $limit: 1 },
  ]);

  return {
    type: "top_product",
    product: result?._id || null,
    quantity: result?.quantity || 0,
  };
}

async function getSalesCount(filter) {
  const value = await Transaction.countDocuments(filter);

  return {
    type: "sales_count",
    value: value || 0,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function handleQuery(userId, intentData) {
  const {
    intent = "UNKNOWN",
    timeRange = null,
    product = null,
  } = intentData || {};

  const normalizedProduct = normalizeProduct(product);
  const filter = buildBaseFilter(userId, timeRange);

  switch (intent) {
    case "GET_TOTAL_SALES":
      return getTotalSales(filter);
    case "GET_PRODUCT_SALES":
      return getProductSales(filter, normalizedProduct);
    case "GET_TOP_PRODUCT":
      return getTopProduct(filter);
    case "GET_SALES_COUNT":
      return getSalesCount(filter);
    default:
      return {
        type: "unknown",
        value: 0,
      };
  }
}

module.exports = {
  startOfDay,
  endOfDay,
  getDateRange,
  buildBaseFilter,
  handleQuery,
};
