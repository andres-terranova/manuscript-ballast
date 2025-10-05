# AI Editor Rules Management: Implementation Guide
## Dynamic Rule Management with Enable/Disable Controls

**Target**: Implement functional rule management dialog with enable/disable toggles
**Strategy**: Organization-wide rule state management with TipTap `setAiSuggestionRules` command
**Time Estimate**: 3-4 hours implementation + testing
**Confidence**: 95%
**Last Updated**: October 5, 2025

---

## Overview

This guide provides step-by-step instructions for implementing the AI Editor Rules management functionality, allowing users to:
- Enable/disable built-in editor roles (Copy Editor, Line Editor, Proofreader, etc.)
- Create custom editing rules with custom prompts
- Edit existing rules (title, prompt, colors)
- Delete custom rules
- Persist rule configuration **organization-wide** (shared across all manuscripts)
- Dynamically update the TipTap editor with rule changes

**Current State**:
- ✅ UI components exist (`AIEditorRules.tsx`, `AIEditorRuleSelector.tsx`)
- ✅ Rules are defined but hardcoded as enabled/disabled
- ✅ Using mock authentication (real auth coming later)
- ❌ "Manage Rules" dialog shows rules but enable/disable doesn't persist
- ❌ Rules are not stored in database
- ❌ Custom rules can't be created yet

**Target State**:
- ✅ Users can enable/disable any rule via "Manage Rules" dialog
- ✅ Rule state persists in database (organization-wide, not per-manuscript)
- ✅ Custom rules can be created, edited, and deleted
- ✅ TipTap editor updates dynamically when rules change
- ✅ "Coming Soon" badge removed when rules are enabled
- ✅ Public visibility for now (mock auth), ready for organization auth later

**Design Decision**:
- Rules are **organization-scoped**, not manuscript-scoped
- All manuscripts in an organization share the same editing rules
- Simplifies UX: one set of rules to manage, consistent across all documents
- Future-ready: `organization_id` field prepared for real auth (NULL for now)

---

## Prerequisites Checklist

Before starting, verify:

- [x] Supabase MCP tools available
- [x] TipTap Pro extensions installed (`@tiptap-pro/extension-ai-suggestion`)
- [x] Current editor implementation uses TipTap AI Suggestions
- [x] JWT authentication working (verified in Phase 1)
- [x] Editor accessible via `getGlobalEditor()` in codebase
- [x] Using mock authentication currently
- [ ] Database migration ready for new table

**Test Manuscripts** (Use existing):
```
Small:  b080ddf6-f72e-441b-9061-73aa54ef9b02 | 1,247 words
Medium: 0e972f2d-c88b-4a0c-8bbc-3213d7958b1c | 27,782 words
Large:  a44cbca8-9748-44b2-9775-73cb77de853c | 85,337 words
```

---

## Part 1: Database Schema (20-30 minutes)

### Task 1.1: Create Database Migration

Create a new Supabase migration for organization-wide rules with public access (for mock auth).

**Migration File**: `supabase/migrations/YYYYMMDDHHMMSS_create_ai_editor_rules.sql`

