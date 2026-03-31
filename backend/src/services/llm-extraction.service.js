/**
 * LLM-FIRST Transaction Extraction Service
 * 
 * This service makes the LLM the PRIMARY parser for transaction extraction.
 * It removes the complex rule-based pipeline and normalization dependencies.
 * 
 * Model Priority:
 * 1. Groq (fast, multilingual)
 * 2. Gemini (backup)
 * 3. OpenAI (final fallback)
 */

const env = require("../config/env");

// ============================================
// BASIC CLEANING (Light processing only)
// ============================================

function basicClean(text) {
    if (!text || typeof text !== "string") return "";
    return text.trim();
}

const NUMBER_WORDS = new Map([
    ["zero", 0], ["shunya", 0],
    ["one", 1], ["ek", 1], ["एक", 1],
    ["two", 2], ["do", 2], ["दो", 2],
    ["three", 3], ["teen", 3], ["तीन", 3],
    ["four", 4], ["char", 4], ["chaar", 4], ["चार", 4],
    ["five", 5], ["paanch", 5], ["पांच", 5], ["पाँच", 5],
    ["six", 6], ["cheh", 6], ["छह", 6],
    ["seven", 7], ["saat", 7], ["सात", 7],
    ["eight", 8], ["aath", 8], ["आठ", 8],
    ["nine", 9], ["nau", 9], ["नौ", 9],
    ["ten", 10], ["das", 10], ["दस", 10],
    ["eleven", 11], ["gyarah", 11], ["ग्यारह", 11],
    ["twelve", 12], ["barah", 12], ["बारह", 12],
    ["thirteen", 13], ["tera", 13], ["तेरह", 13],
    ["fourteen", 14], ["chaudah", 14], ["चौदह", 14],
    ["fifteen", 15], ["pandrah", 15], ["पंद्रह", 15],
    ["sixteen", 16], ["solah", 16], ["सोलह", 16],
    ["seventeen", 17], ["satrah", 17], ["सत्रह", 17],
    ["eighteen", 18], ["atharah", 18], ["अठारह", 18],
    ["nineteen", 19], ["unnis", 19], ["उन्नीस", 19],
    ["twenty", 20], ["bees", 20], ["बीस", 20],
    ["twenty-one", 21], ["ikkis", 21], ["इक्कीस", 21],
    ["twenty-two", 22], ["bais", 22], ["बाईस", 22],
    ["twenty-three", 23], ["teis", 23], ["तेईस", 23],
    ["twenty-four", 24], ["chaubis", 24], ["चौबीस", 24],
    ["twenty-five", 25], ["pachees", 25], ["पच्चीस", 25],
    ["twenty-six", 26], ["chhabis", 26], ["छब्बीस", 26],
    ["twenty-seven", 27], ["sattais", 27], ["सत्ताईस", 27],
    ["twenty-eight", 28], ["attais", 28], ["अट्ठाईस", 28],
    ["twenty-nine", 29], ["untis", 29], ["उन्तीस", 29],
    ["thirty", 30], ["tees", 30], ["तीस", 30],
    ["thirty-five", 35], ["paintis", 35], ["पैंतीस", 35],
    ["forty", 40], ["chalis", 40], ["chaalis", 40], ["चालीस", 40],
    ["forty-five", 45], ["paintalis", 45], ["पैंतालीस", 45],
    ["fifty", 50], ["pachaas", 50], ["पचास", 50],
    ["fifty-five", 55], ["panchas", 55], ["पचपन", 55],
    ["sixty", 60], ["saath", 60], ["साठ", 60],
    ["seventy", 70], ["sattar", 70], ["सत्तर", 70],
    ["eighty", 80], ["assi", 80], ["अस्सी", 80],
    ["ninety", 90], ["nabbe", 90], ["नब्बे", 90],
    ["hundred", 100], ["sau", 100], ["सो", 100], ["सौ", 100],
]);

