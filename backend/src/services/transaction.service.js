const Transaction = require("../models/transaction.model");

const saveTransactions = async (businessId, data) => {
    const transactions = [];

    data.sales.forEach((item) => {
        transactions.push({
            businessId,
            type: "sale",
            item: item.item,
            qty: item.qty || 1,
            price: item.price || 0,
            amount: (item.qty || 1) * (item.price || 0),
            confidence: data.confidence || 1
        });
    });

    data.expenses.forEach((item) => {
        transactions.push({
            businessId,
            type: "expense",
            item: item.item,
            qty: 1,
            price: item.amount,
            amount: item.amount,
            confidence: data.confidence || 1
        });
    });

    return Transaction.insertMany(transactions);
};

module.exports = {
    saveTransactions
};
