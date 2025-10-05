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
    const dbUpdates: Record<string, unknown> = {};

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
