#!/usr/bin/env node

const mongoose = require("mongoose");
const connectDb = require("../src/config/db");
const Business = require("../src/models/business.model");
const User = require("../src/models/user.model");
const { trainDemandModel } = require("../src/services/analyticsEngine.service");

function parseArgs(argv) {
  const options = {
    userId: null,
    businessId: null,
    lookbackDays: 180,
    horizonDays: 7,
  };

  argv.forEach((arg) => {
    if (arg.startsWith("--user=")) options.userId = arg.split("=")[1];
    if (arg.startsWith("--business=")) options.businessId = arg.split("=")[1];
    if (arg.startsWith("--lookback=")) options.lookbackDays = Number(arg.split("=")[1]) || 180;
    if (arg.startsWith("--horizon=")) options.horizonDays = Number(arg.split("=")[1]) || 7;
  });

  return options;
}

async function resolveIds(options) {
  if (options.userId && options.businessId) {
    return { userId: options.userId, businessId: options.businessId };
  }

  if (options.userId && !options.businessId) {
    const user = await User.findById(options.userId).select("businessId").lean();
    if (!user) {
      throw new Error("User not found. Pass a valid --user=<id>.");
    }
    if (!user.businessId) {
      throw new Error("User has no linked businessId. Pass --business=<id>.");
    }
    return { userId: String(options.userId), businessId: String(user.businessId) };
  }

  const business = options.businessId
    ? await Business.findById(options.businessId).lean()
    : await Business.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();

  if (!business) {
    throw new Error("No business found. Pass --business=<id>.");
  }

  const user = options.userId
    ? await User.findById(options.userId).lean()
    : await User.findOne({ businessId: business._id }).sort({ createdAt: 1 }).lean();

  if (!user) {
    throw new Error("No user found for business. Pass --user=<id>.");
  }

  return { userId: String(user._id), businessId: String(business._id) };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  await connectDb();
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB is not connected. Set MONGO_URI and retry.");
  }

  const { userId, businessId } = await resolveIds(options);
  const result = await trainDemandModel(userId, businessId, {
    lookbackDays: options.lookbackDays,
    horizonDays: options.horizonDays,
  });

  console.log("Training result:");
  console.log(JSON.stringify(result, null, 2));

  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error("Model training failed:", error.message);
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  } catch {
    // ignore
  }
  process.exit(1);
});