function parseWordNumber(value) {
    const normalized = String(value || "")
        .toLowerCase()
        .replace(/[,.]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!normalized) {
        return NaN;
    }

    if (NUMBER_WORDS.has(normalized)) {
        return NUMBER_WORDS.get(normalized);
    }

    const tokens = normalized.split(" ").filter(Boolean);
    if (!tokens.length || tokens.length > 3) {
        return NaN;
    }

    let total = 0;
    for (const token of tokens) {
        const value = NUMBER_WORDS.get(token);
        if (typeof value !== "number") {
            return NaN;
        }

        if (value === 100) {
            total = Math.max(1, total) * 100;
        } else {
            total += value;
        }
    }

    return total;
}

function toNumberLike(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    const text = String(value ?? "").trim();
    if (!text) {
        return null;
    }

    const numericText = text
        .replace(/[₹,]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const asNumber = Number(numericText);
    if (Number.isFinite(asNumber)) {
        return asNumber;
    }

    const fromWords = parseWordNumber(numericText);
    if (Number.isFinite(fromWords)) {
        return fromWords;
    }

    return null;
}

/**
 * Detect language from input text
 */
function detectLanguage(text) {
    const devanagariRegex = /[\u0900-\u097F]/g;
    const hinglishIndicators = /\b(ki|ka|ke|hai|hoon|maine|aur|lekin|par|tha|thi|hain)\b/i;

    const devanagariMatch = text.match(devanagariRegex);
    const hasDevanagari = devanagariMatch && devanagariMatch.length > 2;
    const hasHinglishIndicators = hinglishIndicators.test(text);

    if (hasDevanagari) return "hindi";
    if (hasHinglishIndicators) return "hinglish";
    return "english";
}

/**
 * Build improved prompt for LLM extraction
 */
function buildExtractionPrompt(text, language) {
    const examples = {
        hindi: {
            example1: {
                input: "आज मैंने दस रुपये के चार चिप्स बेचे",
                output: {
                    transactions: [
                        { type: "sale", item: "chips", quantity: 4, price_per_unit: 10, total: 40 }
                    ],
                    confidence: 0.9,
                    needs_clarification: false,
                    clarification_question: null
                }
            },
            example2: {
                input: "मैंने 50 रुपये का दूध खरीदा और 100 का पेट्रोल",
                output: {
                    transactions: [
                        { type: "expense", item: "milk", quantity: null, price_per_unit: null, total: 50 },
                        { type: "expense", item: "petrol", quantity: null, price_per_unit: null, total: 100 }
                    ],
                    confidence: 0.85,
                    needs_clarification: false,
                    clarification_question: null
                }
            }
        },
        hinglish: {
            example1: {
                input: "maine 2 chai 20 me bechi aur 1 coffee 50 me di",
                output: {
                    transactions: [
                        { type: "sale", item: "chai", quantity: 2, price_per_unit: 20, total: 40 },
                        { type: "sale", item: "coffee", quantity: 1, price_per_unit: 50, total: 50 }
                    ],
                    confidence: 0.9,
                    needs_clarification: false,
                    clarification_question: null
                }
            },
            example2: {
                input: "2 chai bechi aur milk kharida",
                output: {
                    transactions: [
                        { type: "sale", item: "chai", quantity: 2, price_per_unit: null, total: null },
                        { type: "expense", item: "milk", quantity: null, price_per_unit: null, total: null }
                    ],
                    confidence: 0.65,
                    needs_clarification: true,
                    clarification_question: "Chai kitne rupyes per bechni thi aur milk ke liye kita rakam kharch hua?"
                }
            }
        },
        english: {
            example1: {
                input: "Sold 3 items for 100 each",
                output: {
                    transactions: [
                        { type: "sale", item: "items", quantity: 3, price_per_unit: 100, total: 300 }
                    ],
                    confidence: 0.9,
                    needs_clarification: false,
                    clarification_question: null
                }
            },
            example2: {
                input: "Bought 5 kg of milk",
                output: {
                    transactions: [
                        { type: "expense", item: "milk", quantity: 5, price_per_unit: null, total: null }
                    ],
                    confidence: 0.7,
                    needs_clarification: true,
                    clarification_question: "What was the total price for the milk?"
                }
            }
        }
    };

    const langExamples = examples[language] || examples.english;

    return `You are a financial transaction parser for Indian businesses.

Your task: Extract structured transaction data from user input.

The user may speak in Hindi, Hinglish, or English.
The sentence may contain MULTIPLE transactions.
Extract ALL transactions mentioned.

RULES:
1. Return ONLY valid JSON (no explanations, markdown, or text outside JSON)
2. Detect transaction TYPE:
   - "sale" = becha, bika, bikri, sold (user selling something)
   - "expense" = kharida, liya, bought, paid (user buying/spending)
3. Convert all numbers to numeric values (no text)
4. Extract ALL fields you can identify:
   - item: product name (string)
   - quantity: how many units (number or null)
   - price_per_unit: price per unit (number or null)
   - total: total amount (number or null)
5. Hindi number hints: एक=1, दो=2, तीन=3, चार=4, पाँच=5, दस=10, बीस=20, सौ=100
6. If data is incomplete, set needs_clarification=true with a SPECIFIC question
7. confidence: 0.0-1.0 based on data completeness
8. clarification_question: Use SAME language as input text

EXAMPLES (${language.toUpperCase()}):

Example 1:
Input: "${langExamples.example1.input}"
Output: ${JSON.stringify(langExamples.example1.output)}

Example 2:
Input: "${langExamples.example2.input}"
Output: ${JSON.stringify(langExamples.example2.output)}

JSON OUTPUT FORMAT (strict):
{
  "transactions": [
    {
      "type": "sale" | "expense",
      "item": string,
      "quantity": number | null,
      "price_per_unit": number | null,
      "total": number | null
    }
  ],
  "confidence": number (0.0-1.0),
  "needs_clarification": boolean,
  "clarification_question": string | null
}

NOW EXTRACT FROM THIS INPUT:
"${text}"

RESPOND WITH ONLY THE JSON, NO OTHER TEXT:`;
}

/**
 * Parse and validate LLM JSON response
 */
function parseAndValidateResponse(content) {
    try {
        const text = String(content || "").trim();

        // Extract JSON from markdown code blocks if present
        let jsonStr = text;
        if (text.includes("```json")) {
            const match = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) jsonStr = match[1];
        } else if (text.includes("```")) {
            const match = text.match(/```\s*([\s\S]*?)\s*```/);
            if (match) jsonStr = match[1];
        }

        // Find JSON object
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn("[PARSE] No JSON found in response");
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate structure
        if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
            console.warn("[PARSE] transactions field missing or not array");
            return null;
        }

        // Ensure transactions have required fields
        const validTransactions = parsed.transactions.map(t => ({
            type: t.type || "expense",
            item: t.item || "",
            quantity: toNumberLike(t.quantity),
            price_per_unit: toNumberLike(t.price_per_unit),
            total: toNumberLike(t.total)
        }));

        return {
            transactions: validTransactions,
            confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.7,
            needs_clarification: Boolean(parsed.needs_clarification),
            clarification_question: parsed.clarification_question || null
        };
    } catch (error) {
        console.warn(`[PARSE] JSON parsing failed: ${error.message}`);
        return null;
    }
}

