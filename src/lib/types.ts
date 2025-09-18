// Unified type system for suggestions with discriminated unions

export type SuggestionType = "insert" | "delete" | "replace";
export type SuggestionCategory = "grammar" | "spelling" | "style" | "manual";
export type SuggestionActor = "Tool" | "Editor";

// Base suggestion properties
type BaseSuggestion = {
  id: string;
  type: SuggestionType;
  category: SuggestionCategory;
  note: string;
  actor: SuggestionActor;
};

// Server-originated suggestions (from AI) - keep indices for remapping
export type ServerSuggestion = BaseSuggestion & {
  origin: "server";
  start: number;
  end: number;
  before: string;
  after: string;
  location?: string;
  textBefore?: string;
  textAfter?: string;
};

// Manual suggestions (user-created) - created directly with PM positions
export type ManualSuggestion = BaseSuggestion & {
  origin: "manual";
  before: string;
  after: string;
};

// Unified UI suggestion type with PM positions
export type UISuggestion = (ServerSuggestion | ManualSuggestion) & {
  pmFrom: number;
  pmTo: number;
};

// Type guards
export function isServerSuggestion(s: UISuggestion): s is ServerSuggestion & { pmFrom: number; pmTo: number } {
  return s.origin === "server";
}

export function isManualSuggestion(s: UISuggestion): s is ManualSuggestion & { pmFrom: number; pmTo: number } {
  return s.origin === "manual";
}

// Helper to create safe IDs
export function createSuggestionId(prefix: string = "sug"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

// Helper to sanitize notes for HTML
export function sanitizeNote(note: string): string {
  return note
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
