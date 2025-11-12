-- TimeFlow Database Schema v1.0
-- Compatible with Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE (Extended User Data)
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  google_calendar_connected BOOLEAN DEFAULT FALSE,
  google_refresh_token TEXT, -- Encrypted by Supabase
  google_access_token TEXT,
  google_token_expiry TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_status TEXT CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'expired')) DEFAULT 'trial',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- EVENTS TABLE
-- =====================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  category TEXT CHECK (category IN ('meeting', 'deep_work', 'admin', 'personal', 'break', 'other')) DEFAULT 'other',
  google_event_id TEXT, -- For Google Calendar sync
  google_calendar_id TEXT,
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  importance INTEGER CHECK (importance >= 1 AND importance <= 5) DEFAULT 3,
  color TEXT, -- Hex color for custom coloring
  location TEXT,
  attendees JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Indexes for performance
CREATE INDEX events_user_id_idx ON events(user_id);
CREATE INDEX events_start_time_idx ON events(start_time);
CREATE INDEX events_user_start_time_idx ON events(user_id, start_time);
CREATE INDEX events_google_event_id_idx ON events(google_event_id);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Users can view their own events" 
  ON events FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events" 
  ON events FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" 
  ON events FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" 
  ON events FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- JOURNAL ENTRIES TABLE
-- =====================================================
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  mood TEXT CHECK (mood IN ('great', 'good', 'neutral', 'bad', 'terrible')),
  energy_rating INTEGER CHECK (energy_rating >= 1 AND energy_rating <= 5),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_prompt_response BOOLEAN DEFAULT FALSE, -- If triggered by automatic prompt
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX journal_entries_user_id_idx ON journal_entries(user_id);
CREATE INDEX journal_entries_event_id_idx ON journal_entries(event_id);
CREATE INDEX journal_entries_created_at_idx ON journal_entries(created_at DESC);
CREATE INDEX journal_entries_tags_idx ON journal_entries USING gin(tags);

-- Enable Row Level Security
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Journal policies
CREATE POLICY "Users can view their own journal entries" 
  ON journal_entries FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journal entries" 
  ON journal_entries FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries" 
  ON journal_entries FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries" 
  ON journal_entries FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- ANALYTICS CACHE TABLE (Pre-computed for performance)
-- =====================================================
CREATE TABLE analytics_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT CHECK (period_type IN ('day', 'week', 'month')) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Metrics structure example:
  -- {
  --   "total_hours": 40,
  --   "by_category": {
  --     "meeting": 10,
  --     "deep_work": 20,
  --     "admin": 5,
  --     "personal": 5
  --   },
  --   "most_productive_day": "Tuesday",
  --   "avg_energy": 3.5,
  --   "patterns": {...}
  -- }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_type, period_start)
);

-- Indexes
CREATE INDEX analytics_cache_user_id_idx ON analytics_cache(user_id);
CREATE INDEX analytics_cache_period_idx ON analytics_cache(user_id, period_start DESC);

-- Enable Row Level Security
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- Analytics policies
CREATE POLICY "Users can view their own analytics" 
  ON analytics_cache FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage analytics cache" 
  ON analytics_cache FOR ALL 
  USING (auth.uid() = user_id);

-- =====================================================
-- SUBSCRIPTION EVENTS TABLE (Stripe webhooks)
-- =====================================================
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX subscription_events_stripe_event_id_idx ON subscription_events(stripe_event_id);
CREATE INDEX subscription_events_user_id_idx ON subscription_events(user_id);
CREATE INDEX subscription_events_created_at_idx ON subscription_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Only admin/service role can access subscription events
CREATE POLICY "Service role can manage subscription events" 
  ON subscription_events FOR ALL 
  USING (auth.role() = 'service_role');

-- =====================================================
-- SMART CONFLICTS TABLE (For tracking conflict patterns)
-- =====================================================
CREATE TABLE smart_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  conflict_type TEXT CHECK (conflict_type IN ('direct_overlap', 'overload', 'goal_impact', 'recovery_needed')) NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  description TEXT,
  suggestion TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX smart_conflicts_user_id_idx ON smart_conflicts(user_id);
CREATE INDEX smart_conflicts_event_id_idx ON smart_conflicts(event_id);
CREATE INDEX smart_conflicts_resolved_idx ON smart_conflicts(user_id, resolved);

-- Enable Row Level Security
ALTER TABLE smart_conflicts ENABLE ROW LEVEL SECURITY;

-- Conflicts policies
CREATE POLICY "Users can view their own conflicts" 
  ON smart_conflicts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage conflicts" 
  ON smart_conflicts FOR ALL 
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_cache_updated_at BEFORE UPDATE ON analytics_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NOW() + INTERVAL '14 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View for quick user subscription status check
CREATE OR REPLACE VIEW user_subscription_status AS
SELECT 
  id,
  full_name,
  subscription_status,
  trial_ends_at,
  CASE 
    WHEN subscription_status = 'trial' AND trial_ends_at > NOW() THEN true
    WHEN subscription_status = 'active' THEN true
    ELSE false
  END as has_access,
  CASE
    WHEN subscription_status = 'trial' THEN GREATEST(0, EXTRACT(DAY FROM trial_ends_at - NOW()))
    ELSE NULL
  END as trial_days_remaining
FROM profiles;

-- =====================================================
-- INITIAL SETUP COMPLETE
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- Then configure RLS policies and test with your application
