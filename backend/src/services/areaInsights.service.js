const axios = require("axios");
const env = require("../config/env");
const Transaction = require("../models/transaction.model");

const MUMBAI_AREAS = [
    { name: "Andheri", lat: 19.1136, lng: 72.8697 },
    { name: "Bandra", lat: 19.0596, lng: 72.8295 },
    { name: "Dadar", lat: 19.0176, lng: 72.8562 },
    { name: "Thane", lat: 19.2183, lng: 72.9781 },
    { name: "Navi Mumbai", lat: 19.033, lng: 73.0297 },
    { name: "Powai", lat: 19.1197, lng: 72.9073 },
    { name: "Kurla", lat: 19.0728, lng: 72.8826 },
    { name: "Borivali", lat: 19.2307, lng: 72.8567 },
    { name: "Colaba", lat: 18.9067, lng: 72.8147 },
    { name: "Ghatkopar", lat: 19.0855, lng: 72.9081 },
];

const KNOWN_CATEGORIES = [
    "snacks",
    "drinks",
    "groceries",
    "instant",
    "sweets",
    "daily",
    "premium",
    "general",
];

function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function toKmFromLatLng(lat1, lng1, lat2, lng2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
}

function inferAreaName(lat, lng) {
    let bestArea = MUMBAI_AREAS[0];
    let minDistance = Number.POSITIVE_INFINITY;

    for (const area of MUMBAI_AREAS) {
        const distance = toKmFromLatLng(lat, lng, area.lat, area.lng);
        if (distance < minDistance) {
            minDistance = distance;
            bestArea = area;
        }
    }

    return bestArea.name;
}

function getBounds(lat, lng, radiusKm) {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    return {
        minLat: lat - latDelta,
        maxLat: lat + latDelta,
        minLng: lng - lngDelta,
        maxLng: lng + lngDelta,
    };
}

function flattenSales(transactions) {
    const rows = [];

    for (const tx of transactions) {
        const sales = Array.isArray(tx.sales) ? tx.sales : [];
        for (const sale of sales) {
            const qty = Math.max(0, toNumber(sale.qty));
            const price = Math.max(0, toNumber(sale.price));
            const amount = qty * price;

            rows.push({
                item: String(sale.item || "unknown").trim(),
                category: String(sale.category || "general").trim().toLowerCase() || "general",
                qty,
                price,
                amount,
                createdAt: tx.createdAt ? new Date(tx.createdAt) : new Date(),
            });
        }
    }

    return rows;
}

function getTopItems(flatSales, limit = 7) {
    const itemMap = new Map();

    for (const sale of flatSales) {
        const key = sale.item.toLowerCase();
        const current = itemMap.get(key) || {
            item: sale.item,
            count: 0,
            quantity: 0,
            salesAmount: 0,
        };

        current.count += 1;
        current.quantity += sale.qty;
        current.salesAmount += sale.amount;
        itemMap.set(key, current);
    }

    return Array.from(itemMap.values())
        .sort((a, b) => b.count - a.count || b.salesAmount - a.salesAmount)
        .slice(0, limit);
}

function getCategoryBreakdown(flatSales) {
    const categoryMap = new Map();

    for (const sale of flatSales) {
        const key = sale.category || "general";
        const current = categoryMap.get(key) || {
            category: key,
            count: 0,
            quantity: 0,
            salesAmount: 0,
        };

        current.count += 1;
        current.quantity += sale.qty;
        current.salesAmount += sale.amount;
        categoryMap.set(key, current);
    }

    return Array.from(categoryMap.values()).sort((a, b) => b.salesAmount - a.salesAmount);
}

function getCategoryTrends(flatSales) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const recentStart = new Date(now - 5 * dayMs);
    const previousStart = new Date(now - 10 * dayMs);

    const buckets = new Map();

    for (const sale of flatSales) {
        const key = sale.category || "general";
        const current = buckets.get(key) || { category: key, recent: 0, previous: 0 };
        const createdAt = sale.createdAt instanceof Date ? sale.createdAt : new Date(sale.createdAt);

        if (createdAt >= recentStart) {
            current.recent += sale.amount;
        } else if (createdAt >= previousStart && createdAt < recentStart) {
            current.previous += sale.amount;
        }

        buckets.set(key, current);
    }

    return Array.from(buckets.values())
        .map((row) => {
            const previous = row.previous;
            const changePct = previous > 0 ? ((row.recent - previous) / previous) * 100 : row.recent > 0 ? 100 : 0;
            let trend = "stable";

            if (changePct > 10) trend = "up";
            if (changePct < -10) trend = "down";

            return {
                category: row.category,
                recentSales: Number(row.recent.toFixed(2)),
                previousSales: Number(row.previous.toFixed(2)),
                changePct: Number(changePct.toFixed(1)),
                trend,
            };
        })
        .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
}