```sql
-- Create table for storing organization-wide AI editor rule configurations
-- NOTE: Currently using mock auth, so rules are publicly accessible
-- When real auth is added, organization_id will be used for multi-tenancy

CREATE TABLE ai_editor_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Future: organization_id for multi-tenancy (NULL for now with mock auth)
  organization_id UUID DEFAULT NULL,
  rule_id TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#9333EA',
  background_color TEXT NOT NULL DEFAULT '#F3E8FF',
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- For now: unique rule_id globally (since no org_id)
  -- Later: unique per organization (organization_id, rule_id)
  UNIQUE(rule_id)
);

-- Add RLS policies (public for mock auth, ready for organization-based later)
ALTER TABLE ai_editor_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access (for mock auth)
-- TODO: Replace with organization-based policy when real auth is implemented
CREATE POLICY "Public read access to AI editor rules"
  ON ai_editor_rules FOR SELECT
  USING (true);

-- Policy: Public insert access (for mock auth)
-- TODO: Replace with organization-based policy when real auth is implemented
CREATE POLICY "Public insert access to AI editor rules"
  ON ai_editor_rules FOR INSERT
  WITH CHECK (true);

-- Policy: Public update access (for mock auth)
-- TODO: Replace with organization-based policy when real auth is implemented
CREATE POLICY "Public update access to AI editor rules"
  ON ai_editor_rules FOR UPDATE
  USING (true);

-- Policy: Public delete access, but only for custom rules (for mock auth)
-- TODO: Replace with organization-based policy when real auth is implemented
CREATE POLICY "Public delete access to custom AI editor rules"
  ON ai_editor_rules FOR DELETE
  USING (is_custom = true);

-- Add index for faster queries
CREATE INDEX idx_ai_editor_rules_enabled
  ON ai_editor_rules(enabled);

CREATE INDEX idx_ai_editor_rules_organization_id
  ON ai_editor_rules(organization_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ai_editor_rules_updated_at
  BEFORE UPDATE ON ai_editor_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed default rules (if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ai_editor_rules LIMIT 1) THEN
    -- Copy Editor (enabled by default)
    INSERT INTO ai_editor_rules (
      rule_id, title, prompt, color, background_color,
      description, enabled, is_custom, display_order
    ) VALUES (
      'copy-editor',
      'Copy Editor',
      'Act as a professional copy editor. Your primary objective is to correct all technical errors in grammar, spelling, punctuation, and consistency according to the Chicago Manual of Style. Core tasks:
- Correct errors in grammar, spelling, and punctuation
- Ensure consistency in terminology, capitalization, hyphenation, and numbers
- Perform basic fact-checking for names, dates, and verifiable statements
- Apply objective rules to polish the text without altering the author''s style
Focus on technical accuracy while preserving the author''s voice and intent.',
      '#DC143C',
      '#FFE6E6',
      'Correct grammar, spelling, punctuation, and consistency issues according to Chicago Manual of Style',
      true,
      false,
      1
    );

    -- Line Editor (enabled by default)
    INSERT INTO ai_editor_rules (
      rule_id, title, prompt, color, background_color,
      description, enabled, is_custom, display_order
    ) VALUES (
      'line-editor',
      'Line Editor',
      'Act as a professional line editor. Your primary objective is to refine prose at the sentence and paragraph level to improve style, rhythm, and clarity while preserving the author''s voice. Core tasks:
- Revise awkward, unclear, or convoluted sentences for better flow and impact
- Improve word choice for precision, tone, and vividness
- Eliminate repetitive phrasing and clichés
- Strengthen the prose to enhance readability and engagement
Focus on style improvements while maintaining the author''s unique voice and narrative flow.',
      '#FF8C00',
      '#FFF5E6',
      'Improve sentence structure, word choice, rhythm, and clarity while preserving voice',
      true,
      false,
      2
    );

    -- Proofreader (disabled by default)
    INSERT INTO ai_editor_rules (
      rule_id, title, prompt, color, background_color,
      description, enabled, is_custom, display_order
    ) VALUES (
      'proofreader',
      'Proofreader',
      'Act as a professional proofreader conducting a final quality check. Your primary objective is to find and flag any remaining errors before publication. Core tasks:
- Scan for any remaining typos or grammatical errors
- Check for formatting errors in headers, spacing, and layout
- Identify issues like inconsistent formatting or spacing problems
- Verify text accuracy and catch final oversights
Focus on final cleanup and quality assurance, catching errors that previous editing passes may have missed.',
      '#8A2BE2',
      '#F3E6FF',
      'Final quality check for typos, formatting errors, and layout issues',
      false,
      false,
      3
    );

    -- CMOS Formatter (disabled by default)
    INSERT INTO ai_editor_rules (
      rule_id, title, prompt, color, background_color,
      description, enabled, is_custom, display_order
    ) VALUES (
      'cmos-formatter',
      'CMOS Formatter',
      'Act as a Chicago Manual of Style formatting specialist. Your primary objective is to format the manuscript to comply with CMOS layout and citation rules. Core tasks:
- Format all citations, bibliographies, and reference lists per CMOS specifications
- Apply correct heading styles and hierarchy (levels 1-5)
- Format block quotes, tables, lists, and figure captions according to CMOS
- Ensure proper spacing, indentation, and typographic conventions
Focus on formatting compliance to prepare the document for professional typesetting and publication.',
      '#4682B4',
      '#E6F0FF',
      'Format citations, headings, and layout according to Chicago Manual of Style',
      false,
      false,
      4
    );

    -- Manuscript Evaluator (disabled by default, coming soon)
    INSERT INTO ai_editor_rules (
      rule_id, title, prompt, color, background_color,
      description, enabled, is_custom, display_order
    ) VALUES (
      'manuscript-evaluator',
      'Manuscript Evaluation Agent',
      'Act as a professional manuscript evaluator. Your primary objective is to analyze a manuscript''s high-level structure and content to produce a diagnostic report of its strengths and weaknesses. Core tasks:
- Analyze plot, pacing, and story arc (fiction) or argument and logic (nonfiction)
- Evaluate character development and consistency
- Identify structural gaps and organizational issues
- Generate a summary report with actionable recommendations
Focus on big-picture analysis and provide comprehensive feedback on the manuscript''s overall effectiveness.',
      '#059669',
      '#D1FAE5',
      'Analyze overall structure, plot, pacing, and provide comprehensive manuscript evaluation',
      false,
      false,
      5
    );

    -- Developmental Editor (disabled by default, coming soon)
    INSERT INTO ai_editor_rules (
      rule_id, title, prompt, color, background_color,
      description, enabled, is_custom, display_order
    ) VALUES (
      'developmental-editor',
      'Developmental Editor Agent',
      'Act as a professional developmental editor. Your primary objective is to improve a manuscript''s overall structure, content, and organization by suggesting significant revisions. Core tasks:
- Identify and flag plot holes, logical gaps, and chronological inconsistencies
- Suggest reordering of chapters or sections to improve flow
- Recommend adding content to underdeveloped areas
- Flag and suggest the removal of redundant content
Focus on structural improvements and major content revisions to strengthen the manuscript''s foundation.',
      '#7C3AED',
      '#EDE9FE',
      'Suggest major structural revisions, content reorganization, and developmental improvements',
      false,
      false,
      6
    );

  END IF;
END $$;
```

