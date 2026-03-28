const axios = require("axios");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function sanitizeNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function buildPrompt(text) {
    return [
        "Extract transaction details from this sentence:",
        `\"${text}\"`,
        "",
        "Return STRICT JSON only with this shape:",
        "{",
        '  \"item\": string,',
        '  \"quantity\": number,',
        '  \"price\": number,',
        '  \"total\": number,',
        '  \"type\": \"credit\" or \"debit\"',
        "}",
        "",
        "Rules:",
        "- Handle Hindi, Hinglish, and English.",
        "- Use numeric values only.",
        "- If total is missing, infer total = quantity * price.",
        "- If quantity is missing but total and price are known, infer quantity = total / price.",
        "- Classify type as credit for sales, debit for purchases/expenses.",
        "- Output valid JSON only. No markdown or explanations.",
    ].join("\n");
}

function extractJsonObject(raw) {
    const text = String(raw || "").trim();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch (_) {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) {
            return null;
        }

        try {
            return JSON.parse(match[0]);
        } catch (_) {
            return null;
        }
    }
}

function inferTypeFromText(text) {
    const normalized = String(text || "").toLowerCase();
    const creditHints = /बेच|bik|sold|sale|income|received|कमाया|बिका|becha/;
    if (creditHints.test(normalized)) {
        return "credit";
    }
    return "debit";
}

function normalizeParsedTransaction(parsed, originalText) {
    const item = String(parsed?.item || "").trim();
    const rawType = String(parsed?.type || "").trim().toLowerCase();
    const quantity = sanitizeNumber(parsed?.quantity);
    const price = sanitizeNumber(parsed?.price);
    const total = sanitizeNumber(parsed?.total);

    const type = rawType === "credit" || rawType === "debit" ? rawType : inferTypeFromText(originalText);

    let resolvedQuantity = quantity;
    let resolvedPrice = price;
    let resolvedTotal = total;

    if (resolvedTotal <= 0 && resolvedQuantity > 0 && resolvedPrice > 0) {
        resolvedTotal = resolvedQuantity * resolvedPrice;
    }

    if (resolvedQuantity <= 0 && resolvedTotal > 0 && resolvedPrice > 0) {
        resolvedQuantity = resolvedTotal / resolvedPrice;
    }

    if (resolvedPrice <= 0 && resolvedTotal > 0 && resolvedQuantity > 0) {
        resolvedPrice = resolvedTotal / resolvedQuantity;
    }

    if (type === "credit") {
        if (resolvedQuantity <= 0) {
            resolvedQuantity = 1;
        }
        if (resolvedPrice <= 0 && resolvedTotal > 0) {
            resolvedPrice = resolvedTotal / resolvedQuantity;
        }
        if (resolvedTotal <= 0 && resolvedPrice > 0) {
            resolvedTotal = resolvedQuantity * resolvedPrice;
        }
    } else {
        if (resolvedQuantity <= 0) {
            resolvedQuantity = 1;
        }
        if (resolvedTotal <= 0 && resolvedPrice > 0) {
            resolvedTotal = resolvedPrice * resolvedQuantity;
        }
        if (resolvedPrice <= 0 && resolvedTotal > 0) {
            resolvedPrice = resolvedTotal / resolvedQuantity;
        }
    }

    return {
        item,
        quantity: Math.max(0, Number(resolvedQuantity.toFixed(4))),
        price: Math.max(0, Number(resolvedPrice.toFixed(4))),
        total: Math.max(0, Number(resolvedTotal.toFixed(4))),
        type,
    };
}

function fallbackParse(text) {
    const normalized = String(text || "").trim();

    const patternA = /(\d+(?:\.\d+)?)\s*(?:rupees|rs|₹|रुपये|रुपया)?\s*(?:ke|का|ki|की)?\s*(\d+(?:\.\d+)?)\s+([\p{L}\p{M}]+)/iu;
    const a = normalized.match(patternA);
    if (a) {
        const price = Number(a[1]);
        const quantity = Number(a[2]);
        const item = String(a[3] || "").trim();
        const type = inferTypeFromText(normalized);
        return {
            item,
            quantity,
            price,
            total: quantity * price,
            type,
        };
    }

    const patternB = /(?:bought|buy|kharid|spent|paid|sold|bech|बेच|खरीद)[^\d]*(\d+(?:\.\d+)?)[^\p{L}\p{M}]*(?:on|for)?\s*([\p{L}\p{M}]+)/iu;
    const b = normalized.match(patternB);
    if (b) {
        const total = Number(b[1]);
        const item = String(b[2] || "").trim();
        return {
            item,
            quantity: 1,
            price: total,
            total,
            type: inferTypeFromText(normalized),
        };
    }

    return null;
}

async function parseWithGroq(prompt) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return null;
    }

    const response = await axios.post(
        GROQ_URL,
        {
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: "You are a transaction extraction engine. Return only strict JSON.",
                },
                { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            timeout: 20000,
        }
    );

    return response?.data?.choices?.[0]?.message?.content || null;
}

async function parseWithGemini(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return null;
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const url = `${GEMINI_URL}/${model}:generateContent`;

    const response = await axios.post(
        url,
        {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0,
                responseMimeType: "application/json",
            },
        },
        {
            headers: {
                "x-goog-api-key": apiKey,
                "Content-Type": "application/json",
            },
            timeout: 20000,
        }
    );

    return (
        response?.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        response?.data?.candidates?.[0]?.output ||
        null
    );
}

async function parseTransactionFromText(text) {
    const cleaned = String(text || "").trim();
    if (!cleaned) {
        throw new Error("Empty text");
    }

    const prompt = buildPrompt(cleaned);
    let modelUsed = "fallback";
    let parsed = null;

    try {
        const groqRaw = await parseWithGroq(prompt);
        const groqParsed = extractJsonObject(groqRaw);
        if (groqParsed) {
            parsed = groqParsed;
            modelUsed = "groq";
        }
    } catch (_) {
        parsed = null;
    }

    if (!parsed) {
        try {
            const geminiRaw = await parseWithGemini(prompt);
            const geminiParsed = extractJsonObject(geminiRaw);
            if (geminiParsed) {
                parsed = geminiParsed;
                modelUsed = "gemini";
            }
        } catch (_) {
            parsed = null;
        }
    }

    if (!parsed) {
        parsed = fallbackParse(cleaned);
        modelUsed = "fallback";
    }

    if (!parsed) {
        throw new Error("Could not extract transaction details");
    }

    const normalized = normalizeParsedTransaction(parsed, cleaned);

    if (!normalized.item || normalized.price <= 0 || normalized.total <= 0) {
        throw new Error("Parsed transaction is incomplete");
    }

    return {
        ...normalized,
        modelUsed,
    };
}

module.exports = {
    parseTransactionFromText,
};
