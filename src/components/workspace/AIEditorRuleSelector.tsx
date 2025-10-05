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
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    loadRules(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRules = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
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
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setIsRefreshing(false);
      }
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
