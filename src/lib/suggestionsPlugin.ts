import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { UISuggestion } from "./types";
import { sanitizeNote } from "./types";

// Debounced remapping function
let remapTimeout: NodeJS.Timeout | null = null;
const REMAP_DEBOUNCE_MS = 250;

export const suggestionsPluginKey = new PluginKey("aiSuggestions");

export const SuggestionsExtension = Extension.create({
  name: 'suggestions',

  addOptions() {
    return {
      getUISuggestions: () => [] as UISuggestion[],
      maxVisibleSuggestions: 200,
    }
  },

  addProseMirrorPlugins() {
    const { getUISuggestions, maxVisibleSuggestions } = this.options;
    
    return [
      new Plugin({
        key: suggestionsPluginKey,
        state: {
          init: (_cfg, state) => DecorationSet.create(state.doc, []),
          apply(tr, oldSet, _oldState, newState) {
            const metaRefresh = tr.getMeta(suggestionsPluginKey);
            const shouldRebuild = metaRefresh === "refresh";
            
            // On explicit refresh: rebuild all decorations
            if (shouldRebuild) {
              console.log('Suggestions plugin rebuilding decorations on refresh');
              
              const allSuggestions = getUISuggestions();
              const cappedList = allSuggestions.slice(0, maxVisibleSuggestions);
              
              if (cappedList.length === 0) {
                return DecorationSet.empty;
              }
              
              const decos: Decoration[] = [];
              for (const s of cappedList) {
                if (s.type === "insert") {
                  decos.push(Decoration.widget(s.pmFrom, () => {
                    const el = document.createElement("span");
                    el.id = `suggestion-span-${s.id}`;
                    el.dataset.suggestionId = s.id;
                    el.dataset.type = s.type;
                    el.dataset.actor = s.actor;
                    el.setAttribute("data-testid", `suggestion-span-${s.id}`);
                    el.className = "suggest-insert";
                    el.textContent = `+${s.after}`;
                    el.title = s.note;
                    return el;
                  }));
                } else {
                  const from = Math.max(0, s.pmFrom);
                  let to = Math.max(from, s.pmTo);
                  
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
                      title: s.note
                    }));
                  } else {
                    decos.push(Decoration.inline(from, to, {
                      class: s.type === "delete" ? "suggest-delete" : "suggest-replace",
                      "data-suggestion-id": s.id,
                      "data-actor": s.actor,
                      id: `suggestion-span-${s.id}`,
                      "data-testid": `suggestion-span-${s.id}`,
                      title: s.note
                    }));
                  }
                }
              }
              return DecorationSet.create(tr.doc, decos);
            }
            
            // On doc changes: efficiently map existing decoration positions
            if (tr.docChanged) {
              const mappedSet = oldSet.map(tr.mapping, tr.doc);
              
              // Debounced remapping of suggestion positions
              if (remapTimeout) {
                clearTimeout(remapTimeout);
              }
              remapTimeout = setTimeout(() => {
                const allSuggestions = getUISuggestions();
                // Update pmFrom/pmTo positions based on document changes
                allSuggestions.forEach(suggestion => {
                  const newFrom = tr.mapping.map(suggestion.pmFrom, 1);
                  const newTo = suggestion.pmTo ? tr.mapping.map(suggestion.pmTo, -1) : newFrom;
                  suggestion.pmFrom = newFrom;
                  suggestion.pmTo = newTo;
                });
              }, REMAP_DEBOUNCE_MS);
              
              return mappedSet;
            }
            
            return oldSet;
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