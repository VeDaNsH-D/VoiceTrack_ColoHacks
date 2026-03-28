function formatCurrency(value) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? `₹${amount}` : "₹0";
}

function buildTransactionSummary(transaction) {
    const item = String(transaction?.item || "-").trim() || "-";
    const quantity = Number(transaction?.quantity || 0);
    const price = Number(transaction?.price || 0);
    const total = Number(transaction?.total || 0);
    const type = String(transaction?.type || "debit").toLowerCase();

    const readableType = type === "credit" ? "Credit (Sale)" : "Debit (Expense)";

    return [
        "✅ Transaction Recorded",
        "",
        `Type: ${readableType}`,
        `Item: ${item}`,
        `Qty: ${quantity > 0 ? quantity : "-"}`,
        `Price: ${formatCurrency(price)}`,
        `Total: ${formatCurrency(total)}`,
    ].join("\n");
}

function buildPendingPreview(transaction, sourceText) {
    const item = String(transaction?.item || "-").trim() || "-";
    const quantity = Number(transaction?.quantity || 0);
    const price = Number(transaction?.price || 0);
    const total = Number(transaction?.total || 0);
    const type = String(transaction?.type || "debit").toLowerCase();
    const readableType = type === "credit" ? "Credit (Sale)" : "Debit (Expense)";

    return [
        "🧾 Please confirm transaction",
        "",
        `Text: ${sourceText}`,
        "",
        `Type: ${readableType}`,
        `Item: ${item}`,
        `Qty: ${quantity > 0 ? quantity : "-"}`,
        `Price: ${formatCurrency(price)}`,
        `Total: ${formatCurrency(total)}`,
    ].join("\n");
}

function getConfirmKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: "Confirm", callback_data: "tx_confirm" },
                { text: "Edit", callback_data: "tx_edit" },
                { text: "Cancel", callback_data: "tx_cancel" },
            ],
        ],
    };
}

function buildTodaySummary(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
        return "📭 No transactions recorded today.";
    }

    const lines = ["📊 Today\'s transactions", ""];

    let totalCredit = 0;
    let totalDebit = 0;

    entries.forEach((entry, index) => {
        const item = String(entry.item || "-");
        const total = Number(entry.total || 0);
        const type = String(entry.type || "debit").toLowerCase();

        if (type === "credit") {
            totalCredit += total;
        } else {
            totalDebit += total;
        }

        lines.push(`${index + 1}. ${item} | ${type} | ${formatCurrency(total)}`);
    });

    lines.push("");
    lines.push(`Total Credit: ${formatCurrency(totalCredit)}`);
    lines.push(`Total Debit: ${formatCurrency(totalDebit)}`);
    lines.push(`Net: ${formatCurrency(totalCredit - totalDebit)}`);

    return lines.join("\n");
}

module.exports = {
    buildTransactionSummary,
    buildPendingPreview,
    getConfirmKeyboard,
    buildTodaySummary,
};
