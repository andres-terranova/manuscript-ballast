import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Plus } from "lucide-react";
import { AI_EDITOR_RULES, type AIEditorRule } from './AIEditorRules';

interface AIEditorRuleSelectorProps {
  selectedRuleIds: string[];
  onRuleSelectionChange: (ruleIds: string[]) => void;
  onRulesUpdate?: (rules: AIEditorRule[]) => void;
}

interface CustomRule extends AIEditorRule {
  isCustom: boolean;
}

const AIEditorRuleSelector: React.FC<AIEditorRuleSelectorProps> = ({
  selectedRuleIds,
  onRuleSelectionChange,
  onRulesUpdate
}) => {
  const [availableRules, setAvailableRules] = useState<CustomRule[]>(
    AI_EDITOR_RULES.map(rule => ({ ...rule, isCustom: false }))
  );
  const [showManageRules, setShowManageRules] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null);
  const [showCreateRule, setShowCreateRule] = useState(false);
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

  const handleRuleToggle = (ruleId: string) => {
    const rule = availableRules.find(r => r.id === ruleId);
    if (!rule?.enabled) return; // Don't allow toggling disabled rules
    
    const newSelection = selectedRuleIds.includes(ruleId)
      ? selectedRuleIds.filter(id => id !== ruleId)
      : [...selectedRuleIds, ruleId];
    onRuleSelectionChange(newSelection);
  };

  const handleCreateRule = () => {
    if (!newRule.title || !newRule.prompt) return;

    const customRule: CustomRule = {
      id: `custom-${Date.now()}`,
      title: newRule.title,
      prompt: newRule.prompt,
      color: newRule.color || '#9333EA',
      backgroundColor: newRule.backgroundColor || '#F3E8FF',
      description: newRule.description || '',
      enabled: false,
      isCustom: true,
    };

    const updatedRules = [...availableRules, customRule];
    setAvailableRules(updatedRules);
    onRulesUpdate?.(updatedRules);
    setShowCreateRule(false);
    setNewRule({ title: '', prompt: '', color: '#9333EA', backgroundColor: '#F3E8FF', description: '' });
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = availableRules.filter(rule => rule.id !== ruleId);
    setAvailableRules(updatedRules);
    onRulesUpdate?.(updatedRules);
    
    // Remove from selection if it was selected
    if (selectedRuleIds.includes(ruleId)) {
      onRuleSelectionChange(selectedRuleIds.filter(id => id !== ruleId));
    }
  };

  const getColorFromBackground = (backgroundColor: string): string => {
    // Convert background color to border/text color
    const colorMap: { [key: string]: string } = {
      '#FFE6E6': '#DC143C',
      '#FFF5E6': '#FF8C00', 
      '#F3E6FF': '#8A2BE2',
      '#E6F0FF': '#4682B4',
    };
    return colorMap[backgroundColor] || backgroundColor.replace(/FF$/, '');
  };

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
                      Coming Soon
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Manage AI Editor Rules</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-96">
            {availableRules.map((rule) => (
              <div key={rule.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-sm border"
                      style={{
                        backgroundColor: rule.backgroundColor,
                        borderColor: rule.color,
                      }}
                    />
                    <span className="font-medium">{rule.title}</span>
                    {rule.isCustom && (
                      <Badge variant="outline" className="text-xs">Custom</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
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
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{rule.description}</p>
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
                placeholder="Rule title"
              />
            </div>
            
            <div>
              <Label htmlFor="rule-description">Description</Label>
              <Input
                id="rule-description"
                value={newRule.description || ''}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Brief description for the UI"
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
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 ${
                      newRule.color === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewRule({
                      ...newRule,
                      color,
                      backgroundColor: color + '20', // Add transparency
                    })}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateRule(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateRule}
                disabled={!newRule.title || !newRule.prompt}
              >
                Create Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIEditorRuleSelector;
