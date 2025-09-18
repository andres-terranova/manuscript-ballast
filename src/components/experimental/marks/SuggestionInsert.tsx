import { Mark } from "@tiptap/core";

export const SuggestionInsert = Mark.create({
  name: "suggestion_insert",
  inclusive: false,
  excludes: "suggestion_delete",
  
  addAttributes() {
    return {
      username: { default: null },
      reason: { default: null },
      data: { default: null },
    };
  },

  parseHTML() {
    return [
      { tag: "span.suggestion-insert" },
      { tag: "span.pm-suggestion-insert" },
      { tag: "span.prosemirror-suggestion-insert" },
      { tag: 'mark[data-suggestion="insert"]' },
      { tag: 'span[data-suggestion="insert"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const classes = [
      HTMLAttributes.class,
      "suggest-insert",
      "pm-suggestion-insert", 
      "prosemirror-suggestion-insert",
      "suggestion",
      "insert",
      // Tailwind fallback classes
      "bg-green-100",
      "text-green-800",
      "underline",
      "px-0.5",
      "rounded-sm",
    ]
      .filter(Boolean)
      .join(" ");

    const attributes: any = {
      ...HTMLAttributes,
      class: classes,
      'data-suggestion': 'insert',
      'data-actor': 'Tool',
      title: (HTMLAttributes as any)?.reason || undefined,
    };

    return ["span", attributes, 0];
  },
});