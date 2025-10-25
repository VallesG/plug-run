-- Activity Feed for Street Scanner
-- Tracks recent game events for live activity display on desktop sidebars

CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'runner_extract',      -- Runner successfully escaped with stash
    'plug_stop',           -- Plug stopped runner from extracting
    'runner_eliminated',   -- Runner eliminated by plug
    'personal_best',       -- User hit new personal best round
    'leaderboard_climb',   -- User moved up in leaderboard rankings
    'bunk_pickup',         -- User picked up bunk stash
    'account_claimed',     -- Guest upgraded to claimed account
    'win_streak'           -- User on a win streak
  )),

  -- User info
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,

  -- Event metadata (flexible JSON for different event types)
  metadata JSONB DEFAULT '{}',
  -- Examples:
  -- runner_extract: { "stash": 1, "round": 3, "mode": "runner" }
  -- plug_stop: { "round": 2, "mode": "plug" }
  -- runner_eliminated: { "round": 4, "had_stash": true }
  -- personal_best: { "round": 8, "mode": "plug", "previous": 5 }
  -- leaderboard_climb: { "rank": 3, "previous_rank": 7, "mode": "runner" }
  -- bunk_pickup: { "round": 2 }
  -- win_streak: { "streak": 5, "mode": "runner" }

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
-- Index for fetching recent events (most common query)
CREATE INDEX idx_activity_feed_recent
  ON public.activity_feed(created_at DESC);

-- Index for user-specific events
CREATE INDEX idx_activity_feed_user
  ON public.activity_feed(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Anyone can read activity feed (public feed)
CREATE POLICY "Anyone can read activity feed"
  ON public.activity_feed FOR SELECT
  USING (true);

-- Users can insert their own events
CREATE POLICY "Users can insert their own events"
  ON public.activity_feed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- CLEANUP FUNCTION
-- ============================================
-- Auto-cleanup: delete events older than 1 hour
CREATE OR REPLACE FUNCTION cleanup_old_activity()
RETURNS void AS $$
BEGIN
  DELETE FROM public.activity_feed
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_activity() TO anon;

-- ============================================
-- HELPER FUNCTION TO LOG ACTIVITY
-- ============================================
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_username TEXT,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  -- Cleanup old events first (keep feed fresh)
  PERFORM cleanup_old_activity();

  -- Insert new event
  INSERT INTO public.activity_feed (user_id, username, event_type, metadata)
  VALUES (p_user_id, p_username, p_event_type, p_metadata)
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_activity(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_activity(UUID, TEXT, TEXT, JSONB) TO anon;

-- ============================================
-- REALTIME PUBLICATION (optional for future)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;

COMMENT ON TABLE public.activity_feed IS 'Stores recent game events for live Street Scanner feed (auto-deletes after 1 hour)';
COMMENT ON COLUMN public.activity_feed.event_type IS 'Type of game event (runner_extract, plug_stop, etc.)';
COMMENT ON COLUMN public.activity_feed.metadata IS 'Event-specific data stored as JSON';
