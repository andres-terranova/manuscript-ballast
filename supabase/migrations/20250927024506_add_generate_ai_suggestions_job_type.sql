-- Add 'generate_ai_suggestions' job type to processing_queue
-- This allows the queue to handle AI suggestion generation jobs

-- Drop the existing check constraint
ALTER TABLE public.processing_queue
    DROP CONSTRAINT IF EXISTS processing_queue_job_type_check;

-- Recreate the constraint with the new job type
ALTER TABLE public.processing_queue
    ADD CONSTRAINT processing_queue_job_type_check
    CHECK (job_type = ANY (ARRAY['process_docx'::text, 'generate_suggestions'::text, 'generate_ai_suggestions'::text]));
