-- TimeFlow Database Migration: Customizable Event Categories
-- Migration 001: Add user_categories table and update events
-- Created: 2025-11-12

-- =====================================================
-- STEP 1: CREATE USER_CATEGORIES TABLE
-- =====================================================

CREATE TABLE user_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL, -- HEX format: #FF5733
  icon VARCHAR(50), -- emoji or icon name
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_category_name UNIQUE (user_id, name),
  CONSTRAINT valid_hex_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT valid_display_order CHECK (display_order > 0)
);

-- Indexes for performance
CREATE INDEX user_categories_user_id_idx ON user_categories(user_id);
CREATE INDEX user_categories_display_order_idx ON user_categories(user_id, display_order);

-- Enable Row Level Security
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own categories"
  ON user_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON user_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON user_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own non-default categories"
  ON user_categories FOR DELETE
  USING (auth.uid() = user_id AND is_default = false);

-- Trigger for updated_at
CREATE TRIGGER update_user_categories_updated_at
  BEFORE UPDATE ON user_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 2: ADD CATEGORY_ID TO EVENTS TABLE
-- =====================================================

-- Add the new category_id column (nullable during migration)
ALTER TABLE events
  ADD COLUMN category_id UUID REFERENCES user_categories(id) ON DELETE RESTRICT;

-- Create index
CREATE INDEX events_category_id_idx ON events(category_id);

-- =====================================================
-- STEP 3: SEED DEFAULT CATEGORIES FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION seed_default_categories(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_categories (user_id, name, color, icon, is_default, display_order) VALUES
    (p_user_id, 'Meeting', '#3b82f6', '📅', true, 1),
    (p_user_id, 'Deep Work', '#8b5cf6', '🎯', true, 2),
    (p_user_id, 'Admin', '#64748b', '📋', true, 3),
    (p_user_id, 'Personal', '#10b981', '🏠', true, 4),
    (p_user_id, 'Break', '#f59e0b', '☕', true, 5),
    (p_user_id, 'Other', '#6b7280', '📌', true, 6);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: UPDATE HANDLE_NEW_USER TO SEED CATEGORIES
-- =====================================================

-- Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate with category seeding
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NOW() + INTERVAL '14 days'
  );

  -- Seed default categories
  PERFORM seed_default_categories(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 5: MIGRATE EXISTING DATA
-- =====================================================

-- Function to migrate existing users and events
CREATE OR REPLACE FUNCTION migrate_existing_events_to_categories()
RETURNS TABLE(
  users_migrated INTEGER,
  events_migrated INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  v_user_id UUID;
  v_users_count INTEGER := 0;
  v_events_count INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_category_map JSONB;
BEGIN
  -- Seed categories for all existing users
  FOR v_user_id IN
    SELECT DISTINCT id FROM auth.users
    WHERE NOT EXISTS (
      SELECT 1 FROM user_categories WHERE user_categories.user_id = auth.users.id
    )
  LOOP
    BEGIN
      PERFORM seed_default_categories(v_user_id);
      v_users_count := v_users_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Failed to seed categories for user: ' || v_user_id || ' - ' || SQLERRM);
    END;
  END LOOP;

  -- Build category mapping for each user and update events
  FOR v_user_id IN SELECT DISTINCT user_id FROM events WHERE category_id IS NULL LOOP
    BEGIN
      -- Get category IDs for this user
      SELECT jsonb_object_agg(
        LOWER(REPLACE(name, ' ', '_')),
        id::text
      ) INTO v_category_map
      FROM user_categories
      WHERE user_categories.user_id = v_user_id;

      -- Update events with category_id based on old category field
      UPDATE events
      SET category_id = (
        CASE
          WHEN category = 'meeting' THEN (v_category_map->>'meeting')::UUID
          WHEN category = 'deep_work' THEN (v_category_map->>'deep_work')::UUID
          WHEN category = 'admin' THEN (v_category_map->>'admin')::UUID
          WHEN category = 'personal' THEN (v_category_map->>'personal')::UUID
          WHEN category = 'break' THEN (v_category_map->>'break')::UUID
          WHEN category = 'other' THEN (v_category_map->>'other')::UUID
          ELSE (v_category_map->>'other')::UUID
        END
      )
      WHERE events.user_id = v_user_id
        AND events.category_id IS NULL;

      GET DIAGNOSTICS v_events_count = ROW_COUNT;

    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Failed to migrate events for user: ' || v_user_id || ' - ' || SQLERRM);
    END;
  END LOOP;

  RETURN QUERY SELECT v_users_count, v_events_count, v_errors;
END;
$$ LANGUAGE plpgsql;

-- Execute migration (run this manually after reviewing)
-- SELECT * FROM migrate_existing_events_to_categories();

-- =====================================================
-- STEP 6: HELPER FUNCTIONS FOR CATEGORY MANAGEMENT
-- =====================================================

-- Function to check if user can add more categories
CREATE OR REPLACE FUNCTION can_add_category(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_categories
  WHERE user_id = p_user_id;

  RETURN v_count < 12;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get event count for a category
CREATE OR REPLACE FUNCTION get_category_event_count(p_category_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM events
  WHERE category_id = p_category_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reassign events when deleting a category
CREATE OR REPLACE FUNCTION reassign_category_events(
  p_old_category_id UUID,
  p_new_category_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE events
  SET category_id = p_new_category_id,
      updated_at = NOW()
  WHERE category_id = p_old_category_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- INSTRUCTIONS:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Execute: SELECT * FROM migrate_existing_events_to_categories();
-- 3. Verify all users have default categories
-- 4. Verify all events have category_id assigned
-- 5. Optionally, after confirming migration success:
--    ALTER TABLE events ALTER COLUMN category_id SET NOT NULL;
--    (makes category_id required for all future events)
