/**
 * Hindi Language Normalization Service
 * Converts Hindi numerals, words, and grammatical variants to structured format
 * CRITICAL for multilingual transaction understanding
 */

// Hindi number words mapping (complete list)
const HINDI_NUMBERS = {
    // Basic numbers
    शून्य: "0",
    जीरो: "0",
    एक: "1",
    ek: "1",
    दो: "2",
    do: "2",
    तीन: "3",
    teen: "3",
    चार: "4",
    char: "4",
    पांच: "5",
    paanch: "5",
    छह: "6",
    chhe: "6",
    सात: "7",
    saat: "7",
    आठ: "8",
    aath: "8",
    नौ: "9",
    nau: "9",
    दस: "10",
    das: "10",
    ग्यारह: "11",
    gyarah: "11",
    बारह: "12",
    barah: "12",
    तेरह: "13",
    tera: "13",
    चौदह: "14",
    chaudah: "14",
    पंद्रह: "15",
    pandrah: "15",
    सोलह: "16",
    solah: "16",
    सत्रह: "17",
    satrah: "17",
    अठारह: "18",
    atharah: "18",
    उन्नीस: "19",
    unnis: "19",
    बीस: "20",
    bees: "20",
    इक्कीस: "21",
    ikkis: "21",
    बाईस: "22",
    bais: "22",
    तेईस: "23",
    teis: "23",
    चौबीस: "24",
    chaubis: "24",
    पच्चीस: "25",
    pachees: "25",
    छब्बीस: "26",
    chhabis: "26",
    सत्ताईस: "27",
    sattais: "27",
    अट्ठाईस: "28",
    attais: "28",
    उन्तीस: "29",
    untis: "29",
    तीस: "30",
    tees: "30",
    इकतीस: "31",
    iktis: "31",
    बत्तीस: "32",
    batis: "32",
    तेतीस: "33",
    tetis: "33",
    चौतीस: "34",
    chautis: "34",
    पैंतीस: "35",
    paintis: "35",
    छत्तीस: "36",
    chattis: "36",
    सैंतीस: "37",
    saintis: "37",
    अड़तीस: "38",
    adtis: "38",
    उनतालीस: "39",
    untalis: "39",
    चालीस: "40",
    chalis: "40",
    इकतालीस: "41",
    iktalis: "41",
    बयालीs: "42",
    bayalis: "42",
    तिरतालीस: "43",
    tirtalis: "43",
    चौवालीस: "44",
    chauwalis: "44",
    पैंतालीस: "45",
    paintalis: "45",
    छियालीस: "46",
    chhiyalis: "46",
    सत्तालीस: "47",
    sattalis: "47",
    अड़तालीस: "48",
    adtalis: "48",
    उनचास: "49",
    unchas: "49",
    पचास: "50",
    pachas: "50",
    साठ: "60",
    saath: "60",
    सत्तर: "70",
    sattar: "70",
    अस्सी: "80",
    assi: "80",
    नब्बे: "90",
    nabbe: "90",
    सौ: "100",
    sau: "100",
    हजार: "1000",
    hazaar: "1000",
};

// Hindi transaction keywords for intent detection
const HINDI_TRANSACTION_KEYWORDS = {
    sale: [
        "बेचा",
        "बेचे",
        "बेची",
        "बिका",
        "बिके",
        "बिकी",
        "बेचते",
        "बिकते",
        "bikri",
        "sale",
        "sold",
        "विक्रय",
    ],
    expense: [
        "खरीदा",
        "खरीदे",
        "खरीदी",
        "कहरीद",
        "खर्च",
        "खर्चा",
        "खर्च किया",
        "चुका",
        "खरीदा",
        "खरीदी",
        "kharida",
        "kharidi",
        "kharcha",
        "expense",
        "paid",
        "bought",
        "purchase",
    ],
};

// Devanagari numerals to ASCII
const DEVANAGARI_NUMERALS = {
    "०": "0",
    "१": "1",
    "२": "2",
    "३": "3",
    "४": "4",
    "५": "5",
    "६": "6",
    "७": "7",
    "८": "8",
    "९": "9",
};

/**
 * Normalize Devanagari numerals to ASCII
 * Input: "४ चिप्स" → Output: "4 chips"
 */
function normalizeDevanagariNumerals(text) {
    let normalized = String(text || "");
    for (const [devanagari, ascii] of Object.entries(DEVANAGARI_NUMERALS)) {
        normalized = normalized.replace(new RegExp(devanagari, "g"), ascii);
    }
    return normalized;
}

/**
 * Convert Hindi/Hinglish number words to numerals
 * CRITICAL: Must be case-insensitive
 * FIXED: Word boundaries don't work with Devanagari, use lookaround instead
 * Input: "दस रुपये के चार चिप्स" → Output: "10 रुपये के 4 चिप्स"
 */
function normalizeHindiNumbers(text) {
    let normalized = String(text || "").toLowerCase();

    // First normalize Devanagari numerals
    normalized = normalizeDevanagariNumerals(normalized);

    // Replace Hindi number words (Devanagari + Romanized)
    // Sort by length (longest first) to avoid partial replacements
    const entries = Object.entries(HINDI_NUMBERS).sort((a, b) => b[0].length - a[0].length);

    for (const [hindiWord, numeral] of entries) {
        // Use lookaround instead of \b since it doesn't work properly with Devanagari
        // Match word only if surrounded by non-word characters, spaces, or string boundaries
        const pattern = new RegExp(`(?:^|\\s|[^\\p{L}\\d])${hindiWord}(?:$|\\s|[^\\p{L}\\d])`, "gui");
        normalized = normalized.replace(pattern, (match) => {
            // Preserve surrounding whitespace/characters
            const prefix = match[0].match(/^[\s\W]/) ? match[0] : '';
            const suffix = match[match.length - 1].match(/[\s\W]$/) ? match[match.length - 1] : '';
            return (prefix || ' ') + numeral + (suffix || ' ');
        });
    }

    // Clean up extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
}

