import { useManuscripts } from "@/contexts/ManuscriptsContext";
import { DEFAULT_STYLE_RULES, type StyleRuleKey } from "@/lib/styleRuleConstants";

export const useActiveStyleRules = (manuscriptId: string): StyleRuleKey[] => {
  const { getManuscriptById } = useManuscripts();
  
  const manuscript = getManuscriptById(manuscriptId);
  
  if (!manuscript) {
    return DEFAULT_STYLE_RULES;
  }
  
  // If manuscript doesn't have styleRules or it's empty, return defaults
  if (!manuscript.styleRules || manuscript.styleRules.length === 0) {
    return DEFAULT_STYLE_RULES;
  }
  
  return manuscript.styleRules as StyleRuleKey[];
};