-- Create ai_suggestion_results table to store AI-generated suggestions
CREATE TABLE IF NOT EXISTS public.ai_suggestion_results (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    manuscript_id UUID REFERENCES public.manuscripts(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.processing_queue(id) ON DELETE CASCADE,
    total_suggestions INTEGER NOT NULL DEFAULT 0,
    suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_ai_suggestion_results_manuscript_id ON public.ai_suggestion_results(manuscript_id);
CREATE INDEX idx_ai_suggestion_results_job_id ON public.ai_suggestion_results(job_id);
CREATE INDEX idx_ai_suggestion_results_created_at ON public.ai_suggestion_results(created_at);

-- Enable Row Level Security
ALTER TABLE public.ai_suggestion_results ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own AI suggestion results
CREATE POLICY "Users can read their own AI suggestion results"
    ON public.ai_suggestion_results
    FOR SELECT
    USING (
        manuscript_id IN (
            SELECT id FROM public.manuscripts
            WHERE owner_id = auth.uid()
        )
    );

-- RLS Policy: Service role can manage AI suggestion results
CREATE POLICY "Service role can manage AI suggestion results"
    ON public.ai_suggestion_results
    FOR ALL
    USING (auth.role() = 'service_role');