function parseRecommendationsFromText(text) {
    const lines = String(text || "")
        .split("\n")
        .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
        .filter(Boolean);

    return lines.slice(0, 5);
}

function fallbackRecommendations(topItems, missingCategories) {
    const suggestions = [];

    if (topItems[0]) {
        suggestions.push(`Bundle ${topItems[0].item} with a complementary fast-moving item.`);
    }

    if (missingCategories.length) {
        suggestions.push(`Test one SKU from ${missingCategories.slice(0, 2).join(" and ")} to fill local demand gaps.`);
    }

    suggestions.push("Increase stock for top 3 items during evening peak hours.");
    suggestions.push("Use a combo discount to lift average order value in this area.");

    return suggestions.slice(0, 5);
}

async function getGeminiRecommendations(prompt) {
    if (!env.geminiApiKey) {
        return null;
    }

    const response = await axios.post(
        `${env.geminiBaseUrl}/chat/completions`,
        {
            model: env.geminiModel || "gemini-2.5-flash",
            temperature: 0.3,
            messages: [
                {
                    role: "system",
                    content:
                        "You are a retail demand advisor. Return concise action suggestions as plain text bullets.",
                },
                { role: "user", content: prompt },
            ],
        },
        {
            headers: {
                Authorization: `Bearer ${env.geminiApiKey}`,
                "Content-Type": "application/json",
            },
            timeout: 15000,
        }
    );

    return response?.data?.choices?.[0]?.message?.content?.trim() || null;
}

async function getGroqRecommendations(prompt) {
    if (!env.groqApiKey) {
        return null;
    }

    const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            model: env.groqModel || "llama-3.1-8b-instant",
            temperature: 0.3,
            messages: [
                {
                    role: "system",
                    content:
                        "You are a retail demand advisor. Return concise action suggestions as plain text bullets.",
                },
                { role: "user", content: prompt },
            ],
        },
        {
            headers: {
                Authorization: `Bearer ${env.groqApiKey}`,
                "Content-Type": "application/json",
            },
            timeout: 15000,
        }
    );

    return response?.data?.choices?.[0]?.message?.content?.trim() || null;
}

async function getAIRecommendations({ areaName, topItems, categories }) {
    const currentCategories = categories.map((entry) => entry.category);
    const missingCategories = KNOWN_CATEGORIES.filter(
        (category) => !currentCategories.includes(category)
    );

    const prompt = [
        `Area: ${areaName}`,
        `Top items: ${topItems.map((item) => `${item.item} (${item.count})`).join(", ") || "none"}`,
        `Present categories: ${currentCategories.join(", ") || "none"}`,
        `Missing categories: ${missingCategories.join(", ") || "none"}`,
        "Give 4-5 short recommendations for inventory and promotions.",
        "Return each suggestion in one line.",
    ].join("\n");

    try {
        const geminiReply = await getGeminiRecommendations(prompt);
        if (geminiReply) {
            const parsed = parseRecommendationsFromText(geminiReply);
            if (parsed.length) return parsed;
        }
    } catch (_) { }

    try {
        const groqReply = await getGroqRecommendations(prompt);
        if (groqReply) {
            const parsed = parseRecommendationsFromText(groqReply);
            if (parsed.length) return parsed;
        }
    } catch (_) { }

    return fallbackRecommendations(topItems, missingCategories);
}

async function getAreaInsights({ lat, lng, radiusKm = 2 }) {
    const bounds = getBounds(lat, lng, radiusKm);

    const transactions = await Transaction.find({
        "location.lat": { $gte: bounds.minLat, $lte: bounds.maxLat },
        "location.lng": { $gte: bounds.minLng, $lte: bounds.maxLng },
    })
        .select("sales totals location createdAt")
        .lean();

    const flatSales = flattenSales(transactions);
    const topItems = getTopItems(flatSales);
    const categories = getCategoryBreakdown(flatSales);
    const trends = getCategoryTrends(flatSales);
    const areaName = inferAreaName(lat, lng);
    const recommendations = await getAIRecommendations({ areaName, topItems, categories });

    return {
        areaName,
        topItems,
        categories,
        trends,
        recommendations,
        transactionCount: transactions.length,
    };
}

module.exports = {
    getAreaInsights,
};
