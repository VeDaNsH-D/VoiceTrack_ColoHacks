const FILLER_PATTERNS = [
  /\b(um+|uh+|hmm+|like|you know|i mean|actually|basically)\b/gi,
  /\b(मतलब|है ना|तो\s+मतलब|अच्छा|वैसे|यानी|उम्म|ह्म्म)\b/gi,
];

const APPROX_PATTERNS = [
  /\b(around|approx(?:imately)?|about|nearly|roughly)\s+(\d+(?:\.\d+)?)\b/gi,
  /(लगभग|करीब|क़रीब)\s*(\d+(?:\.\d+)?)(?:\s*(?:के\s+आसपास|के\s+करीब))?/gi,
];

const RANGE_PATTERN = /(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/g;

const DEVANAGARI_DIGITS = {
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

const HINDI_NUMBER_WORDS = {
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  पाँच: 5,
  छह: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10,
  ग्यारह: 11,
  बारह: 12,
  तेरह: 13,
  चौदह: 14,
  पंद्रह: 15,
  पन्द्रह: 15,
  बीस: 20,
  तीस: 30,
  चालीस: 40,
  पचास: 50,
  साठ: 60,
  सत्तर: 70,
  अस्सी: 80,
  नब्बे: 90,
  सौ: 100,
  हजार: 1000,
};

function collapseSpaces(text) {
  return String(text || "")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeDevanagariDigits(text) {
  return String(text || "").replace(/[०-९]/g, (digit) => DEVANAGARI_DIGITS[digit] || digit);
}

function normalizeHindiNumberWords(text) {
  let normalized = String(text || "");
  Object.entries(HINDI_NUMBER_WORDS).forEach(([word, num]) => {
    const pattern = new RegExp(`\\b${word}\\b`, "gi");
    normalized = normalized.replace(pattern, String(num));
  });
  return normalized;
}

function removeNoiseGlyphs(text) {
  // Remove isolated non-Latin/Devanagari noise glyphs commonly seen in noisy STT output.
  return String(text || "").replace(/[\u4E00-\u9FFF\u3400-\u4DBF]/g, " ");
}

function normalizeTranscript(text) {
  const rawText = String(text || "");
  let normalized = rawText;

  normalized = removeNoiseGlyphs(normalized);
  normalized = normalizeDevanagariDigits(normalized);
  normalized = normalizeHindiNumberWords(normalized);

  const removedFillers = [];
  FILLER_PATTERNS.forEach((pattern) => {
    normalized = normalized.replace(pattern, (match) => {
      removedFillers.push(match);
      return " ";
    });
  });

  const ranges = [];
  normalized = normalized.replace(RANGE_PATTERN, (_, start, end) => {
    const min = Number(start);
    const max = Number(end);
    ranges.push({ raw: `${start}-${end}`, min, max });
    return `between ${min} and ${max}`;
  });

  const approximations = [];
  APPROX_PATTERNS.forEach((pattern) => {
    normalized = normalized.replace(pattern, (_, word, value) => {
      const numeric = Number(value);
      approximations.push({
        raw: `${word || ""} ${value}`.trim(),
        value: numeric,
      });
      return `approx ${numeric}`;
    });
  });

  normalized = collapseSpaces(normalized);

  return {
    rawText,
    normalizedText: normalized,
    metadata: {
      removedFillers,
      ranges,
      approximations,
      hadNormalization: rawText !== normalized,
    },
  };
}

module.exports = {
  normalizeTranscript,
};
