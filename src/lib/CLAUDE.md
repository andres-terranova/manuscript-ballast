# Library Utilities Documentation

## Overview

This directory contains core business logic, utilities, and type definitions that power the manuscript editing functionality. These are pure TypeScript modules with no React dependencies.

## Module Organization

```
lib/
├── types.ts                  # Core type definitions
├── suggestionMapper.ts       # AI → UI suggestion mapping
├── suggestionsPlugin.ts      # ProseMirror plugin for suggestions
├── checksPlugin.ts           # ProseMirror plugin for style checks
├── styleValidator.ts         # Deterministic rule validation
├── styleRuleConstants.ts     # Style rule definitions
├── editorUtils.ts            # Editor state management
├── segmentMapper.ts          # Text segmentation utilities
├── mappingDiagnostics.ts     # Debugging tools for position mapping
├── docxUtils.ts              # DOCX processing utilities
├── markdownUtils.ts          # Markdown conversion
└── utils.ts                  # General utilities (cn, etc.)
```

## Core Modules

### types.ts ⭐ (Type Definitions)

**Purpose**: Central type definitions for suggestions, checks, and editor data structures.

**Key Types**:

```typescript
// Suggestion Types
export type SuggestionType = 
  | 'grammar' 
  | 'spelling' 
  | 'clarity' 
  | 'tone' 
  | 'style' 
  | 'consistency';

export type SuggestionCategory = 
  | 'grammar' 
  | 'clarity' 
  | 'tone' 
  | 'style';

export type SuggestionActor = 
  | 'copy-editor' 
  | 'line-editor' 
  | 'style-editor' 
  | 'fact-checker' 
  | 'manuscript-evaluator' 
  | 'developmental-editor';

// Server-side suggestion format (from TipTap API)
export interface ServerSuggestion {
  id: string;
  type: SuggestionType;
  from: number;              // ProseMirror position
  to: number;                // ProseMirror position
  original: string;
  replacement: string;
  explanation?: string;
  confidence?: number;
  rule_id?: string;
}

// UI-side suggestion format
export interface UISuggestion {
  id: string;
  type: SuggestionType;
  category: SuggestionCategory;
  actor: SuggestionActor;
  from: number;
  to: number;
  originalText: string;
  suggestedText: string;
  explanation?: string;
  confidence?: number;
  timestamp: number;
}

// Style check format
export interface CheckItem {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  from: number;
  to: number;
  text: string;
  message: string;
  suggestion?: string;
}
```

