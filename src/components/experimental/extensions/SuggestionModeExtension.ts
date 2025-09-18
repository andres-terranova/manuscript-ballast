import { Extension } from '@tiptap/core';
import { suggestionModePlugin } from 'prosemirror-suggestion-mode';

export const SuggestionModeExtension = Extension.create({
  name: 'suggestionMode',

  addOptions() {
    return {
      username: "Current User",
      data: { source: "user" },
    };
  },

  addProseMirrorPlugins() {
    return [
      suggestionModePlugin({
        username: this.options.username,
        data: this.options.data,
      }),
    ];
  },
});