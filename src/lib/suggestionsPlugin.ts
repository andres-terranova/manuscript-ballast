import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { UISuggestion } from "./suggestionMapper";

export const suggestionsPluginKey = new PluginKey("aiSuggestions");

export const SuggestionsExtension = Extension.create({
  name: 'suggestions',

  addOptions() {
    return {
      getUISuggestions: () => [] as UISuggestion[],
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: suggestionsPluginKey,
        state: {
          init: (_cfg, state) => DecorationSet.create(state.doc, []),
          apply(tr, oldSet) {
            // Rebuild decorations when doc changes or a meta flag is present
            const needsRefresh = tr.docChanged || tr.getMeta(suggestionsPluginKey) === "refresh";
            if (!needsRefresh) return oldSet;
            
            const list = this.options.getUISuggestions();
            const decos: Decoration[] = [];

            for (const s of list) {
              if (s.type === "insert") {
                // For insert suggestions, show a widget at the insertion point
                decos.push(Decoration.widget(s.pmFrom, () => {
                  const el = document.createElement("span");
                  el.id = `suggestion-span-${s.id}`;
                  el.dataset.suggestionId = s.id;
                  el.dataset.type = s.type;
                  el.setAttribute("data-testid", `suggestion-span-${s.id}`);
                  el.className = "suggest-insert underline decoration-dotted decoration-2 decoration-green-500 cursor-pointer";
                  el.style.backgroundColor = "rgba(34, 197, 94, 0.1)";
                  el.textContent = `+${s.after}`;
                  el.title = s.note;
                  return el;
                }));
              } else {
                // For delete/replace suggestions, show inline decoration over the range
                decos.push(Decoration.inline(s.pmFrom, s.pmTo, {
                  class: s.type === "delete" 
                    ? "suggest-delete line-through decoration-2 decoration-red-500 bg-red-50 cursor-pointer"
                    : "suggest-replace line-through decoration-2 decoration-yellow-500 bg-yellow-50 cursor-pointer",
                  "data-suggestion-id": s.id,
                  id: `suggestion-span-${s.id}`,
                  "data-testid": `suggestion-span-${s.id}`,
                  title: s.note
                }));
              }
            }
            
            return DecorationSet.create(tr.doc, decos);
          }
        },
        props: {
          decorations(state) {
            return this.getState(state);
          }
        }
      })
    ];
  },
});