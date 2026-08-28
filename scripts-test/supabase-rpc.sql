-- Lexis sync — atomic database functions for pairing consent.
-- Run this in Supabase SQL Editor.

-- Atomically append a pending request without clobbering the approved list.
-- Creates the row if it doesn't exist.
CREATE OR REPLACE FUNCTION lexis_append_pending(
  p_code TEXT,
  p_device_id TEXT,
  p_device_name TEXT
) RETURNS void AS $$
DECLARE
  current_manifest JSONB;
  request_json JSONB;
BEGIN
  request_json := jsonb_build_object(
    'deviceId', p_device_id,
    'deviceName', p_device_name,
    'requestedAt', EXTRACT(EPOCH FROM NOW()) * 1000
  );

  -- Get existing manifest or create empty one
  SELECT manifest INTO current_manifest
  FROM lexis_pairing
  WHERE ecosystem_code = p_code;

  IF current_manifest IS NULL THEN
    -- Row doesn't exist — create it with this pending request
    INSERT INTO lexis_pairing (ecosystem_code, manifest)
    VALUES (p_code, jsonb_build_object(
      'pending', jsonb_build_array(request_json),
      'approved', '[]'::jsonb
    ));
  ELSE
    -- Row exists — append to pending without touching approved
    UPDATE lexis_pairing
    SET manifest = manifest || jsonb_build_object(
      'pending', COALESCE(manifest->'pending', '[]'::jsonb) || request_json
    )
    WHERE ecosystem_code = p_code
      AND NOT (manifest->'pending' @> jsonb_build_array(request_json));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomically approve a device: move from pending to approved.
CREATE OR REPLACE FUNCTION lexis_approve_device(
  p_code TEXT,
  p_device_id TEXT
) RETURNS void AS $$
BEGIN
  UPDATE lexis_pairing
  SET manifest = jsonb_build_object(
    'pending', COALESCE(
      (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(manifest->'pending') AS elem
        WHERE elem->>'deviceId' <> p_device_id
      ),
      '[]'::jsonb
    ),
    'approved', COALESCE(manifest->'approved', '[]'::jsonb) || to_jsonb(p_device_id)
  )
  WHERE ecosystem_code = p_code
    AND NOT (manifest->'approved' @> to_jsonb(p_device_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anonymous (the Supabase anon role)
GRANT EXECUTE ON FUNCTION lexis_append_pending TO anon;
GRANT EXECUTE ON FUNCTION lexis_approve_device TO anon;
