-- Migration: Create RPC function for efficient snapshot appending
-- Purpose: Avoid fetching/rewriting entire snapshots JSONB array on every snapshot creation
-- Performance: Prevents database connection issues and improves snapshot operation speed

-- Create function to append snapshot with automatic limit enforcement
CREATE OR REPLACE FUNCTION append_snapshot(
  p_manuscript_id UUID,
  p_snapshot JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_snapshots JSONB;
  v_new_snapshots JSONB;
  v_snapshot_count INT;
BEGIN
  -- Fetch current snapshots array
  SELECT snapshots INTO v_current_snapshots
  FROM manuscripts
  WHERE id = p_manuscript_id;

  -- Handle NULL case (no snapshots yet)
  IF v_current_snapshots IS NULL THEN
    v_current_snapshots := '[]'::jsonb;
  END IF;

  -- Get current snapshot count
  v_snapshot_count := jsonb_array_length(v_current_snapshots);

  -- If we're at or above the limit (10), remove the oldest snapshots
  IF v_snapshot_count >= 10 THEN
    -- Keep only the last 9 snapshots to make room for the new one
    -- jsonb_array_elements returns rows, so we use array_agg to rebuild the array
    SELECT jsonb_agg(elem ORDER BY ordinality)
    INTO v_new_snapshots
    FROM (
      SELECT elem, ordinality
      FROM jsonb_array_elements(v_current_snapshots) WITH ORDINALITY AS elem
      OFFSET (v_snapshot_count - 9)  -- Skip the oldest snapshots
    ) AS trimmed;
  ELSE
    -- If under the limit, keep all existing snapshots
    v_new_snapshots := v_current_snapshots;
  END IF;

  -- Append the new snapshot
  v_new_snapshots := v_new_snapshots || p_snapshot;

  -- Update the manuscripts table with the new snapshots array
  UPDATE manuscripts
  SET snapshots = v_new_snapshots,
      updated_at = NOW()
  WHERE id = p_manuscript_id;

  -- Log if we removed old snapshots
  IF v_snapshot_count >= 10 THEN
    RAISE NOTICE 'Snapshot limit reached for manuscript %. Removed % old snapshot(s)',
      p_manuscript_id, (v_snapshot_count - 9);
  END IF;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION append_snapshot(UUID, JSONB) IS
  'Efficiently appends a snapshot to a manuscript''s snapshots array while enforcing a maximum limit of 10 snapshots. ' ||
  'Automatically removes the oldest snapshots when the limit is reached. ' ||
  'This function prevents the need to fetch and rewrite the entire snapshots array from client code.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION append_snapshot(UUID, JSONB) TO authenticated;

-- Example usage:
-- SELECT append_snapshot(
--   'manuscript-uuid-here'::uuid,
--   '{"id": "snap-uuid", "version": 1, "event": "manual", "content": {...}, "metadata": {...}, "createdAt": "2025-10-10T00:00:00Z", "createdBy": "user-uuid"}'::jsonb
-- );
