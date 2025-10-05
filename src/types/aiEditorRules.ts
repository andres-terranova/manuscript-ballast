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