**Utility Functions**:
```typescript
export function createSuggestionId(): string {
  return `sugg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function isSuggestionType(value: string): value is SuggestionType {
  return ['grammar', 'spelling', 'clarity', 'tone', 'style', 'consistency']
    .includes(value);
}
```

**File Location**: `src/lib/types.ts`

---

### suggestionMapper.ts ⭐ (Suggestion Mapping)

**Purpose**: Maps AI suggestion responses to UI format and calculates ProseMirror positions.

**Key Functions**:

#### `mapServerSuggestionToUI()`
Converts server suggestion to UI format:
```typescript
export function mapServerSuggestionToUI(
  serverSugg: ServerSuggestion
): UISuggestion {
  return {
    id: serverSugg.id || createSuggestionId(),
    type: serverSugg.type,
    category: mapTypeToCategory(serverSugg.type),
    actor: inferActor(serverSugg.type),
    from: serverSugg.from,
    to: serverSugg.to,
    originalText: serverSugg.original,
    suggestedText: serverSugg.replacement,
    explanation: serverSugg.explanation,
    confidence: serverSugg.confidence,
    timestamp: Date.now(),
  };
}
```

#### `mapPlainTextToPM()` (Legacy)
Maps plain text suggestions to ProseMirror positions:
```typescript
export function mapPlainTextToPM(
  plainSuggestions: Array<{original: string, replacement: string}>,
  editorText: string
): UISuggestion[] {
  // Finds original text in editor content
  // Calculates character offsets
  // Converts to ProseMirror positions
  // Returns UI suggestions
}
```

**Challenges**:
- **Position Accuracy**: Must account for HTML tags, formatting
- **Whitespace Handling**: Normalize whitespace differences
- **Overlapping Suggestions**: Handle multiple suggestions in same region
- **Document Mutations**: Positions can shift after edits

**File Location**: `src/lib/suggestionMapper.ts`

---

### suggestionsPlugin.ts (ProseMirror Plugin)

**Purpose**: Creates ProseMirror plugin for rendering suggestion decorations.

**Key Functions**:

#### `createSuggestionsPlugin()`
```typescript
export function createSuggestionsPlugin({
  suggestions,
  onSelect,
  onAccept,
  onReject,
}: {
  suggestions: UISuggestion[];
  onSelect?: (id: string) => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  return new Plugin({
    key: suggestionsPluginKey,
    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, set) {
        // Update decorations based on suggestions
        // Handle document changes
        // Maintain decoration positions
        return newDecorationSet;
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
      handleClick(view, pos, event) {
        // Handle clicks on suggestions
        // Trigger onSelect callback
      },
    },
  });
}
```

**Decoration Creation**:
```typescript
function createSuggestionDecoration(suggestion: UISuggestion) {
  return Decoration.inline(
    suggestion.from,
    suggestion.to,
    {
      class: `suggestion suggestion-${suggestion.type}`,
      style: `
        border-bottom: 2px solid ${getColorForType(suggestion.type)};
        background: ${getBackgroundForType(suggestion.type)};
        cursor: pointer;
      `,
      'data-suggestion-id': suggestion.id,
    }
  );
}
```

**File Location**: `src/lib/suggestionsPlugin.ts`

---

### checksPlugin.ts (ProseMirror Plugin)

**Purpose**: Creates ProseMirror plugin for rendering style check decorations.

**Similar to suggestionsPlugin but for deterministic checks:**

```typescript
export function createChecksPlugin({
  checks,
  onSelect,
  onResolve,
  onIgnore,
}: {
  checks: CheckItem[];
  onSelect?: (id: string) => void;
  onResolve?: (id: string) => void;
  onIgnore?: (id: string) => void;
}) {
  // Similar structure to suggestionsPlugin
  // Different styling (wavy underline vs solid)
  // Different interaction handlers
}
```

**Decoration Styling**:
```typescript
// Error: Red wavy underline
// Warning: Yellow wavy underline
// Info: Blue wavy underline
```

**File Location**: `src/lib/checksPlugin.ts`

---

### styleValidator.ts (Rule Validation)

**Purpose**: Runs deterministic grammar and style checks on document content.

**Key Functions**:

#### `runDeterministicChecks()`
```typescript
export function runDeterministicChecks(
  content: string,
  activeRules: StyleRuleKey[],
  editorState?: EditorState
): CheckItem[] {
  const checks: CheckItem[] = [];
  
  for (const ruleKey of activeRules) {
    const rule = STYLE_RULES[ruleKey];
    if (!rule || !rule.validate) continue;
    
    const ruleChecks = rule.validate(content, editorState);
    checks.push(...ruleChecks);
  }
  
  return checks;
}
```

**Example Rule Implementation**:
```typescript
const DOUBLE_SPACE_RULE = {
  id: 'double-space',
  name: 'Double Space',
  description: 'Finds double spaces that should be single',
  validate(content: string): CheckItem[] {
    const checks: CheckItem[] = [];
    const regex = /\s{2,}/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      checks.push({
        id: `check_${Date.now()}_${checks.length}`,
        ruleId: 'double-space',
        ruleName: 'Double Space',
        severity: 'warning',
        from: match.index,
        to: match.index + match[0].length,
        text: match[0],
        message: 'Multiple spaces found',
        suggestion: ' ',
      });
    }
    
    return checks;
  },
};
```

**Built-in Rules**:
- Double spaces
- Triple periods (use ellipsis)
- Straight quotes (use curly quotes)
- Em dash spacing
- Oxford comma consistency
- Sentence capitalization

**File Location**: `src/lib/styleValidator.ts`

---

### styleRuleConstants.ts (Rule Definitions)

**Purpose**: Defines all available style rules with metadata.

**Structure**:
```typescript
export type StyleRuleKey = 
  | 'grammar'
  | 'spelling'
  | 'punctuation'
  | 'clarity'
  | 'consistency'
  | 'tone'
  // ... more

