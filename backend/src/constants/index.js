const FILLER_WORDS = ["haan", "matlab", "toh", "bhai"];

const NUMBER_WORDS = {
  ek: "1",
  do: "2",
  teen: "3",
  chaar: "4",
  paanch: "5",
  chhe: "6",
  saat: "7",
  aath: "8",
  nau: "9",
  das: "10",
};

const ITEM_MAPPINGS = {
  doodh: "milk",
  chai: "chai",
  samosa: "samosa",
};

const EXPENSE_HINTS = ["liya", "kharida", "expense", "udhaar"];

const CONFIDENCE_THRESHOLD = 0.7;

const BUSINESS_TYPES = ["vegetable", "snacks", "tea", "general"];

module.exports = {
  FILLER_WORDS,
  NUMBER_WORDS,
  ITEM_MAPPINGS,
  EXPENSE_HINTS,
  CONFIDENCE_THRESHOLD,
  BUSINESS_TYPES,
};