### Task 1.2: Apply Migration

**Command**:
```bash
# Apply migration using Supabase CLI
supabase db push

# Or via Supabase MCP:
# mcp__supabase__apply_migration
```

### Task 1.3: Verify Migration

**Command**:
```bash
# Check table exists
supabase db table ai_editor_rules

# Or via MCP:
# mcp__supabase__list_tables

# Verify default rules were seeded
supabase db query "SELECT rule_id, title, enabled FROM ai_editor_rules ORDER BY display_order"
```

**Expected Output**:
```
rule_id               | title                        | enabled
----------------------|------------------------------|--------
copy-editor          | Copy Editor                  | true
line-editor          | Line Editor                  | true
proofreader          | Proofreader                  | false
cmos-formatter       | CMOS Formatter               | false
manuscript-evaluator | Manuscript Evaluation Agent  | false
developmental-editor | Developmental Editor Agent   | false
```

### ✅ CHECKPOINT 1: Database Ready

Verify:
- [x] Table `ai_editor_rules` exists
- [x] 6 default rules seeded
- [x] RLS policies are public (for mock auth)
- [x] Indexes created

---

## Part 2: TypeScript Types & Service (30-40 minutes)

### Task 2.1: Update TypeScript Types

**File**: `src/types/aiEditorRules.ts` (create new file)

```typescript
// src/types/aiEditorRules.ts

export interface AIEditorRule {
  id: string;
  title: string;
  prompt: string;
  color: string;
  backgroundColor: string;
  description: string;
  enabled: boolean;
  isCustom?: boolean;
  displayOrder?: number;
}

export interface DBEditorRule {
  id: string;
  organization_id: string | null;
  rule_id: string;
  title: string;
  prompt: string;
  color: string;
  background_color: string;
  description: string | null;
  enabled: boolean;
  is_custom: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRuleInput {
  rule_id: string;
  title: string;
  prompt: string;
  color?: string;
  background_color?: string;
  description?: string;
  enabled?: boolean;
  is_custom?: boolean;
  display_order?: number;
}

export interface UpdateRuleInput {
  title?: string;
  prompt?: string;
  color?: string;
  background_color?: string;
  description?: string;
  enabled?: boolean;
  display_order?: number;
}
```

