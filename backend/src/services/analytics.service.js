const { listTransactions } = require("./transaction.store");
const User = require("../models/user.model");
const mongoose = require("mongoose");

async function getInsightsSummary(userId = null) {
  const allTransactions = await listTransactions();
  const normalizedUserId = typeof userId === "string" ? userId.trim() : "";
  let businessScopeId = "";

  if (normalizedUserId && mongoose.Types.ObjectId.isValid(normalizedUserId)) {
    const user = await User.findById(normalizedUserId).select("businessId").lean();
    businessScopeId = user?.businessId ? String(user.businessId) : "";
  }

  const transactions = normalizedUserId
    ? allTransactions.filter((transaction) => {
        const entryBusinessId = transaction.businessId
          ? String(transaction.businessId._id || transaction.businessId)
          : "";
        const entryUserId = transaction.userId
          ? String(transaction.userId._id || transaction.userId)
          : "";

        if (businessScopeId) {
          return entryBusinessId === businessScopeId;
        }

        return entryUserId === normalizedUserId;
      })
    : allTransactions;

  const totals = transactions.reduce(
    (accumulator, transaction) => {
      for (const sale of transaction.sales || []) {
        accumulator.sales += sale.qty * sale.price;
      }

      for (const expense of transaction.expenses || []) {
        accumulator.expenses += expense.amount;
      }

      return accumulator;
    },
    { sales: 0, expenses: 0 }
  );

  return {
    totals,
    transactionCount: transactions.length,
  };
}

module.exports = {
  getInsightsSummary,
};
