-- TimeFlow Database Migration: Multi-Provider Calendar Sync
-- Migration 002: Support Google and Microsoft calendar providers
-- Created: 2025-11-14

-- =====================================================
-- STEP 1: CREATE CALENDAR_PROVIDERS TABLE
-- =====================================================

CREATE TABLE calendar_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'microsoft')),
  provider_email VARCHAR(255),
  provider_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  calendar_id TEXT, -- Primary calendar ID for this provider
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

-- Indexes for performance
CREATE INDEX calendar_providers_user_id_idx ON calendar_providers(user_id);
CREATE INDEX calendar_providers_provider_idx ON calendar_providers(provider);
CREATE INDEX calendar_providers_user_provider_idx ON calendar_providers(user_id, provider);

-- Enable Row Level Security
ALTER TABLE calendar_providers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own calendar providers"
  ON calendar_providers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar providers"
  ON calendar_providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar providers"
  ON calendar_providers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar providers"
  ON calendar_providers FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_calendar_providers_updated_at
  BEFORE UPDATE ON calendar_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 2: MIGRATE GOOGLE TOKEN DATA FROM PROFILES
-- =====================================================

-- Migrate existing Google Calendar connections from profiles to calendar_providers
INSERT INTO calendar_providers (
  user_id,
  provider,
  provider_email,
  provider_user_id,
  access_token,
  refresh_token,
  token_expires_at,
  is_active
)
SELECT
  p.id as user_id,
  'google' as provider,
  COALESCE(u.email, 'unknown@gmail.com') as provider_email,
  p.id::text as provider_user_id, -- Temporary, should be updated with actual Google user ID
  p.google_access_token as access_token,
  p.google_refresh_token as refresh_token,
  p.google_token_expiry::timestamp with time zone as token_expires_at,
  p.google_calendar_connected as is_active
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.google_refresh_token IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM calendar_providers cp
    WHERE cp.user_id = p.id AND cp.provider = 'google'
  );

-- =====================================================
-- STEP 3: ADD MULTI-PROVIDER COLUMNS TO EVENTS TABLE
-- =====================================================

-- Add provider-specific event IDs
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS microsoft_event_id TEXT;

-- Add sync status columns
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS synced_to_google BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS synced_to_microsoft BOOLEAN DEFAULT false;

-- Create indexes for event lookups by provider IDs
CREATE INDEX IF NOT EXISTS events_google_event_id_idx ON events(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_microsoft_event_id_idx ON events(microsoft_event_id) WHERE microsoft_event_id IS NOT NULL;

-- Update existing events with Google event IDs to mark as synced
UPDATE events
SET synced_to_google = true
WHERE google_event_id IS NOT NULL;

-- =====================================================
-- STEP 4: ADD HELPER COLUMNS TO PROFILES (OPTIONAL)
-- =====================================================

-- Add convenience columns to track which providers are connected
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS microsoft_calendar_connected BOOLEAN DEFAULT false;

-- Update microsoft_calendar_connected based on calendar_providers
UPDATE profiles
SET microsoft_calendar_connected = true
WHERE EXISTS (
  SELECT 1 FROM calendar_providers cp
  WHERE cp.user_id = profiles.id
    AND cp.provider = 'microsoft'
    AND cp.is_active = true
);

-- =====================================================
-- STEP 5: HELPER FUNCTIONS FOR MULTI-PROVIDER SYNC
-- =====================================================

-- Function to get active providers for a user
CREATE OR REPLACE FUNCTION get_user_calendar_providers(p_user_id UUID)
RETURNS TABLE(
  provider VARCHAR(20),
  provider_email VARCHAR(255),
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT cp.provider, cp.provider_email, cp.is_active
  FROM calendar_providers cp
  WHERE cp.user_id = p_user_id
  ORDER BY cp.provider, cp.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if an event is synced to any provider
CREATE OR REPLACE FUNCTION is_event_synced(p_event_id UUID)
RETURNS TABLE(
  google_synced BOOLEAN,
  microsoft_synced BOOLEAN,
  any_synced BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.synced_to_google,
    e.synced_to_microsoft,
    (e.synced_to_google OR e.synced_to_microsoft) as any_synced
  FROM events e
  WHERE e.id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update provider connection status
CREATE OR REPLACE FUNCTION update_provider_connection_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update google_calendar_connected in profiles
  IF NEW.provider = 'google' THEN
    UPDATE profiles
    SET google_calendar_connected = NEW.is_active
    WHERE id = NEW.user_id;
  END IF;

  -- Update microsoft_calendar_connected in profiles
  IF NEW.provider = 'microsoft' THEN
    UPDATE profiles
    SET microsoft_calendar_connected = NEW.is_active
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to keep profile connection status in sync
CREATE TRIGGER sync_provider_connection_status
  AFTER INSERT OR UPDATE OF is_active ON calendar_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_connection_status();

-- =====================================================
-- STEP 6: CLEANUP FUNCTIONS (OPTIONAL - RUN LATER)
-- =====================================================

-- Function to clean up old Google token columns from profiles
-- CAUTION: Only run this after verifying migration success and updating application code
CREATE OR REPLACE FUNCTION cleanup_old_google_token_columns()
RETURNS void AS $$
BEGIN
  -- This is commented out by default for safety
  -- Uncomment and run manually when ready to remove old columns
  /*
  ALTER TABLE profiles
    DROP COLUMN IF EXISTS google_access_token,
    DROP COLUMN IF EXISTS google_refresh_token,
    DROP COLUMN IF EXISTS google_token_expiry;
  */
  RAISE NOTICE 'This function is disabled for safety. Edit the migration to enable cleanup.';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- INSTRUCTIONS:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify data migration: SELECT * FROM calendar_providers;
-- 3. Verify events table updates: SELECT google_event_id, microsoft_event_id, synced_to_google, synced_to_microsoft FROM events LIMIT 10;
-- 4. Test provider connection functions: SELECT * FROM get_user_calendar_providers(your_user_id);
-- 5. Update application code to use new calendar_providers table
-- 6. After full testing, optionally run cleanup_old_google_token_columns() to remove old columns