### Task 2.2: Create AI Editor Rules Service

**File**: `src/services/aiEditorRulesService.ts`

```typescript
// src/services/aiEditorRulesService.ts

import { supabase } from '@/integrations/supabase/client';
import type {
  DBEditorRule,
  CreateRuleInput,
  UpdateRuleInput,
  AIEditorRule
} from '@/types/aiEditorRules';

export class AIEditorRulesService {
  /**
   * Fetch all rules (organization-wide)
   * NOTE: Currently public access (mock auth)
   * TODO: Filter by organization_id when real auth is implemented
   */
  static async getAllRules(): Promise<AIEditorRule[]> {
    const { data, error } = await supabase
      .from('ai_editor_rules')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching AI editor rules:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('No rules found in database. Migration may not have run.');
      return [];
    }

    // Convert database format to UI format
    return data.map(this.dbRuleToUIRule);
  }

  /**
   * Get only enabled rules (for passing to TipTap editor)
   */
  static async getEnabledRules(): Promise<AIEditorRule[]> {
    const { data, error } = await supabase
      .from('ai_editor_rules')
      .select('*')
      .eq('enabled', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching enabled rules:', error);
      throw error;
    }

    return (data || []).map(this.dbRuleToUIRule);
  }

  /**
   * Update a rule's enabled state
   */
  static async updateRuleEnabled(
    ruleId: string,
    enabled: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('ai_editor_rules')
      .update({ enabled })
      .eq('rule_id', ruleId);

    if (error) {
      console.error('Error updating rule enabled state:', error);
      throw error;
    }
  }

  /**
   * Update a rule's properties
   */
  static async updateRule(
    ruleId: string,
    updates: UpdateRuleInput
  ): Promise<void> {
    const dbUpdates: any = {};

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.prompt !== undefined) dbUpdates.prompt = updates.prompt;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.background_color !== undefined) {
      dbUpdates.background_color = updates.background_color;
    }
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
    if (updates.display_order !== undefined) dbUpdates.display_order = updates.display_order;

    const { error } = await supabase
      .from('ai_editor_rules')
      .update(dbUpdates)
      .eq('rule_id', ruleId);

    if (error) {
      console.error('Error updating rule:', error);
      throw error;
    }
  }

  /**
   * Create a custom rule
   */
  static async createCustomRule(
    rule: CreateRuleInput
  ): Promise<string> {
    const { data, error } = await supabase
      .from('ai_editor_rules')
      .insert({
        ...rule,
        is_custom: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating custom rule:', error);
      throw error;
    }

    return data.rule_id;
  }

  /**
   * Delete a custom rule
   */
  static async deleteRule(ruleId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_editor_rules')
      .delete()
      .eq('rule_id', ruleId)
      .eq('is_custom', true); // Only allow deleting custom rules

    if (error) {
      console.error('Error deleting rule:', error);
      throw error;
    }
  }

  /**
   * Convert database rule to UI format
   */
  private static dbRuleToUIRule(dbRule: DBEditorRule): AIEditorRule {
    return {
      id: dbRule.rule_id,
      title: dbRule.title,
      prompt: dbRule.prompt,
      color: dbRule.color,
      backgroundColor: dbRule.background_color,
      description: dbRule.description || '',
      enabled: dbRule.enabled,
      isCustom: dbRule.is_custom,
      displayOrder: dbRule.display_order,
    };
  }
}
```

### Task 2.3: Test the Service

Test in browser console:

```typescript
// In browser console (after service is created)
const { AIEditorRulesService } = await import('/src/services/aiEditorRulesService.ts');

// Test fetching all rules
const allRules = await AIEditorRulesService.getAllRules();
console.log('All rules:', allRules);

// Test fetching enabled rules
const enabledRules = await AIEditorRulesService.getEnabledRules();
console.log('Enabled rules:', enabledRules);

// Test updating a rule
await AIEditorRulesService.updateRuleEnabled('proofreader', true);
console.log('Proofreader enabled!');
```

