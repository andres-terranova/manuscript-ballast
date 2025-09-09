export const STYLE_RULES = {
  serialComma: "Serial Comma",
  punctInsideQuotes: "Punctuation Inside Quotes", 
  smartQuotes: "Smart Quotes",
  singleSpaceAfterPeriod: "Single Space After Period",
  emDashNoSpaces: "Em Dash No Spaces",
  titleCaseHeadings: "Title Case Headings",
  spellOutOneToNine: "Spell Out One to Nine",
  ordinalStyle: "Ordinal Style",
  numericRangeEnDash: "Numeric Range En Dash"
} as const;

export type StyleRuleKey = keyof typeof STYLE_RULES;

export const DEFAULT_STYLE_RULES: StyleRuleKey[] = [
  'serialComma',
  'punctInsideQuotes',
  'smartQuotes',
  'singleSpaceAfterPeriod',
  'emDashNoSpaces',
  'titleCaseHeadings',
  'spellOutOneToNine',
  'ordinalStyle',
  'numericRangeEnDash'
];

export const STYLE_RULE_DESCRIPTIONS = {
  serialComma: "Use commas before coordinating conjunctions in lists of three or more items",
  punctInsideQuotes: "Place periods and commas inside quotation marks",
  smartQuotes: "Use curly quotes instead of straight quotes",
  singleSpaceAfterPeriod: "Use only one space after periods and colons",
  emDashNoSpaces: "Use em dashes without spaces around them",
  titleCaseHeadings: "Capitalize major words in headings and titles",
  spellOutOneToNine: "Spell out numbers one through nine in text",
  ordinalStyle: "Use consistent ordinal number formatting (1st, 2nd, 3rd)",
  numericRangeEnDash: "Use en dashes for numeric ranges (1–10, not 1-10)"
} as const;