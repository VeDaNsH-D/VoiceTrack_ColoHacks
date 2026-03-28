#!/usr/bin/env node

const mongoose = require("mongoose");
const connectDb = require("../src/config/db");
const Transaction = require("../src/models/transaction.model");
const User = require("../src/models/user.model");
const Business = require("../src/models/business.model");

function parseArgs(argv) {
  const result = {
    userId: null,
    businessId: null,
    days: 180,
    reset: false,
    section: "tea_stall",
  };

  argv.forEach((arg) => {
    if (arg.startsWith("--user=")) result.userId = arg.split("=")[1];
    if (arg.startsWith("--business=")) result.businessId = arg.split("=")[1];
    if (arg.startsWith("--days=")) result.days = Number(arg.split("=")[1]) || 180;
    if (arg.startsWith("--section=")) result.section = arg.split("=")[1] || "tea_stall";
    if (arg === "--reset") result.reset = true;
  });

  return result;
}

const DATA_SECTIONS = {
  tea_stall: {
    catalog: [
      { item: "chai", qtyRange: [20, 75], priceRange: [8, 16], weight: 18 },
      { item: "coffee", qtyRange: [8, 30], priceRange: [18, 32], weight: 10 },
      { item: "samosa", qtyRange: [10, 45], priceRange: [12, 20], weight: 14 },
      { item: "vada pav", qtyRange: [8, 35], priceRange: [12, 22], weight: 11 },
      { item: "sandwich", qtyRange: [6, 24], priceRange: [28, 55], weight: 8 },
      { item: "cold drink", qtyRange: [5, 20], priceRange: [20, 40], weight: 7 },
      { item: "biscuit", qtyRange: [10, 36], priceRange: [5, 14], weight: 9 },
      { item: "maggi", qtyRange: [5, 16], priceRange: [25, 45], weight: 6 },
    ],
    expenseHeads: [
      { item: "milk", amountRange: [450, 1100], weight: 16 },
      { item: "tea leaves", amountRange: [220, 650], weight: 10 },
      { item: "sugar", amountRange: [180, 450], weight: 9 },
      { item: "gas", amountRange: [350, 900], weight: 6 },
      { item: "snack stock", amountRange: [500, 1400], weight: 8 },
      { item: "transport", amountRange: [120, 420], weight: 4 },
      { item: "electricity", amountRange: [100, 350], weight: 3 },
    ],
  },
  grocery: {
    catalog: [
      { item: "rice", qtyRange: [12, 45], priceRange: [42, 70], weight: 12 },
      { item: "atta", qtyRange: [10, 40], priceRange: [34, 62], weight: 11 },
      { item: "oil", qtyRange: [8, 30], priceRange: [110, 180], weight: 9 },
      { item: "sugar", qtyRange: [9, 30], priceRange: [40, 58], weight: 9 },
      { item: "dal", qtyRange: [8, 28], priceRange: [72, 130], weight: 10 },
      { item: "biscuits", qtyRange: [18, 70], priceRange: [8, 22], weight: 14 },
      { item: "soap", qtyRange: [10, 45], priceRange: [20, 45], weight: 8 },
      { item: "detergent", qtyRange: [7, 22], priceRange: [75, 150], weight: 7 },
    ],
    expenseHeads: [
      { item: "wholesale stock", amountRange: [2200, 6200], weight: 18 },
      { item: "transport", amountRange: [350, 1200], weight: 9 },
      { item: "rent", amountRange: [500, 1800], weight: 6 },
      { item: "staff", amountRange: [300, 1100], weight: 6 },
      { item: "electricity", amountRange: [250, 900], weight: 5 },
    ],
  },
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return min + Math.random() * (max - min);
}

function pickWeighted(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item;
    }
  }
  return items[items.length - 1];
}

