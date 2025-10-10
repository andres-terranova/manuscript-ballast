-- Migration: Clean up manuscripts with more than 10 snapshots
-- Purpose: Trim existing snapshot arrays to prevent database performance issues
-- Context: Some manuscripts have accumulated 10+ snapshots (2.8MB+), causing connection issues

-- First, let's check how many manuscripts are affected
DO $$
DECLARE
  v_affected_count INT;
  v_total_snapshots_removed INT := 0;
BEGIN
  -- Count manuscripts with more than 10 snapshots
  SELECT COUNT(*)
  INTO v_affected_count
  FROM manuscripts
  WHERE jsonb_array_length(COALESCE(snapshots, '[]'::jsonb)) > 10;

  RAISE NOTICE 'Found % manuscript(s) with more than 10 snapshots that will be trimmed', v_affected_count;

  -- Trim each manuscript's snapshots to keep only the most recent 10
  UPDATE manuscripts
  SET snapshots = (
    SELECT jsonb_agg(elem ORDER BY ordinality)
    FROM (
      SELECT elem, ordinality
      FROM jsonb_array_elements(snapshots) WITH ORDINALITY AS elem
      OFFSET (jsonb_array_length(snapshots) - 10)  -- Keep only the last 10
    ) AS trimmed
  ),
  updated_at = NOW()
  WHERE jsonb_array_length(COALESCE(snapshots, '[]'::jsonb)) > 10;

  -- Report how many were affected
  GET DIAGNOSTICS v_total_snapshots_removed = ROW_COUNT;

  RAISE NOTICE 'Trimmed snapshots for % manuscript(s)', v_total_snapshots_removed;
END;
$$;

-- Add a comment explaining this migration
COMMENT ON TABLE manuscripts IS
  'Manuscripts table with JSONB storage for snapshots. ' ||
  'Snapshot arrays are automatically limited to 10 most recent versions to prevent database performance issues. ' ||
  'See append_snapshot() function for efficient snapshot management.';
