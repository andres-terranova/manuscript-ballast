import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from '@tiptap/core';
import type { CheckItem } from './styleValidator';

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
            // Rebuild decorations when doc changes or a meta flag is present
            const needsRefresh = tr.docChanged || tr.getMeta(checksPluginKey) === "refresh";
            if (!needsRefresh) return oldSet;
            
            const allChecks = getChecks();
            const cappedList = allChecks.slice(0, maxVisibleChecks);
            console.log('Checks plugin creating decorations for', cappedList.length, 'of', allChecks.length, 'checks');
            
            // If no checks (could be empty due to toggle), return empty decoration set
            if (cappedList.length === 0) {
              return DecorationSet.empty;
            }
            const decos: Decoration[] = [];

            for (const c of cappedList) {
              const from = Math.max(0, c.pmFrom ?? 0);
              let to = Math.max(from, c.pmTo ?? from);
              
              if (to > from) {
                // Expand single-char matches for better visibility
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
                  // Normal inline decoration over range
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
                // Widget marker at point
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