function generateDayTransactions(dayDate, section = "tea_stall") {
  const dow = dayDate.getDay();
  const month = dayDate.getMonth();
  const isWeekend = dow === 0 || dow === 6;
  const isSummer = month >= 3 && month <= 6;
  const isFestival = month === 9 || month === 10;

  const dayFactor = isWeekend ? 1.25 : 1;
  const seasonFactor = isSummer ? 1.15 : isFestival ? 1.2 : 1;
  const volatility = randomFloat(0.9, 1.1);

  const transactionCount = Math.max(3, Math.round(randomInt(8, 18) * dayFactor * seasonFactor * volatility));

  const sectionData = DATA_SECTIONS[section] || DATA_SECTIONS.tea_stall;
  const catalog = sectionData.catalog;
  const expenseHeads = sectionData.expenseHeads;

  const rows = [];

  for (let i = 0; i < transactionCount; i++) {
    const selected = pickWeighted(catalog);
    const qty = Math.max(1, Math.round(randomInt(selected.qtyRange[0], selected.qtyRange[1]) / transactionCount));
    const price = Number(randomFloat(selected.priceRange[0], selected.priceRange[1]).toFixed(2));

    const saleText = `Sold ${qty} ${selected.item} at Rs ${price.toFixed(0)}`;
    const sales = [{ item: selected.item, qty, price }];

    const includeExpense = Math.random() < 0.35;
    const expensePick = includeExpense ? pickWeighted(expenseHeads) : null;
    const expenseAmount = includeExpense
      ? Number((randomFloat(expensePick.amountRange[0], expensePick.amountRange[1]) / Math.max(1, transactionCount / 3)).toFixed(2))
      : 0;

    const expenses = includeExpense ? [{ item: expensePick.item, amount: expenseAmount }] : [];
    const expenseText = includeExpense ? ` and spent Rs ${expenseAmount.toFixed(0)} on ${expensePick.item}` : "";

    rows.push({
      rawText: `[seed-ml] ${saleText}${expenseText}`,
      normalizedText: `[seed-ml] ${saleText}${expenseText}`.toLowerCase(),
      summary: `${saleText}${expenseText}`,
      sales,
      expenses,
      meta: {
        confidence: Number(randomFloat(0.88, 0.99).toFixed(2)),
        source: "rules",
        needsClarification: false,
        clarificationQuestion: null,
      },
      createdAt: new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), randomInt(7, 22), randomInt(0, 59), randomInt(0, 59)),
      updatedAt: new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), randomInt(7, 22), randomInt(0, 59), randomInt(0, 59)),
    });
  }

  return rows;
}

async function resolveTargetIds(userIdArg, businessIdArg) {
  if (userIdArg && businessIdArg) {
    return { userId: userIdArg, businessId: businessIdArg };
  }

  if (userIdArg && !businessIdArg) {
    const user = await User.findById(userIdArg).select("businessId").lean();
    if (!user) {
      throw new Error("User not found. Pass a valid --user=<id>");
    }
    if (!user.businessId) {
      throw new Error("User has no linked businessId. Pass --business=<id> explicitly.");
    }
    return { userId: String(userIdArg), businessId: String(user.businessId) };
  }

  const business = businessIdArg
    ? await Business.findById(businessIdArg).lean()
    : await Business.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();

  if (!business) {
    throw new Error("No business found. Pass --business=<id> (and optionally --user=<id>)");
  }

  const user = userIdArg
    ? await User.findById(userIdArg).lean()
    : await User.findOne({ businessId: business._id }).sort({ createdAt: 1 }).lean();

  if (!user) {
    throw new Error("No user found for the target business. Pass --user=<id>");
  }

  return { userId: String(user._id), businessId: String(business._id) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  await connectDb();
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB is not connected. Ensure MONGO_URI is set and reachable.");
  }

  const { userId, businessId } = await resolveTargetIds(args.userId, args.businessId);

  if (args.reset) {
    await Transaction.deleteMany({
      userId,
      businessId,
      rawText: { $regex: /^\[seed-ml\]/i },
    });
  }

  const allRows = [];
  const today = new Date();

  for (let offset = args.days; offset >= 1; offset--) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const rows = generateDayTransactions(day, args.section).map((row) => ({
      ...row,
      userId,
      businessId,
    }));
    allRows.push(...rows);
  }

  const chunkSize = 500;
  for (let i = 0; i < allRows.length; i += chunkSize) {
    await Transaction.insertMany(allRows.slice(i, i + chunkSize), { ordered: false });
  }

  console.log(`Seeded ${allRows.length} training transactions for user ${userId} and business ${businessId} using section '${args.section}'.`);
  console.log(`Available data sections: ${Object.keys(DATA_SECTIONS).join(", ")}`);
  console.log("Model confidence should improve after refreshing analytics endpoints.");

  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error("Seed failed:", error.message);
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  } catch {
    // ignore close errors
  }
  process.exit(1);
});
