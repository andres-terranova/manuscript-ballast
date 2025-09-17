import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { UISuggestion } from '@/lib/types'

export interface SuggestionModeOptions {
  getSuggestions?: () => UISuggestion[]
  onSuggestionApplied?: (suggestionId: string) => void
  onSuggestionRejected?: (suggestionId: string) => void
}

export const suggestionModePluginKey = new PluginKey('suggestionMode')

// Custom command interface for TipTap extensions
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    suggestionMode: {
      addSuggestionMarks: (suggestions: UISuggestion[]) => ReturnType
      applySuggestion: (suggestionId: string) => ReturnType
      acceptAllSuggestions: () => ReturnType
      clearAllSuggestions: () => ReturnType
    }
  }
}

// Create a simplified suggestion mode extension using TipTap patterns
export const SuggestionModeExtension = Extension.create<SuggestionModeOptions>({
  name: 'suggestionMode',

  addOptions() {
    return {
      getSuggestions: () => [],
      onSuggestionApplied: () => {},
      onSuggestionRejected: () => {},
    }
  },

  addStorage() {
    return {
      suggestions: [] as UISuggestion[],
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    return [
      new Plugin({
        key: suggestionModePluginKey,
        state: {
          init() {
            return {
              suggestions: [] as UISuggestion[],
              decorationSet: DecorationSet.empty,
            }
          },
          apply(tr, pluginState, oldState, newState) {
            let { suggestions, decorationSet } = pluginState

            // Check for refresh meta
            const meta = tr.getMeta(suggestionModePluginKey)
            if (meta === 'refresh') {
              const currentSuggestions = options.getSuggestions?.() || []
              suggestions = currentSuggestions
              
              // Create decorations for suggestions
              const decorations: Decoration[] = []
              
              currentSuggestions.forEach(suggestion => {
                const className = `suggestion-${suggestion.type} suggestion-${suggestion.category}`
                
                if (suggestion.type === 'insert') {
                  decorations.push(
                    Decoration.widget(suggestion.pmFrom, () => {
                      const span = document.createElement('span')
                      span.className = `${className} bg-green-200 dark:bg-green-800 px-1 rounded`
                      span.innerHTML = `<ins>${suggestion.after}</ins>`
                      span.title = suggestion.note
                      return span
                    })
                  )
                } else {
                  decorations.push(
                    Decoration.inline(suggestion.pmFrom, suggestion.pmTo, {
                      class: className + (suggestion.type === 'delete' 
                        ? ' bg-red-200 dark:bg-red-800 line-through' 
                        : ' bg-blue-200 dark:bg-blue-800'),
                      title: suggestion.note,
                    })
                  )
                }
              })
              
              decorationSet = DecorationSet.create(newState.doc, decorations)
            }

            // Map decorations through document changes
            if (tr.docChanged) {
              decorationSet = decorationSet.map(tr.mapping, tr.doc)
            }

            return { suggestions, decorationSet }
          },
        },
        props: {
          decorations(state) {
            return suggestionModePluginKey.getState(state)?.decorationSet
          },
        },
      }),
    ]
  },

  addCommands() {
    return {
      addSuggestionMarks: (suggestions: UISuggestion[]) => ({ editor }) => {
        this.storage.suggestions = suggestions
        const tr = editor.state.tr.setMeta(suggestionModePluginKey, 'refresh')
        editor.view.dispatch(tr)
        return true
      },

      applySuggestion: (suggestionId: string) => ({ editor }) => {
        const suggestion = this.storage.suggestions.find((s: UISuggestion) => s.id === suggestionId)
        if (!suggestion) return false

        try {
          if (suggestion.type === 'insert') {
            editor.commands.insertContentAt(suggestion.pmFrom, suggestion.after)
          } else if (suggestion.type === 'delete') {
            editor.commands.deleteRange({ from: suggestion.pmFrom, to: suggestion.pmTo })
          } else {
            editor.commands.deleteRange({ from: suggestion.pmFrom, to: suggestion.pmTo })
            editor.commands.insertContentAt(suggestion.pmFrom, suggestion.after)
          }

          // Remove the applied suggestion
          this.storage.suggestions = this.storage.suggestions.filter((s: UISuggestion) => s.id !== suggestionId)
          this.options.onSuggestionApplied?.(suggestionId)
          
          // Refresh decorations
          const tr = editor.state.tr.setMeta(suggestionModePluginKey, 'refresh')
          editor.view.dispatch(tr)
          
          return true
        } catch (error) {
          console.error('Error applying suggestion:', error)
          return false
        }
      },

      acceptAllSuggestions: () => ({ editor }) => {
        const suggestions = [...this.storage.suggestions]
        
        // Apply suggestions in reverse order to maintain positions
        suggestions.reverse().forEach((suggestion: UISuggestion) => {
          try {
            if (suggestion.type === 'insert') {
              editor.commands.insertContentAt(suggestion.pmFrom, suggestion.after)
            } else if (suggestion.type === 'delete') {
              editor.commands.deleteRange({ from: suggestion.pmFrom, to: suggestion.pmTo })
            } else {
              editor.commands.deleteRange({ from: suggestion.pmFrom, to: suggestion.pmTo })
              editor.commands.insertContentAt(suggestion.pmFrom, suggestion.after)
            }
          } catch (error) {
            console.error('Error applying suggestion:', error)
          }
        })

        // Clear all suggestions
        this.storage.suggestions = []
        const tr = editor.state.tr.setMeta(suggestionModePluginKey, 'refresh')
        editor.view.dispatch(tr)
        
        return true
      },

      clearAllSuggestions: () => ({ editor }) => {
        this.storage.suggestions = []
        const tr = editor.state.tr.setMeta(suggestionModePluginKey, 'refresh')
        editor.view.dispatch(tr)
        return true
      },
    }
  },
})

// Helper functions to work with the plugin
export function getSuggestionModePlugin(editor: any) {
  return suggestionModePluginKey.getState(editor.state);
}

export function refreshSuggestionMode(editor: any) {
  const tr = editor.state.tr.setMeta(suggestionModePluginKey, { type: 'refresh' });
  editor.view.dispatch(tr);
}