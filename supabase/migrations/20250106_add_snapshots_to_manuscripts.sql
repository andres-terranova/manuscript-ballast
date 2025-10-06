-- Add snapshots column to manuscripts table for versioning
-- Stores snapshots as JSONB array with version history

ALTER TABLE manuscripts
ADD COLUMN snapshots JSONB DEFAULT '[]'::jsonb;

-- Add GIN index for efficient JSONB queries (optional, for performance)
CREATE INDEX idx_manuscripts_snapshots
ON manuscripts USING gin ((snapshots::jsonb));

-- Add comment for documentation
COMMENT ON COLUMN manuscripts.snapshots IS 'Version history snapshots stored as JSONB array. Each snapshot includes: id, version, event, content (TipTap JSON), metadata (wordCount, characterCount), createdAt, createdBy';
