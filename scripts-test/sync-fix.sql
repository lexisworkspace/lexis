-- Add auto-increment trigger for data_version
-- Run this in Supabase SQL Editor

-- Drop old triggers if exist
DROP TRIGGER IF EXISTS sync_version_trigger ON lexis_sync;
DROP TRIGGER IF EXISTS sync_version_insert ON lexis_sync;

-- Create trigger function for UPDATE
CREATE OR REPLACE FUNCTION sync_version_increment()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_version := COALESCE(OLD.data_version, 0) + 1;
  NEW.updated_at := EXTRACT(EPOCH FROM NOW()) * 1000;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for INSERT
CREATE OR REPLACE FUNCTION sync_version_init()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_version IS NULL OR NEW.data_version = 0 THEN
    NEW.data_version := 1;
  END IF;
  IF NEW.updated_at IS NULL OR NEW.updated_at = 0 THEN
    NEW.updated_at := EXTRACT(EPOCH FROM NOW()) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers
CREATE TRIGGER sync_version_trigger
  BEFORE UPDATE ON lexis_sync
  FOR EACH ROW
  EXECUTE FUNCTION sync_version_increment();

CREATE TRIGGER sync_version_insert
  BEFORE INSERT ON lexis_sync
  FOR EACH ROW
  EXECUTE FUNCTION sync_version_init();
