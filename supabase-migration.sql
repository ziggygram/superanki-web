-- SuperAnki Supabase Migration
-- Run this in Supabase Dashboard > SQL Editor
-- Project: gwhympdeyrptdpuxxmlk

-- 1. Waitlist table (for landing page signups)
CREATE TABLE IF NOT EXISTS waitlist (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_waitlist" ON waitlist
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "authenticated_read_waitlist" ON waitlist
  FOR SELECT TO authenticated
  USING (true);

-- 2. User profiles (extends Supabase auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_insert_own_profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Deck sync metadata (tracks what's backed up to S3)
CREATE TABLE IF NOT EXISTS deck_sync (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL,
  deck_name TEXT NOT NULL,
  card_count INT DEFAULT 0,
  s3_key TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  checksum TEXT,
  UNIQUE(user_id, deck_id)
);

ALTER TABLE deck_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_sync" ON deck_sync
  FOR ALL USING (auth.uid() = user_id);

-- 4. Study stats (aggregated daily stats synced from device)
CREATE TABLE IF NOT EXISTS study_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  cards_reviewed INT DEFAULT 0,
  new_cards_studied INT DEFAULT 0,
  time_spent_seconds INT DEFAULT 0,
  retention_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE study_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_stats" ON study_stats
  FOR ALL USING (auth.uid() = user_id);

-- 5. Feedback / bug reports
CREATE TABLE IF NOT EXISTS feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  message TEXT NOT NULL,
  app_version TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_feedback" ON feedback
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "authenticated_insert_feedback" ON feedback
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "users_read_own_feedback" ON feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deck_sync_user ON deck_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_study_stats_user_date ON study_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
