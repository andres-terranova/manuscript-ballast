-- Create manuscripts table with DOCX support and embedded checks/suggestions storage
CREATE TABLE public.manuscripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'reviewed', 'archived')),
  ball_in_court TEXT NOT NULL DEFAULT 'editor' CHECK (ball_in_court IN ('editor', 'author', 'production')),
  
  -- Content storage
  content_text TEXT, -- Extracted plain text from DOCX
  content_html TEXT, -- Converted HTML for editor
  source_markdown TEXT, -- For backwards compatibility with existing data
  
  -- DOCX file storage
  docx_file_path TEXT, -- Path to DOCX file in Supabase Storage
  original_filename TEXT, -- Original filename when uploaded
  file_size BIGINT, -- File size in bytes
  
  -- Processing status
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT, -- Error message if processing failed
  
  -- Embedded data storage (JSON)
  style_rules JSONB DEFAULT '[]'::jsonb, -- Active style rules for this manuscript
  suggestions JSONB DEFAULT '[]'::jsonb, -- All suggestions (checks + manual)
  comments JSONB DEFAULT '[]'::jsonb, -- Comments on the manuscript
  
  -- Metadata
  excerpt TEXT, -- Brief excerpt for dashboard display
  word_count INTEGER DEFAULT 0,
  character_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.manuscripts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user access
CREATE POLICY "Users can view their own manuscripts" 
ON public.manuscripts 
FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own manuscripts" 
ON public.manuscripts 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own manuscripts" 
ON public.manuscripts 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own manuscripts" 
ON public.manuscripts 
FOR DELETE 
USING (auth.uid() = owner_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_manuscripts_updated_at
BEFORE UPDATE ON public.manuscripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_manuscripts_owner_id ON public.manuscripts(owner_id);
CREATE INDEX idx_manuscripts_status ON public.manuscripts(status);
CREATE INDEX idx_manuscripts_updated_at ON public.manuscripts(updated_at DESC);
CREATE INDEX idx_manuscripts_processing_status ON public.manuscripts(processing_status);

-- Create storage bucket for DOCX files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('manuscripts', 'manuscripts', false);

-- Create storage policies for manuscript uploads
CREATE POLICY "Users can view their own manuscript files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'manuscripts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own manuscript files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'manuscripts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own manuscript files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'manuscripts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own manuscript files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'manuscripts' AND auth.uid()::text = (storage.foldername(name))[1]);