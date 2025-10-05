import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { UISuggestion } from "./types";
import { sanitizeNote } from "./types";
import { mappingDiagnostics } from "./mappingDiagnostics";

// Plugin state: minimal position tracking only
export type PluginSuggestion = {
  id: string;
  pmFrom: number;
  pmTo: number;
  type: UISuggestion['type'];
  hidden?: boolean;
};

export const suggestionsPluginKey = new PluginKey("aiSuggestions");

export const SuggestionsExtension = Extension.create({
  name: 'suggestions',

  addOptions() {
    return {
      getUISuggestions: () => [] as UISuggestion[],
      maxVisibleSuggestions: 120, // Phase 1: cap at 120 for performance
    }
  },

  addProseMirrorPlugins() {
    const { getUISuggestions, maxVisibleSuggestions } = this.options;
    
    return [
      new Plugin({
        key: suggestionsPluginKey,
        state: {
          init: (_cfg, state) => {
            return {
              decorations: DecorationSet.empty,
              positions: [] as PluginSuggestion[]
            };
          },
          apply(tr, pluginState, _oldState, newState) {
            const metaRefresh = tr.getMeta(suggestionsPluginKey);
            const shouldRebuild = metaRefresh === "refresh";
            
            let newPositions = pluginState.positions;
            
            // Phase 1: StepMaps-based deterministic remapping
            if (tr.docChanged && !shouldRebuild) {
              const start = performance.now();
              
              // Remap positions using StepMaps - no debouncing!
              newPositions = pluginState.positions.map(pos => ({
                ...pos,
                pmFrom: tr.mapping.map(pos.pmFrom, 1),
                pmTo: tr.mapping.map(pos.pmTo, -1)
              }));
              
              const timingMs = performance.now() - start;
              mappingDiagnostics.logEvent({
                type: 'remap',
                success: true,
                itemCount: newPositions.length,
                timingMs
              });
            }
            
            // On explicit refresh: sync with external suggestions and rebuild
            if (shouldRebuild) {
              const start = performance.now();
              console.log('Suggestions plugin rebuilding decorations on refresh');
              
              const allSuggestions = getUISuggestions();
              const cappedList = allSuggestions.slice(0, maxVisibleSuggestions);
              
              // Update plugin positions from external state
              newPositions = cappedList.map(s => ({
                id: s.id,
                pmFrom: s.pmFrom,
                pmTo: s.pmTo,
                type: s.type
              }));
              
              if (cappedList.length === 0) {
                return {
                  decorations: DecorationSet.empty,
                  positions: []
                };
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
                    el.title = sanitizeNote(s.note);
                    return el;
                  }));
                } else {
                  const from = Math.max(0, s.pmFrom);
                  let to = Math.max(from, s.pmTo);
                  
                  // Validate positions are within document bounds
                  if (to > newState.doc.content.size) {
                    to = newState.doc.content.size;
                  }
                  if (from >= to) continue; // Skip invalid ranges
                  
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
              
              const timingMs = performance.now() - start;
              mappingDiagnostics.logEvent({
                type: 'mapping',
                success: true,
                itemCount: cappedList.length,
                timingMs
              });
              
              return {
                decorations: DecorationSet.create(tr.doc, decos),
                positions: newPositions
              };
            }
            
            // No changes needed
            if (tr.docChanged) {
              // Just return with remapped positions and mapped decorations
              return {
                decorations: pluginState.decorations.map(tr.mapping, tr.doc),
                positions: newPositions
              };
            }
            
            return pluginState;
          }
        },
        props: {
          decorations(state) {
            const pluginState = this.getState(state);
            return pluginState?.decorations || DecorationSet.empty;
          }
        },
        
        // Helper to get current plugin positions
        getPositions(state: unknown): PluginSuggestion[] {
          const pluginState = this.getState(state);
          return pluginState?.positions || [];
        }
      })
    ];
  },
});