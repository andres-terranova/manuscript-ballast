import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from '@tiptap/core';
import type { CheckItem } from './styleValidator';

// Debounced remapping function
let checksRemapTimeout: NodeJS.Timeout | null = null;
const CHECKS_REMAP_DEBOUNCE_MS = 250;

export const checksPluginKey = new PluginKey("cmosChecks");

export const ChecksExtension = Extension.create({
  name: 'checks',

  addOptions() {
    return {
      getChecks: () => [] as CheckItem[],
      maxVisibleChecks: 200,
    }
  },

  addProseMirrorPlugins() {
    const { getChecks, maxVisibleChecks } = this.options;
    
    return [
      new Plugin({
        key: checksPluginKey,
        state: {
          init: (_cfg, state) => DecorationSet.create(state.doc, []),
          apply(tr, oldSet, _oldState, newState) {
            const metaRefresh = tr.getMeta(checksPluginKey);
            const shouldRebuild = metaRefresh === "refresh";
            
            // On explicit refresh: rebuild all decorations
            if (shouldRebuild) {
              console.log('Checks plugin rebuilding decorations on refresh');
              
              const allChecks = getChecks();
              const cappedList = allChecks.slice(0, maxVisibleChecks);
              
              if (cappedList.length === 0) {
                return DecorationSet.empty;
              }
              
              const decos: Decoration[] = [];
              for (const c of cappedList) {
                const from = Math.max(0, c.pmFrom ?? 0);
                let to = Math.max(from, c.pmTo ?? from);
                
                if (to > from) {
                  if (to - from < 2) {
                    const expand = 2;
                    const newFrom = Math.max(0, from - expand);
                    const newTo = Math.min(newState.doc.content.size, to + expand);
                    decos.push(Decoration.inline(newFrom, newTo, {
                      class: `check-highlight check-${c.rule}`,
                      id: `check-span-${c.id}`,
                      "data-check-id": c.id,
                      "data-rule": c.rule,
                      title: c.message,
                      "data-testid": `check-span-${c.id}`
                    }));
                  } else {
                    decos.push(Decoration.inline(from, to, {
                      class: `check-highlight check-${c.rule}`,
                      id: `check-span-${c.id}`,
                      "data-check-id": c.id,
                      "data-rule": c.rule,
                      title: c.message,
                      "data-testid": `check-span-${c.id}`
                    }));
                  }
                } else {
                  decos.push(Decoration.widget(from, () => {
                    const el = document.createElement("span");
                    el.id = `check-span-${c.id}`;
                    el.dataset.checkId = c.id;
                    el.dataset.rule = c.rule;
                    el.title = c.message;
                    el.setAttribute("data-testid", `check-span-${c.id}`);
                    el.className = `check-highlight check-${c.rule} check-point`;
                    return el;
                  }));
                }
              }
              return DecorationSet.create(tr.doc, decos);
            }
            
            // On doc changes: efficiently map existing decoration positions
            if (tr.docChanged) {
              const mappedSet = oldSet.map(tr.mapping, tr.doc);
              
              // Debounced remapping of check positions
              if (checksRemapTimeout) {
                clearTimeout(checksRemapTimeout);
              }
              checksRemapTimeout = setTimeout(() => {
                const allChecks = getChecks();
                // Update pmFrom/pmTo positions based on document changes
                allChecks.forEach(check => {
                  const newFrom = tr.mapping.map(check.pmFrom ?? 0, 1);
                  const newTo = check.pmTo ? tr.mapping.map(check.pmTo, -1) : newFrom;
                  check.pmFrom = newFrom;
                  check.pmTo = newTo;
                });
              }, CHECKS_REMAP_DEBOUNCE_MS);
              
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