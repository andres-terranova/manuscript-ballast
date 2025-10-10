-- Enable Realtime for processing_queue table
-- This allows clients to subscribe to changes via Supabase Realtime

-- Enable Realtime publication for the table
ALTER PUBLICATION supabase_realtime ADD TABLE processing_queue;

-- Add comment explaining the change
COMMENT ON TABLE processing_queue IS
  'Queue for background job processing. Realtime enabled for instant status updates in dashboard.';