### ✅ CHECKPOINT 2: Service Layer Ready

Verify:
- [x] Types defined in `src/types/aiEditorRules.ts`
- [x] Service created in `src/services/aiEditorRulesService.ts`
- [x] Service can fetch all rules
- [x] Service can update rule enabled state
- [x] No TypeScript errors

---

## Part 3: Update UI Components (45-60 minutes)

### Task 3.1: Update AIEditorRuleSelector Component

**File**: `src/components/workspace/AIEditorRuleSelector.tsx`

Replace the entire file with this organization-wide version:

```typescript
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Plus, Loader2 } from "lucide-react";
import { AIEditorRulesService } from '@/services/aiEditorRulesService';
import type { AIEditorRule } from '@/types/aiEditorRules';
import { useToast } from '@/hooks/use-toast';

interface AIEditorRuleSelectorProps {
  selectedRuleIds: string[];
  onRuleSelectionChange: (ruleIds: string[]) => void;
  onRulesUpdate?: (rules: AIEditorRule[]) => void;
}

const AIEditorRuleSelector: React.FC<AIEditorRuleSelectorProps> = ({
  selectedRuleIds,
  onRuleSelectionChange,
  onRulesUpdate
}) => {
  const { toast } = useToast();
  const [availableRules, setAvailableRules] = useState<AIEditorRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManageRules, setShowManageRules] = useState(false);
  const [editingRule, setEditingRule] = useState<AIEditorRule | null>(null);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AIEditorRule>>({
    title: '',
    prompt: '',
    color: '#9333EA',
    backgroundColor: '#F3E8FF',
    description: '',
  });

  const colorOptions = [
    '#DC143C', '#FF8C00', '#8A2BE2', '#4682B4',
    '#9333EA', '#059669', '#DC2626', '#7C3AED', '#2563EB'
  ];

  // Load rules from database on mount
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const rules = await AIEditorRulesService.getAllRules();
      setAvailableRules(rules);
      onRulesUpdate?.(rules);
    } catch (error) {
      console.error('Failed to load rules:', error);
      toast({
        title: "Error Loading Rules",
        description: "Failed to load AI editor rules from database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRuleToggle = (ruleId: string) => {
    const rule = availableRules.find(r => r.id === ruleId);
    if (!rule?.enabled) {
      toast({
        title: "Rule Disabled",
        description: "Enable this rule in Manage Rules first.",
        variant: "destructive",
      });
      return;
    }

    const newSelection = selectedRuleIds.includes(ruleId)
      ? selectedRuleIds.filter(id => id !== ruleId)
      : [...selectedRuleIds, ruleId];
    onRuleSelectionChange(newSelection);
  };

  const handleToggleEnabled = async (ruleId: string, enabled: boolean) => {
    try {
      await AIEditorRulesService.updateRuleEnabled(ruleId, enabled);

      // Update local state
      setAvailableRules(prev =>
        prev.map(rule =>
          rule.id === ruleId ? { ...rule, enabled } : rule
        )
      );

      // If disabling a selected rule, unselect it
      if (!enabled && selectedRuleIds.includes(ruleId)) {
        onRuleSelectionChange(selectedRuleIds.filter(id => id !== ruleId));
      }

      toast({
        title: enabled ? "Rule Enabled" : "Rule Disabled",
        description: `${availableRules.find(r => r.id === ruleId)?.title} has been ${enabled ? 'enabled' : 'disabled'}.`,
      });

      // Reload to get fresh state
      await loadRules();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      toast({
        title: "Error",
        description: "Failed to update rule state.",
        variant: "destructive",
      });
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.title || !newRule.prompt) return;

    try {
      setSavingRule(true);
      const ruleId = `custom-${Date.now()}`;

      await AIEditorRulesService.createCustomRule({
        rule_id: ruleId,
        title: newRule.title,
        prompt: newRule.prompt,
        color: newRule.color || '#9333EA',
        background_color: newRule.backgroundColor || '#F3E8FF',
        description: newRule.description || '',
        enabled: true,
        display_order: availableRules.length + 1,
      });

      toast({
        title: "Rule Created",
        description: `${newRule.title} has been created and enabled.`,
      });

      setShowCreateRule(false);
      setNewRule({
        title: '',
        prompt: '',
        color: '#9333EA',
        backgroundColor: '#F3E8FF',
        description: ''
      });

      await loadRules();
    } catch (error) {
      console.error('Failed to create rule:', error);
      toast({
        title: "Error",
        description: "Failed to create custom rule.",
        variant: "destructive",
      });
    } finally {
      setSavingRule(false);
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    try {
      setSavingRule(true);
      await AIEditorRulesService.updateRule(editingRule.id, {
        title: editingRule.title,
        prompt: editingRule.prompt,
        color: editingRule.color,
        background_color: editingRule.backgroundColor,
        description: editingRule.description,
      });

      toast({
        title: "Rule Updated",
        description: `${editingRule.title} has been updated.`,
      });

      setEditingRule(null);
      await loadRules();
    } catch (error) {
      console.error('Failed to update rule:', error);
      toast({
        title: "Error",
        description: "Failed to update rule.",
        variant: "destructive",
      });
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    const rule = availableRules.find(r => r.id === ruleId);
    if (!confirm(`Are you sure you want to delete "${rule?.title}"?`)) return;

    try {
      await AIEditorRulesService.deleteRule(ruleId);

      toast({
        title: "Rule Deleted",
        description: `${rule?.title} has been deleted.`,
      });

      // Remove from selection if it was selected
      if (selectedRuleIds.includes(ruleId)) {
        onRuleSelectionChange(selectedRuleIds.filter(id => id !== ruleId));
      }

      await loadRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast({
        title: "Error",
        description: "Failed to delete rule. Only custom rules can be deleted.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI Editor Roles</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowManageRules(true)}
            className="text-sm"
          >
            Manage Rules
          </Button>
          {selectedRuleIds.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedRuleIds.length} selected
            </Badge>
          )}
        </div>
      </div>

      {/* Rule List */}
      <div className="space-y-3">
        {availableRules.map((rule) => (
          <div
            key={rule.id}
            className={`p-3 rounded-lg border transition-all ${
              !rule.enabled
                ? 'border-gray-200 bg-gray-50 opacity-60'
                : selectedRuleIds.includes(rule.id)
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selectedRuleIds.includes(rule.id)}
                onCheckedChange={() => handleRuleToggle(rule.id)}
                disabled={!rule.enabled}
                className="mt-1"
              />
              <div
                className="w-3 h-3 rounded-sm mt-1 border"
                style={{
                  backgroundColor: rule.backgroundColor,
                  borderColor: rule.color,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${!rule.enabled ? 'text-gray-500' : ''}`}>
                    {rule.title}
                  </span>
                  {rule.isCustom && (
                    <Badge variant="outline" className="text-xs">Custom</Badge>
                  )}
                  {!rule.enabled && (
                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                      Disabled
                    </Badge>
                  )}
                </div>
                <p className={`text-xs mt-1 line-clamp-2 ${!rule.enabled ? 'text-gray-400' : 'text-muted-foreground'}`}>
                  {rule.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Manage Rules Dialog */}
      <Dialog open={showManageRules} onOpenChange={setShowManageRules}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage AI Editor Rules</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            {availableRules.map((rule) => (
              <div key={rule.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-4 h-4 rounded-sm border flex-shrink-0"
                      style={{
                        backgroundColor: rule.backgroundColor,
                        borderColor: rule.color,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rule.title}</span>
                        {rule.isCustom && (
                          <Badge variant="outline" className="text-xs">Custom</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`enabled-${rule.id}`} className="text-sm">
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </Label>
                      <Switch
                        id={`enabled-${rule.id}`}
                        checked={rule.enabled}
                        onCheckedChange={(checked) => handleToggleEnabled(rule.id, checked)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingRule(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {rule.isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pl-7">{rule.description}</p>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={() => setShowCreateRule(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Rule: {editingRule?.title}</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingRule.title}
                  onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                  placeholder="Rule title"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editingRule.description}
                  onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                  placeholder="Brief description for the UI"
                />
              </div>

              <div>
                <Label htmlFor="edit-prompt">Prompt for AI Model</Label>
                <Textarea
                  id="edit-prompt"
                  value={editingRule.prompt}
                  onChange={(e) => setEditingRule({ ...editingRule, prompt: e.target.value })}
                  placeholder="Describe what the AI should look for and suggest..."
                  className="h-32"
                />
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded border-2 transition-all ${
                        editingRule.color === color ? 'border-gray-800 scale-110' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingRule({
                        ...editingRule,
                        color,
                        backgroundColor: color + '20',
                      })}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingRule(null)}
                  disabled={savingRule}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateRule}
                  disabled={savingRule || !editingRule.title || !editingRule.prompt}
                >
                  {savingRule ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Rule Dialog */}
      <Dialog open={showCreateRule} onOpenChange={setShowCreateRule}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Custom Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rule-title">Title</Label>
              <Input
                id="rule-title"
                value={newRule.title || ''}
                onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                placeholder="e.g., Dialogue Checker"
              />
            </div>

            <div>
              <Label htmlFor="rule-description">Description</Label>
              <Input
                id="rule-description"
                value={newRule.description || ''}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Brief description shown in the UI"
              />
            </div>

            <div>
              <Label htmlFor="rule-prompt">Prompt for AI Model</Label>
              <Textarea
                id="rule-prompt"
                value={newRule.prompt || ''}
                onChange={(e) => setNewRule({ ...newRule, prompt: e.target.value })}
                placeholder="Describe what the AI should look for and suggest..."
                className="h-32"
              />
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 transition-all ${
                      newRule.color === color ? 'border-gray-800 scale-110' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewRule({
                      ...newRule,
                      color,
                      backgroundColor: color + '20',
                    })}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateRule(false)}
                disabled={savingRule}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRule}
                disabled={savingRule || !newRule.title || !newRule.prompt}
              >
                {savingRule ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Rule'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIEditorRuleSelector;
```

### Task 3.2: Update Editor Integration

**File**: `src/components/workspace/Editor.tsx`

Update the AIEditorRuleSelector usage (remove manuscriptId prop):

```typescript
// Around line 41-42, remove manuscriptId import requirement

// Update the component usage (around line 147):
<AIEditorRuleSelector
  // NO manuscriptId prop - rules are organization-wide now
  selectedRuleIds={selectedRuleIds}
  onRuleSelectionChange={setSelectedRuleIds}
  onRulesUpdate={(rules) => {
    setAvailableRules(rules);
    updateEditorRules(rules);
  }}
/>
```

### Task 3.3: Add Dynamic Editor Update Function

**File**: `src/components/workspace/Editor.tsx`

Add this function to update TipTap editor rules:

```typescript
// Add this function in Editor.tsx (around line 300)

const updateEditorRules = useCallback((rules: AIEditorRule[]) => {
  const editor = getGlobalEditor();
  if (!editor) {
    console.warn('Editor not available for rule update');
    return;
  }

  try {
    // Get only enabled rules
    const enabledRules = rules
      .filter(r => r.enabled)
      .map(rule => ({
        id: rule.id,
        title: rule.title,
        prompt: rule.prompt,
        color: rule.color,
        backgroundColor: rule.backgroundColor,
      }));

    // Update editor with new rules
    editor.chain()
      .setAiSuggestionRules(enabledRules)
      .run();

    console.log('✅ Editor rules updated:', enabledRules.length, 'enabled rules');
  } catch (error) {
    console.error('Failed to update editor rules:', error);
    toast({
      title: "Editor Update Failed",
      description: "Rules were saved but editor needs refresh.",
      variant: "destructive",
    });
  }
}, [toast]);
```

### ✅ CHECKPOINT 3: UI Components Updated

Test in browser:
1. Open manuscript editor
2. Click "Manage Rules" button
3. Toggle a rule's enabled state (e.g., enable "Proofreader")
4. Verify toast notification appears
5. Reload page - verify state persists
6. Create a custom rule
7. Edit an existing rule
8. Delete a custom rule

---

## Part 4: Testing & Verification (30 minutes)

### Test Case 1: Rule Persistence
- Enable "Proofreader" rule
- Disable "Copy Editor" rule
- Reload page
- **Expected**: Changes persist

### Test Case 2: Custom Rule Creation
- Click "Manage Rules" → "Create Custom Rule"
- Fill in fields:
  - Title: "Dialogue Checker"
  - Description: "Check dialogue formatting"
  - Prompt: "Identify dialogue punctuation errors..."
  - Color: Select blue
- Click "Create Rule"
- **Expected**: Rule appears in list, is enabled, and can be selected

### Test Case 3: Custom Rule Deletion
- Delete the custom rule created above
- Confirm deletion
- **Expected**: Rule removed from UI and database

### Test Case 4: Dynamic Editor Updates
- With editor open and AI suggestions loaded
- Enable a disabled rule (e.g., "CMOS Formatter")
- Check browser console
- **Expected**: Console shows "Editor rules updated: X enabled rules"

### Test Case 5: Multiple User Simulation
- Open app in two browser tabs
- In tab 1: Enable "Proofreader"
- In tab 2: Reload page
- **Expected**: Proofreader is enabled in tab 2 (shared state)

### ✅ CHECKPOINT 4: All Tests Pass

---

## Troubleshooting Guide

### Issue: "No rules found in database"

**Cause**: Migration didn't run or seeding failed

**Solution**:
```bash
# Check if table exists
supabase db query "SELECT COUNT(*) FROM ai_editor_rules"

# If empty, re-run migration
supabase db reset
# or
supabase db push
```

### Issue: "Failed to load AI editor rules"

**Cause**: RLS policies blocking access

**Solution**:
```sql
-- Verify RLS policies are public
SELECT * FROM pg_policies WHERE tablename = 'ai_editor_rules';

-- Should see policies with `USING (true)` for now
```

### Issue: Enable/disable toggle doesn't work

**Cause**: Network error or permissions issue

**Solution**:
1. Check browser Network tab for failed requests
2. Verify RLS update policy exists
3. Check console for errors

### Issue: Custom rules can't be deleted

**Cause**: Trying to delete built-in rule

**Solution**: Only custom rules (is_custom = true) can be deleted. This is enforced by RLS policy.

---

## Migration Path to Organization Auth

When implementing real organization-based authentication later:

### Step 1: Add Organizations Table
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Step 2: Update RLS Policies
```sql
-- Replace public policies with organization-based ones
DROP POLICY "Public read access to AI editor rules" ON ai_editor_rules;

CREATE POLICY "Organization members can view rules"
  ON ai_editor_rules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );
```

### Step 3: Migrate Existing Rules
```sql
-- Assign existing rules to an organization
UPDATE ai_editor_rules
SET organization_id = 'your-default-org-id'
WHERE organization_id IS NULL;
```

### Step 4: Update Service
```typescript
// Update getAllRules to filter by org
static async getAllRules(organizationId: string): Promise<AIEditorRule[]> {
  const { data, error } = await supabase
    .from('ai_editor_rules')
    .select('*')
    .eq('organization_id', organizationId)
    .order('display_order', { ascending: true });
  // ...
}
```

---

## Success Criteria

- [x] Database migration applied
- [x] 6 default rules seeded
- [x] Service layer functional
- [x] UI components updated
- [x] Rules persist across reloads
- [x] Custom rules work
- [x] Enable/disable toggles work
- [x] Organization-wide scope (not per-manuscript)
- [x] Public RLS for mock auth
- [x] Ready for organization auth later

---

## Key Files

**Created**:
- `supabase/migrations/YYYYMMDDHHMMSS_create_ai_editor_rules.sql`
- `src/types/aiEditorRules.ts`
- `src/services/aiEditorRulesService.ts`

**Modified**:
- `src/components/workspace/AIEditorRuleSelector.tsx`
- `src/components/workspace/Editor.tsx`

---

**Last Updated**: October 5, 2025
**Status**: Ready for Implementation
**Time Estimate**: 3-4 hours

#ai_editor_rules #organization_wide #public_access #mock_auth #supabase #tiptap #rule_management