/**
 * Detect transaction intent from Hindi keywords
 * Returns: { is_sale: boolean, is_expense: boolean }
 */
function detectHindiTransactionIntent(text) {
    const lowerText = String(text || "").toLowerCase();

    const hasSaleKeyword = HINDI_TRANSACTION_KEYWORDS.sale.some((keyword) =>
        new RegExp(`\\b${keyword.toLowerCase()}\\b`).test(lowerText)
    );

    const hasExpenseKeyword = HINDI_TRANSACTION_KEYWORDS.expense.some((keyword) =>
        new RegExp(`\\b${keyword.toLowerCase()}\\b`).test(lowerText)
    );

    return {
        is_sale: hasSaleKeyword,
        is_expense: hasExpenseKeyword,
        confidence: hasSaleKeyword || hasExpenseKeyword ? 0.95 : 0.3,
    };
}

/**
 * Normalize common Hindi item names to English equivalents
 */
function normalizeHindiItems(text) {
    const HINDI_ITEM_MAPPINGS = {
        चिप्स: "chips",
        चिप्सें: "chips",
        चिपस: "chips",
        दूध: "milk",
        दुध: "milk",
        चाय: "chai",
        समोसा: "samosa",
        समोसे: "samosa",
        समोसा: "samosa",
        चायपत्ति: "tea",
        चायपत्ती: "tea",
        रोटी: "roti",
        भाकरी: "bhakri",
        नान: "naan",
        पूरी: "puri",
        पराठा: "paratha",
        आलू: "potato",
        प्याज: "onion",
        टमाटर: "tomato",
        नींबू: "lemon",
        आंवला: "amla",
        खीर: "kheer",
        हलवा: "halwa",
        लड्डू: "laddu",
        आइसक्रीम: "icecream",
        कुकीज: "cookies",
        बिस्किट: "biscuit",
        ब्रेड: "bread",
        अचार: "pickle",
        मुरब्बा: "jam",
        शहद: "honey",
        चीनी: "sugar",
    };

    let normalized = String(text || "");

    // Sort by length (longest first) to avoid partial replacements
    const entries = Object.entries(HINDI_ITEM_MAPPINGS).sort((a, b) => b[0].length - a[0].length);

    for (const [hindiItem, englishItem] of entries) {
        // Use lookaround pattern that works with Devanagari
        const pattern = new RegExp(`(?:^|\\s|[^\\p{L}\\d])${hindiItem}(?:$|\\s|[^\\p{L}\\d])`, "gui");
        normalized = normalized.replace(pattern, (match) => {
            const prefix = match[0].match(/^[\s\W]/) ? match[0] : '';
            const suffix = match[match.length - 1].match(/[\s\W]$/) ? match[match.length - 1] : '';
            return (prefix || ' ') + englishItem + (suffix || ' ');
        });
    }

    // Clean up extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
}

/**
 * Complete Hindi text normalization pipeline
 * Converts Hindi input to normalized ASCII-friendly format
 * ORDER MATTERS:
 * 1. Devanagari numerals → ASCII
 * 2. Hindi number words → numerals
 * 3. Hindi items → English
 * 4. Lowercase & trim
 */
function normalizeHindiText(text) {
    let normalized = String(text || "").trim();

    // Step 1: Normalize Devanagari numerals
    normalized = normalizeDevanagariNumerals(normalized);

    // Step 2: Convert Hindi number words to numerals
    normalized = normalizeHindiNumbers(normalized);

    // Step 3: Convert Hindi item names to English
    normalized = normalizeHindiItems(normalized);

    // Step 4: Lowercase
    normalized = normalized.toLowerCase();

    // Step 5: Remove extra spaces
    normalized = normalized.replace(/\s+/g, " ").trim();

    return normalized;
}

/**
 * Determine if text contains Hindi content
 */
function isHindiContent(text) {
    const hindiScriptRegex = /[\u0900-\u097F]/; // Devanagari Unicode range
    return hindiScriptRegex.test(String(text || ""));
}

/**
 * Determine if text is Hinglish (mix of Devanagari and Latin + English keywords)
 */
function isHinglish(text) {
    const lowerText = String(text || "").toLowerCase();
    const hasDevanagari = /[\u0900-\u097F]/.test(lowerText);
    const hasEnglishKeywords = /\b(chai|doodh|samosa|rupee|item|quantity|price|bought|sold)\b/i.test(
        lowerText
    );
    return hasDevanagari && hasEnglishKeywords;
}

/**
 * Detect language style for response generation
 * Returns: "hindi" | "hinglish" | "english"
 */
function detectLanguageStyle(text) {
    if (isHindiContent(text) && !isHinglish(text)) {
        return "hindi";
    }
    if (isHinglish(text)) {
        return "hinglish";
    }
    return "english";
}

module.exports = {
    normalizeHindiNumbers,
    normalizeDevanagariNumerals,
    normalizeHindiItems,
    normalizeHindiText,
    detectHindiTransactionIntent,
    isHindiContent,
    isHinglish,
    detectLanguageStyle,
    HINDI_NUMBERS,
    HINDI_TRANSACTION_KEYWORDS,
};