/**
 * Try Groq API (primary choice - fastest, multilingual)
 */
async function tryGroqExtraction(prompt) {
    if (!env.groqApiKey) {
        console.log("[GROQ] API key not configured");
        return null;
    }

    try {
        console.log("[GROQ] Attempting extraction...");
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.groqApiKey}`,
            },
            body: JSON.stringify({
                model: env.groqModel,
                temperature: 0,
                max_tokens: 1000,
                messages: [
                    {
                        role: "system",
                        content: "You are a JSON extraction engine. Return ONLY valid JSON with no explanation."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            }),
            timeout: 10000
        });

        if (!response.ok) {
            console.warn(`[GROQ] API error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.warn("[GROQ] Empty response");
            return null;
        }

        console.log("[GROQ] Parsing response...");
        const parsed = parseAndValidateResponse(content);
        if (!parsed) return null;

        console.log("[GROQ] Successfully extracted");
        return { ...parsed, model: "groq" };
    } catch (error) {
        console.warn(`[GROQ] Error: ${error.message}`);
        return null;
    }
}

/**
 * Try Gemini API (backup)
 */
async function tryGeminiExtraction(prompt) {
    if (!env.geminiApiKey) {
        console.log("[GEMINI] API key not configured");
        return null;
    }

    try {
        console.log("[GEMINI] Attempting extraction...");
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": env.geminiApiKey
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0,
                    maxOutputTokens: 1000
                }
            }),
            timeout: 10000
        });

        if (!response.ok) {
            console.warn(`[GEMINI] API error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            console.warn("[GEMINI] Empty response");
            return null;
        }

        console.log("[GEMINI] Parsing response...");
        const parsed = parseAndValidateResponse(content);
        if (!parsed) return null;

        console.log("[GEMINI] Successfully extracted");
        return { ...parsed, model: "gemini" };
    } catch (error) {
        console.warn(`[GEMINI] Error: ${error.message}`);
        return null;
    }
}

/**
 * Try OpenAI API (final fallback)
 */
async function tryOpenAIExtraction(prompt) {
    if (!env.openaiApiKey) {
        console.log("[OPENAI] API key not configured");
        return null;
    }

    try {
        console.log("[OPENAI] Attempting extraction...");
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.openaiApiKey}`
            },
            body: JSON.stringify({
                model: env.openaiModel,
                temperature: 0,
                max_tokens: 1000,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: "You are a JSON extraction engine. Return ONLY valid JSON."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            }),
            timeout: 10000
        });

        if (!response.ok) {
            console.warn(`[OPENAI] API error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.warn("[OPENAI] Empty response");
            return null;
        }

        console.log("[OPENAI] Parsing response...");
        const parsed = parseAndValidateResponse(content);
        if (!parsed) return null;

        console.log("[OPENAI] Successfully extracted");
        return { ...parsed, model: "openai" };
    } catch (error) {
        console.warn(`[OPENAI] Error: ${error.message}`);
        return null;
    }
}

/**
 * MAIN EXTRACTION FUNCTION
 * 
 * LLM-FIRST pipeline:
 * 1. Clean input (basic trim)
 * 2. Detect language
 * 3. Build prompt
 * 4. Try models in priority order: Groq → Gemini → OpenAI
 * 5. Parse & validate
 * 6. Return structured transaction JSON
 */
async function extractWithLLM(text) {
    console.log("[EXTRACT] Starting LLM-first extraction...");

    // Step 1: Basic cleaning
    const cleanedText = basicClean(text);
    if (!cleanedText) {
        throw new Error("Input text is empty or invalid");
    }

    console.log(`[EXTRACT] Input: "${cleanedText}"`);

    // Step 2: Detect language
    const language = detectLanguage(cleanedText);
    console.log(`[EXTRACT] Language detected: ${language}`);

    // Step 3: Build prompt
    const prompt = buildExtractionPrompt(cleanedText, language);

    // Step 4: Try models in priority order
    console.log("[EXTRACT] Model priority: Groq > Gemini > OpenAI");

    let result = await tryGroqExtraction(prompt);
    if (result) return { ...result, language, original_text: cleanedText };

    result = await tryGeminiExtraction(prompt);
    if (result) return { ...result, language, original_text: cleanedText };

    result = await tryOpenAIExtraction(prompt);
    if (result) return { ...result, language, original_text: cleanedText };

    // All models failed
    throw new Error("All LLM providers failed. No API key configured or all APIs down.");
}

/**
 * Process array of texts
 */
async function extractBatch(texts) {
    const results = [];
    for (const text of texts) {
        try {
            const result = await extractWithLLM(text);
            results.push({ success: true, result });
        } catch (error) {
            results.push({ success: false, error: error.message, input: text });
        }
    }
    return results;
}

module.exports = {
    extractWithLLM,
    extractBatch,
    detectLanguage,
    basicClean,
    buildExtractionPrompt,
    parseAndValidateResponse,
    tryGroqExtraction,
    tryGeminiExtraction,
    tryOpenAIExtraction
};
