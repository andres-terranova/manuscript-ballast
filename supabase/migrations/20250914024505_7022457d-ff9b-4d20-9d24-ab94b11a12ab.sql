-- Remove existing storage policies that require authentication
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- Create open policies for MVP (allow all operations on manuscripts bucket)
CREATE POLICY "Allow all uploads to manuscripts bucket for MVP" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'manuscripts');

CREATE POLICY "Allow all access to manuscripts bucket for MVP" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'manuscripts');

CREATE POLICY "Allow all updates to manuscripts bucket for MVP" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'manuscripts');

CREATE POLICY "Allow all deletes from manuscripts bucket for MVP" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'manuscripts');