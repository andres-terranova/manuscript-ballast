import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { UISuggestion } from "./types";
import { sanitizeNote } from "./types";

export const suggestionsPluginKey = new PluginKey("aiSuggestions");

export const SuggestionsExtension = Extension.create({
  name: 'suggestions',

  addOptions() {
    return {
      getUISuggestions: () => [] as UISuggestion[],
    }
  },

  addProseMirrorPlugins() {
    const { getUISuggestions } = this.options;
    
    return [
      new Plugin({
        key: suggestionsPluginKey,
        state: {
          init: (_cfg, state) => DecorationSet.create(state.doc, []),
          apply(tr, oldSet, _oldState, newState) {
            // Rebuild decorations when doc changes or a meta flag is present
            const needsRefresh = tr.docChanged || tr.getMeta(suggestionsPluginKey) === "refresh";
            console.log('Plugin apply called, needsRefresh:', needsRefresh, 'docChanged:', tr.docChanged, 'meta:', tr.getMeta(suggestionsPluginKey));
            if (!needsRefresh) return oldSet;
            
            const list = getUISuggestions();
            console.log('Plugin creating decorations for', list.length, 'suggestions', list);
            
            // If no suggestions (could be empty due to toggle), return empty decoration set
            if (list.length === 0) {
              return DecorationSet.empty;
            }
            const decos: Decoration[] = [];

            for (const s of list) {
              if (s.type === "insert") {
                // For insert suggestions, show a widget at the insertion point
                decos.push(Decoration.widget(s.pmFrom, () => {
                  const el = document.createElement("span");
                  el.id = `suggestion-span-${s.id}`;
                  el.dataset.suggestionId = s.id;
                  el.dataset.type = s.type;
                  el.dataset.actor = s.actor;
                  el.setAttribute("data-testid", `suggestion-span-${s.id}`);
                  el.className = "suggest-insert";
                  el.textContent = `+${s.after}`;
                  el.title = sanitizeNote(s.note);
                  return el;
                }));
              } else {
                // For delete/replace suggestions, show inline decoration over the range
                const from = Math.max(0, s.pmFrom);
                let to = Math.max(from, s.pmTo);
                
                // Expand single-char matches for better visibility
                if (to - from < 2) {
                  const expand = 2;
                  const newFrom = Math.max(0, from - expand);
                  const newTo = Math.min(newState.doc.content.size, to + expand);
                  decos.push(Decoration.inline(newFrom, newTo, {
                    class: s.type === "delete" ? "suggest-delete" : "suggest-replace",
                    "data-suggestion-id": s.id,
                    "data-actor": s.actor,
                    id: `suggestion-span-${s.id}`,
                    "data-testid": `suggestion-span-${s.id}`,
                    title: sanitizeNote(s.note)
                  }));
                } else {
                  decos.push(Decoration.inline(from, to, {
                    class: s.type === "delete" ? "suggest-delete" : "suggest-replace",
                    "data-suggestion-id": s.id,
                    "data-actor": s.actor,
                    id: `suggestion-span-${s.id}`,
                    "data-testid": `suggestion-span-${s.id}`,
                    title: sanitizeNote(s.note)
                  }));
                }
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