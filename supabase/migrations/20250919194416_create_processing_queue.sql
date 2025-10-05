-- Create processing queue table for background job processing
CREATE TABLE processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL DEFAULT 'process_docx' CHECK (job_type IN ('process_docx', 'generate_suggestions')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  progress_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient queue processing
CREATE INDEX idx_processing_queue_status_priority ON processing_queue(status, priority DESC, created_at ASC);
CREATE INDEX idx_processing_queue_manuscript_id ON processing_queue(manuscript_id);

-- Enable RLS
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own processing jobs" 
ON processing_queue 
FOR SELECT 
USING (manuscript_id IN (SELECT id FROM manuscripts WHERE owner_id = auth.uid()));

CREATE POLICY "System can manage all processing jobs" 
ON processing_queue 
FOR ALL 
USING (true);

-- Database function to process DOCX files
CREATE OR REPLACE FUNCTION process_docx_from_queue(job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  manuscript_record manuscripts%ROWTYPE;
  queue_record processing_queue%ROWTYPE;
  file_data BYTEA;
BEGIN
  -- Get queue item and manuscript
  SELECT * INTO queue_record FROM processing_queue WHERE id = job_id AND status = 'pending';
  
  IF queue_record.id IS NULL THEN
    RAISE EXCEPTION 'Queue job not found or not pending: %', job_id;
  END IF;
  
  SELECT * INTO manuscript_record FROM manuscripts WHERE id = queue_record.manuscript_id;
  
  -- Update status to processing
  UPDATE processing_queue 
  SET 
    status = 'processing', 
    started_at = NOW(), 
    attempts = attempts + 1,
    progress_data = jsonb_build_object('step', 'starting', 'progress', 0)
  WHERE id = job_id;
  
  -- Update manuscript status
  UPDATE manuscripts 
  SET processing_status = 'processing'
  WHERE id = manuscript_record.id;

  -- For now, we'll mark as completed and let the Edge Function handle the actual processing
  -- This is a placeholder for the actual DOCX processing logic
  UPDATE processing_queue 
  SET 
    status = 'completed', 
    completed_at = NOW(),
    progress_data = jsonb_build_object('step', 'completed', 'progress', 100)
  WHERE id = job_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Handle errors gracefully
  UPDATE processing_queue 
  SET 
    status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
    error_message = SQLERRM,
    progress_data = jsonb_build_object('step', 'error', 'error', SQLERRM)
  WHERE id = job_id;
  
  UPDATE manuscripts 
  SET processing_status = 'failed', processing_error = SQLERRM
  WHERE id = manuscript_record.id;
END;
$$;

-- Function to get next job from queue
CREATE OR REPLACE FUNCTION get_next_queue_job()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_id UUID;
BEGIN
  SELECT id INTO job_id
  FROM processing_queue
  WHERE status = 'pending' 
    AND attempts < max_attempts
  ORDER BY priority DESC, created_at ASC
  LIMIT 1;
  
  RETURN job_id;
END;
$$;


