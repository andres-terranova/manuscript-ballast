import { Mark } from "@tiptap/core";

export const SuggestionInsert = Mark.create({
  name: "suggestion_insert",
  inclusive: false,
  excludes: "suggestion_delete",
  addAttributes() {
    return { 
      username: { default: null }, 
      reason: { default: null }, 
      data: { default: null } 
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
    const cls = [
      HTMLAttributes.class,
      "suggestion-insert",
      "pm-suggestion-insert",
      "prosemirror-suggestion-insert",
      "suggestion",
      "insert",
    ]
      .filter(Boolean)
      .join(" ");
    const attrs: any = {
      ...HTMLAttributes,
      class: cls,
      'data-suggestion': 'insert',
      title: (HTMLAttributes as any)?.reason || undefined,
    };
    return ["span", attrs, 0];
  },
});

export const SuggestionDelete = Mark.create({
  name: "suggestion_delete",
  inclusive: false,
  excludes: "suggestion_insert",
  addAttributes() {
    return { 
      username: { default: null }, 
      reason: { default: null }, 
      data: { default: null } 
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
    const cls = [
      HTMLAttributes.class,
      "suggestion-delete",
      "pm-suggestion-delete",
      "prosemirror-suggestion-delete",
      "suggestion",
      "delete",
    ]
      .filter(Boolean)
      .join(" ");
    const attrs: any = {
      ...HTMLAttributes,
      class: cls,
      'data-suggestion': 'delete',
      title: (HTMLAttributes as any)?.reason || undefined,
    };
    return ["span", attrs, 0];
  },
});