export interface StyleRule {
  id: StyleRuleKey;
  name: string;
  description: string;
  category: 'grammar' | 'style' | 'formatting';
  enabled: boolean;  // Default state
  validate?: (content: string, state?: EditorState) => CheckItem[];
}

export const STYLE_RULES: Record<StyleRuleKey, StyleRule> = {
  grammar: {
    id: 'grammar',
    name: 'Grammar',
    description: 'Basic grammar rules',
    category: 'grammar',
    enabled: true,
    validate: validateGrammar,
  },
  // ... more rules
};
```

**File Location**: `src/lib/styleRuleConstants.ts`

---

### editorUtils.ts (Editor State Management)

**Purpose**: Utilities for managing TipTap/ProseMirror editor state.

**Key Functions**:

#### `getGlobalEditor()`
```typescript
let globalEditorInstance: Editor | null = null;

export function setGlobalEditor(editor: Editor | null) {
  globalEditorInstance = editor;
}

export function getGlobalEditor(): Editor | null {
  return globalEditorInstance;
}
```

#### `getEditorPlainText()`
```typescript
export function getEditorPlainText(editor: Editor): string {
  return editor.state.doc.textContent;
}
```

#### `getEditorHTML()`
```typescript
export function getEditorHTML(editor: Editor): string {
  return editor.getHTML();
}
```

#### `setEditorContent()`
```typescript
export function setEditorContent(editor: Editor, content: string) {
  editor.commands.setContent(content);
}
```

#### `insertTextAtPosition()`
```typescript
export function insertTextAtPosition(
  editor: Editor,
  text: string,
  from: number,
  to: number
) {
  editor.chain()
    .focus()
    .setTextSelection({ from, to })
    .insertContent(text)
    .run();
}
```

**File Location**: `src/lib/editorUtils.ts`

---

### segmentMapper.ts (Text Segmentation)

**Purpose**: Utilities for splitting text into segments for processing.

**Key Functions**:

#### `segmentText()`
```typescript
export function segmentText(
  text: string,
  maxLength: number = 4000
): Array<{ text: string; start: number; end: number }> {
  // Splits text respecting paragraph boundaries
  // Ensures no segment exceeds maxLength
  // Returns segments with position offsets
}
```

#### `smartChunkText()`
```typescript
export function smartChunkText(
  text: string,
  chunkSize: number = 4000,
  overlap: number = 200
): string[] {
  // Splits with overlap for context preservation
  // Respects sentence boundaries
  // Used for large document processing
}
```

**File Location**: `src/lib/segmentMapper.ts`

---

### mappingDiagnostics.ts (Debugging Tools)

**Purpose**: Diagnostic utilities for debugging position mapping issues.

**Key Functions**:

#### `diagnoseSuggestionMapping()`
```typescript
export function diagnoseSuggestionMapping(
  suggestion: UISuggestion,
  editorContent: string
): {
  isValid: boolean;
  actualText: string;
  expectedText: string;
  positionDrift: number;
} {
  // Checks if suggestion position matches expected text
  // Calculates position drift
  // Helps debug mapping issues
}
```

#### `visualizeSuggestionPositions()`
```typescript
export function visualizeSuggestionPositions(
  suggestions: UISuggestion[],
  content: string
): string {
  // Creates ASCII visualization of suggestion positions
  // Shows overlaps and gaps
  // Useful for debugging console output
}
```

**File Location**: `src/lib/mappingDiagnostics.ts`

---

### docxUtils.ts (DOCX Processing)

**Purpose**: Utilities for DOCX file processing (used in edge functions).

**Key Functions**:

#### `extractTextFromDocx()`
```typescript
export async function extractTextFromDocx(
  arrayBuffer: ArrayBuffer
): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
```

#### `convertDocxToHtml()`
```typescript
export async function convertDocxToHtml(
  arrayBuffer: ArrayBuffer
): Promise<string> {
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        // ... more mappings
      ],
      ignoreEmptyParagraphs: true,
    }
  );
  return result.value;
}
```

#### `calculateDocumentStats()`
```typescript
export function calculateDocumentStats(text: string): {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  sentenceCount: number;
} {
  return {
    wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
    characterCount: text.length,
    paragraphCount: text.split(/\n\n+/).length,
    sentenceCount: text.split(/[.!?]+/).length,
  };
}
```

**File Location**: `src/lib/docxUtils.ts`

---

### markdownUtils.ts (Markdown Conversion)

**Purpose**: Utilities for converting between Markdown and HTML (future export feature).

**Key Functions**:

#### `htmlToMarkdown()`
```typescript
export function htmlToMarkdown(html: string): string {
  // Convert HTML to Markdown
  // Preserve formatting
  // Handle edge cases
}
```

#### `markdownToHtml()`
```typescript
export function markdownToHtml(markdown: string): string {
  // Convert Markdown to HTML
  // Use remark/rehype pipeline
  // Sanitize output
}
```

**File Location**: `src/lib/markdownUtils.ts`

---

### utils.ts (General Utilities)

**Purpose**: General utility functions used throughout the app.

**Key Functions**:

#### `cn()` (Class Name Merger)
```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Used for combining Tailwind CSS classes with proper conflict resolution.

