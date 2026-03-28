const path = require("path");
const { writeFile } = require("fs/promises");

const AREAS = [
    { name: "Andheri", lat: 19.1136, lng: 72.8697, type: "commercial" },
    { name: "Bandra", lat: 19.0596, lng: 72.8295, type: "premium" },
    { name: "Dadar", lat: 19.0176, lng: 72.8562, type: "residential" },
    { name: "Thane", lat: 19.2183, lng: 72.9781, type: "family" },
    { name: "Navi Mumbai", lat: 19.033, lng: 73.0297, type: "planned" },
    { name: "Powai", lat: 19.1197, lng: 72.9073, type: "tech" },
    { name: "Kurla", lat: 19.0728, lng: 72.8826, type: "dense" },
    { name: "Borivali", lat: 19.2307, lng: 72.8567, type: "suburban" },
    { name: "Colaba", lat: 18.9067, lng: 72.8147, type: "tourist" },
    { name: "Ghatkopar", lat: 19.0855, lng: 72.9081, type: "mixed" },
];

const CATEGORY_ITEMS = {
    snacks: ["chips", "kurkure", "namkeen", "biscuits"],
    drinks: ["cold drink", "water bottle", "juice", "lassi"],
    groceries: ["milk", "bread", "eggs", "rice", "atta"],
    instant: ["maggi", "pasta", "noodles"],
    sweets: ["chocolate", "ice cream"],
    daily: ["soap", "shampoo", "toothpaste"],
    premium: ["coffee", "energy drink", "protein bar"],
};

const AREA_PREFERENCES = {
    commercial: ["snacks", "drinks", "instant"],
    premium: ["premium", "sweets", "drinks"],
    residential: ["groceries", "daily", "snacks"],
    family: ["groceries", "snacks", "daily"],
    planned: ["drinks", "snacks", "groceries"],
    tech: ["premium", "drinks", "instant"],
    dense: ["snacks", "instant", "drinks"],
    suburban: ["groceries", "sweets", "daily"],
    tourist: ["drinks", "sweets", "snacks"],
    mixed: ["snacks", "groceries", "drinks", "instant"],
};

const PRICE_OPTIONS = [10, 20, 30, 40, 50, 60, 80, 100, 120, 150];

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, precision = 2) {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(precision));
}

function pickRandom(arr) {
    return arr[randomInt(0, arr.length - 1)];
}

function generateSaleItem(preferredCategories) {
    const category = pickRandom(preferredCategories);
    const item = pickRandom(CATEGORY_ITEMS[category]);
    const qty = randomInt(1, 5);
    const price = pickRandom(PRICE_OPTIONS);

    return { item, qty, price, category };
}

function buildRawText(areaName, sales) {
    const parts = sales.map((s) => `${s.qty} ${s.item} @ Rs${s.price}`);
    return `Sold ${parts.join(", ")} near ${areaName}`;
}

function generateTransaction() {
    const area = pickRandom(AREAS);
    const preferredCategories = AREA_PREFERENCES[area.type];
    const salesCount = randomInt(1, 3);
    const sales = Array.from({ length: salesCount }, () =>
        generateSaleItem(preferredCategories)
    );

    const salesAmount = sales.reduce((sum, s) => sum + s.qty * s.price, 0);
    const expenseAmount = 0;
    const netAmount = salesAmount - expenseAmount;

    const rawText = buildRawText(area.name, sales);
    const timestamp = new Date(
        Date.now() - randomInt(0, 10 * 24 * 60 * 60 * 1000)
    );

    return {
        rawText,
        normalizedText: rawText.toLowerCase(),
        summary: `Sales recorded in ${area.name}`,
        sales,
        expenses: [],
        totals: {
            salesAmount,
            expenseAmount,
            netAmount,
        },
        location: {
            lat: Number((area.lat + randomFloat(-0.01, 0.01, 6)).toFixed(6)),
            lng: Number((area.lng + randomFloat(-0.01, 0.01, 6)).toFixed(6)),
        },
        meta: {
            confidence: randomFloat(0.7, 1, 2),
            source: "llm",
            needsClarification: false,
            clarificationQuestion: null,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

async function main() {
    try {
        const count = randomInt(500, 700);
        const data = Array.from({ length: count }, () => generateTransaction());
        const outputPath = path.join(__dirname, "mockData.json");

        await writeFile(outputPath, JSON.stringify(data, null, 2), "utf8");
        console.log(`Mock data generated: ${count} transactions at ${outputPath}`);
    } catch (error) {
        console.error("Failed to generate mock data", error);
        process.exit(1);
    }
}

main();