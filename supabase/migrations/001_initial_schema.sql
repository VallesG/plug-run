-- Plug Run LA - Initial Database Schema
-- This migration creates the core tables for user accounts and leaderboards

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
-- Extends Supabase auth.users with game-specific data
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  is_guest BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,

  -- Game stats
  total_stash INTEGER DEFAULT 0,
  total_rep INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  best_plug_round INTEGER DEFAULT 0,
  best_runner_round INTEGER DEFAULT 0,

  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DAILY SCORES TABLE
-- ============================================
-- Tracks daily route leaderboards (resets at 6pm PDT)
CREATE TABLE IF NOT EXISTS public.daily_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  route_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('runner', 'plug')),
  round INTEGER NOT NULL,
  stash INTEGER NOT NULL DEFAULT 0,
  rep INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only have one score per route per role
  UNIQUE(user_id, route_id, role)
);

-- ============================================
-- ALL-TIME SCORES TABLE
-- ============================================
-- Tracks best ever performance per role
CREATE TABLE IF NOT EXISTS public.alltime_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('runner', 'plug')),
  round INTEGER NOT NULL,
  stash INTEGER NOT NULL DEFAULT 0,
  rep INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only have one all-time score per role
  UNIQUE(user_id, role)
);

-- ============================================
-- INDEXES FOR FAST LEADERBOARD QUERIES
-- ============================================
-- Daily leaderboards sorted by round DESC, stash DESC, rep DESC
CREATE INDEX idx_daily_scores_leaderboard
  ON public.daily_scores(route_id, role, round DESC, stash DESC, rep DESC);

-- All-time leaderboards sorted by round DESC, stash DESC, rep DESC
CREATE INDEX idx_alltime_scores_leaderboard
  ON public.alltime_scores(role, round DESC, stash DESC, rep DESC);

-- User lookup index
CREATE INDEX idx_daily_scores_user
  ON public.daily_scores(user_id);

CREATE INDEX idx_alltime_scores_user
  ON public.alltime_scores(user_id);

-- Username lookup (for claiming)
CREATE INDEX idx_users_username
  ON public.users(username);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alltime_scores ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read all user profiles"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Daily scores policies
CREATE POLICY "Anyone can read daily scores"
  ON public.daily_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own scores"
  ON public.daily_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scores"
  ON public.daily_scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- All-time scores policies
CREATE POLICY "Anyone can read all-time scores"
  ON public.alltime_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own all-time scores"
  ON public.alltime_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own all-time scores"
  ON public.alltime_scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check username availability
CREATE OR REPLACE FUNCTION is_username_available(username_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE LOWER(username) = LOWER(username_to_check)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REALTIME PUBLICATION
-- ============================================
-- Enable real-time updates for leaderboards
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alltime_scores;
