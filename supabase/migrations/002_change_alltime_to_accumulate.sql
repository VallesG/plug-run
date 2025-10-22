-- Change all-time leaderboard to track accumulated totals instead of best ever
-- This migration modifies the alltime_scores table structure

-- Drop the old table (WARNING: This deletes existing all-time scores!)
-- If you want to preserve data, you'd need a more complex migration
DROP TABLE IF EXISTS public.alltime_scores CASCADE;

-- Recreate alltime_scores with accumulated totals
CREATE TABLE public.alltime_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('runner', 'plug')),

  -- Accumulated totals (sum of all games played)
  total_stash INTEGER NOT NULL DEFAULT 0,
  total_rep INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,

  -- Best performance metrics (for reference)
  best_round INTEGER DEFAULT 0,

  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only have one all-time record per role
  UNIQUE(user_id, role)
);

-- Update index to sort by total_stash instead of round
CREATE INDEX idx_alltime_scores_leaderboard
  ON public.alltime_scores(role, total_stash DESC, total_rep DESC);

-- Grant permissions (same as before)
ALTER TABLE public.alltime_scores ENABLE ROW LEVEL SECURITY;

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

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.alltime_scores;

COMMENT ON TABLE public.alltime_scores IS 'Tracks accumulated lifetime stats per user per role';
COMMENT ON COLUMN public.alltime_scores.total_stash IS 'Total STASH accumulated across all games';
COMMENT ON COLUMN public.alltime_scores.total_rep IS 'Total REP accumulated across all games';
COMMENT ON COLUMN public.alltime_scores.games_played IS 'Total number of games played';
COMMENT ON COLUMN public.alltime_scores.best_round IS 'Highest round ever reached (for reference)';
