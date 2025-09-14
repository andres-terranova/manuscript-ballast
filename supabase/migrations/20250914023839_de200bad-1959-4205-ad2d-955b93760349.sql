-- Remove RLS policies that require authentication
DROP POLICY IF EXISTS "Users can view their own manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Users can create their own manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Users can update their own manuscripts" ON public.manuscripts;
DROP POLICY IF EXISTS "Users can delete their own manuscripts" ON public.manuscripts;

-- Disable RLS on manuscripts table for MVP
ALTER TABLE public.manuscripts DISABLE ROW LEVEL SECURITY;

-- Make owner_id nullable since we won't be using user authentication in MVP
ALTER TABLE public.manuscripts ALTER COLUMN owner_id DROP NOT NULL;

-- Create simple policies that allow all operations for MVP
ALTER TABLE public.manuscripts ENABLE ROW LEVEL SECURITY;

-- Allow all operations for MVP (no user restrictions)
CREATE POLICY "Allow all access for MVP" ON public.manuscripts
FOR ALL USING (true) WITH CHECK (true);