import { Extension } from '@tiptap/core'
import { suggestionModePlugin } from 'prosemirror-suggestion-mode'
import type { UISuggestion } from '@/lib/types'

export interface SuggestionModeOptions {
  getSuggestions?: () => UISuggestion[]
  onSuggestionApplied?: (suggestionId: string) => void
  onSuggestionRejected?: (suggestionId: string) => void
}

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

// Create a TipTap extension wrapping Dave Fowler's prosemirror-suggestion-mode plugin
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
      plugin: null as any,
    }
  },

  // Add the required schema modifications for suggestion marks
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          suggestionId: {
            default: null,
            parseHTML: element => element.getAttribute('data-suggestion-id'),
            renderHTML: attributes => {
              if (!attributes.suggestionId) {
                return {}
              }
              return {
                'data-suggestion-id': attributes.suggestionId,
              }
            },
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    // Configure the plugin with proper settings
    const plugin = suggestionModePlugin({
      username: 'Editor',
      inSuggestionMode: true
    })
    
    this.storage.plugin = plugin

    return [plugin]
  },

  addCommands() {
    return {
      addSuggestionMarks: (suggestions: UISuggestion[]) => ({ editor }) => {
        this.storage.suggestions = suggestions
        
        // Convert to Dave Fowler's format and add marks using the plugin's state
        const convertedSuggestions = suggestions.map(s => ({
          id: s.id,
          type: s.type === 'replace' ? 'delete' : s.type, // Map replace to delete for the plugin
          from: s.pmFrom,
          to: s.pmTo,
          text: s.after || '',
          note: s.note,
          actor: s.actor || 'Editor',
          category: s.category || 'manual'
        }))

        // Use the plugin's transaction approach to add suggestion marks
        if (editor.view && editor.view.state) {
          try {
            const tr = editor.view.state.tr.setMeta('addSuggestionMarks', convertedSuggestions)
            editor.view.dispatch(tr)
          } catch (error) {
            console.error('Error adding suggestion marks:', error)
          }
        }
        
        return true
      },

      applySuggestion: (suggestionId: string) => ({ editor }) => {
        const suggestion = this.storage.suggestions.find((s: UISuggestion) => s.id === suggestionId)
        if (!suggestion) return false

        try {
          // Use the plugin's transaction approach to apply a suggestion
          if (editor.view && editor.view.state) {
            const tr = editor.view.state.tr.setMeta('applySuggestion', suggestionId)
            editor.view.dispatch(tr)
            
            // Remove from our storage after successful application
            this.storage.suggestions = this.storage.suggestions.filter((s: UISuggestion) => s.id !== suggestionId)
            this.options.onSuggestionApplied?.(suggestionId)
          }
          
          return true
        } catch (error) {
          console.error('Error applying suggestion:', error)
          return false
        }
      },

      acceptAllSuggestions: () => ({ editor }) => {
        try {
          // Use the plugin's transaction approach to accept all suggestions
          if (editor.view && editor.view.state) {
            const tr = editor.view.state.tr.setMeta('acceptAllSuggestions', true)
            editor.view.dispatch(tr)
          }
          
          this.storage.suggestions = []
          return true
        } catch (error) {
          console.error('Error accepting all suggestions:', error)
          return false
        }
      },

      clearAllSuggestions: () => ({ editor }) => {
        try {
          // Use the plugin's transaction approach to clear all suggestions
          if (editor.view && editor.view.state) {
            const tr = editor.view.state.tr.setMeta('clearAllSuggestions', true)
            editor.view.dispatch(tr)
          }
          
          this.storage.suggestions = []
          return true
        } catch (error) {
          console.error('Error clearing suggestions:', error)
          return false
        }
      },
    }
  },
})

// Helper functions to work with the plugin
export function getSuggestionModePlugin(editor: any) {
  const extension = editor.extensionManager.extensions.find((ext: any) => ext.name === 'suggestionMode')
  return extension?.storage.plugin
}

export function refreshSuggestionMode(editor: any) {
  // Dave Fowler's plugin handles its own refreshing
  const plugin = getSuggestionModePlugin(editor)
  if (plugin && editor.view.state) {
    try {
      plugin.spec.refresh?.(editor.view)
    } catch (error) {
      console.error('Error refreshing suggestion mode:', error)
    }
  }
}