**File Location**: `src/lib/utils.ts`

---

## Common Patterns & Best Practices

### Type Safety
```typescript
// ✅ Good: Use discriminated unions
type Suggestion = 
  | { type: 'grammar'; rule: GrammarRule }
  | { type: 'style'; rule: StyleRule };

// ❌ Bad: Use any
const suggestion: any = { type: 'grammar' };
```

### Position Calculations
```typescript
// ✅ Good: Use ProseMirror positions
const from = state.doc.resolve(offset).pos;
const to = from + length;

// ❌ Bad: Use character offsets directly
// Breaks with HTML formatting, special characters
```

### Immutable Updates
```typescript
// ✅ Good: Return new array
function addCheck(checks: CheckItem[], newCheck: CheckItem): CheckItem[] {
  return [...checks, newCheck];
}

// ❌ Bad: Mutate array
function addCheck(checks: CheckItem[], newCheck: CheckItem) {
  checks.push(newCheck);
}
```

### Error Handling
```typescript
// ✅ Good: Graceful degradation
try {
  const suggestions = await generateSuggestions(content);
  return suggestions;
} catch (error) {
  console.error('Failed to generate suggestions:', error);
  return [];  // Return empty array, don't crash
}

// ❌ Bad: Let errors propagate
const suggestions = await generateSuggestions(content);
```

## Testing Strategies

### Unit Testing Utilities
```typescript
// Example: Test suggestion mapping
describe('mapServerSuggestionToUI', () => {
  it('should map server suggestion correctly', () => {
    const serverSugg: ServerSuggestion = {
      id: 'test-1',
      type: 'grammar',
      from: 0,
      to: 5,
      original: 'hello',
      replacement: 'Hello',
    };
    
    const uiSugg = mapServerSuggestionToUI(serverSugg);
    
    expect(uiSugg.originalText).toBe('hello');
    expect(uiSugg.suggestedText).toBe('Hello');
    expect(uiSugg.category).toBe('grammar');
  });
});
```

### Integration Testing
- Test with real TipTap editor instances
- Verify position calculations with formatted HTML
- Test plugin interactions with multiple decorations

## Performance Considerations

### Large Document Handling
- Limit decoration count (max 200 visible)
- Use DecorationSet.map() for efficient updates
- Debounce validation functions

### Memory Management
- Clear decorations when not needed
- Use WeakMap for metadata associations
- Avoid storing large strings in memory

## Related Documentation

- [Workspace Components](../components/workspace/CLAUDE.md) - UI components using these utilities
- [Edge Functions](../../supabase/functions/CLAUDE.md) - Server-side usage
- [Architecture Documentation](../../docs/architecture/README.md) - System design

---

**Last Updated**: September 30, 2025
