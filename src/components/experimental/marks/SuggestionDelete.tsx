import { Mark } from "@tiptap/core";

export const SuggestionDelete = Mark.create({
  name: "suggestion_delete",
  inclusive: false,
  excludes: "suggestion_insert",
  
  addAttributes() {
    return {
      username: { default: null },
      reason: { default: null },
      data: { default: null },
    };
  },

  parseHTML() {
    return [
      { tag: "span.suggestion-delete" },
      { tag: "span.pm-suggestion-delete" },
      { tag: "span.prosemirror-suggestion-delete" },
      { tag: 'mark[data-suggestion="delete"]' },
      { tag: 'span[data-suggestion="delete"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const classes = [
      HTMLAttributes.class,
      "suggest-delete",
      "pm-suggestion-delete",
      "prosemirror-suggestion-delete", 
      "suggestion",
      "delete",
      // Tailwind fallback classes
      "bg-red-100",
      "text-red-800",
      "line-through",
      "px-0.5", 
      "rounded-sm",
    ]
      .filter(Boolean)
      .join(" ");

    const attributes: any = {
      ...HTMLAttributes,
      class: classes,
      'data-suggestion': 'delete',
      'data-actor': 'Tool',
      title: (HTMLAttributes as any)?.reason || undefined,
    };

    return ["span", attributes, 0];
  },
});