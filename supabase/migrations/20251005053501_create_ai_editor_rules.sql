-- Create AI Editor Rules table
-- This table stores both default and custom AI editor rules for manuscript editing

CREATE TABLE IF NOT EXISTS public.ai_editor_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  rule_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#9333EA',
  background_color TEXT NOT NULL DEFAULT '#F3E8FF',
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create indexes for performance
CREATE INDEX idx_ai_editor_rules_organization_id ON public.ai_editor_rules(organization_id);
CREATE INDEX idx_ai_editor_rules_enabled ON public.ai_editor_rules(enabled);

-- Enable Row Level Security
ALTER TABLE public.ai_editor_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Public read access (all users can view rules)
CREATE POLICY "Public read access to AI editor rules"
  ON public.ai_editor_rules
  FOR SELECT
  USING (true);

-- Public insert access (allow creating custom rules)
CREATE POLICY "Public insert access to AI editor rules"
  ON public.ai_editor_rules
  FOR INSERT
  WITH CHECK (true);

-- Public update access (allow updating rules)
CREATE POLICY "Public update access to AI editor rules"
  ON public.ai_editor_rules
  FOR UPDATE
  USING (true);

-- Delete access only for custom rules
CREATE POLICY "Public delete access to custom AI editor rules"
  ON public.ai_editor_rules
  FOR DELETE
  USING (is_custom = true);

-- Insert default AI editor rules
INSERT INTO public.ai_editor_rules (id, rule_id, title, prompt, color, background_color, description, enabled, is_custom, display_order)
VALUES
  (
    '241c8ed1-8b76-4751-a230-8e1fd99c4a0c',
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
  ),
  (
    '4d127e18-24d9-4a42-a3f2-1f1abcf2105b',
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
  ),
  (
    '34bbe970-5781-41f0-adb6-a6307c85e8b7',
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
    true,
    false,
    3
  ),
  (
    '54d6e4b8-7aed-4f8b-a6ed-7536056d7a39',
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
    true,
    false,
    4
  ),
  (
    '0f6708fe-3d4f-4fd8-bea5-4e9c431ec5b4',
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
  ),
  (
    'ae3209cf-82aa-47cf-99a2-f929fed40181',
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
