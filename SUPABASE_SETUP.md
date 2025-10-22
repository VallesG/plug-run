# Supabase Setup Guide for Plug Run LA

This guide walks you through setting up Supabase for global leaderboards and user authentication.

## Prerequisites

- Supabase account (free tier works great!)
- Node.js and npm installed
- This codebase cloned locally

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in/sign up
2. Click "New Project"
3. Fill in details:
   - **Name:** Plug Run LA
   - **Database Password:** (save this securely!)
   - **Region:** Choose closest to your users (US West for LA)
4. Click "Create new project"
5. Wait ~2 minutes for project to spin up

---

## Step 2: Run Database Migration

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify success: You should see "Success. No rows returned"

**What this does:**
- Creates `users`, `daily_scores`, and `alltime_scores` tables
- Sets up indexes for fast leaderboard queries
- Configures Row Level Security (RLS) policies
- Enables real-time subscriptions

---

## Step 3: Get API Keys

1. In Supabase dashboard, go to **Settings** → **API** (left sidebar)
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

---

## Step 4: Configure Environment Variables

### For Local Development:

1. Create `client/.env` file (copy from `.env.example`):
   ```bash
   cd client
   cp .env.example .env
   ```

2. Edit `client/.env` with your Supabase credentials:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key-here
   ```

3. Restart your dev server:
   ```bash
   npm run dev
   ```

### For Netlify Deployment:

1. Go to your Netlify dashboard
2. Select your site → **Site settings** → **Environment variables**
3. Add these variables:
   - Key: `VITE_SUPABASE_URL`
     Value: `https://your-project.supabase.co`
   - Key: `VITE_SUPABASE_ANON_KEY`
     Value: `eyJhbGc...your-anon-key-here`
4. Trigger a new deployment (push to GitHub or manual deploy)

---

## Step 5: Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider:
   - Toggle "Enable Email provider" ON
   - **Confirm email:** Toggle OFF for easier testing (enable in production!)
   - Click "Save"

---

## Step 6: Verify Setup

### Test 1: Check Tables Exist

1. Go to **Table Editor** in Supabase dashboard
2. You should see 3 tables:
   - `users`
   - `daily_scores`
   - `alltime_scores`

### Test 2: Test Local Connection

1. Open your game in browser (http://localhost:5173)
2. Open browser console (F12)
3. Look for log message: `[Supabase] Guest synced to Supabase for leaderboards`
4. If you see an error, check:
   - `.env` file exists in `client/` directory
   - Environment variables match your Supabase project
   - Dev server was restarted after adding `.env`

### Test 3: Verify Score Submission

1. Play a round and complete it
2. Check browser console for: `[Leaderboard] Submitted to global daily leaderboard`
3. Go to Supabase dashboard → **Table Editor** → `daily_scores`
4. You should see your score!

---

## Step 7: Enable Real-Time (Optional but Awesome!)

Real-time lets leaderboards update live when other players submit scores.

1. In Supabase dashboard, go to **Database** → **Replication**
2. Enable replication for these tables:
   - `daily_scores`
   - `alltime_scores`
3. Click "Save"

---

## Troubleshooting

### Error: "Supabase not initialized"

**Cause:** Environment variables not loaded

**Fix:**
- Verify `client/.env` exists with correct values
- Restart dev server (`npm run dev`)
- Check variable names start with `VITE_` (required for Vite)

### Error: "relation public.users does not exist"

**Cause:** Database migration didn't run

**Fix:**
- Go to SQL Editor in Supabase
- Re-run the migration from `supabase/migrations/001_initial_schema.sql`
- Check for SQL syntax errors in the output

### Error: "new row violates row-level security policy"

**Cause:** RLS policies not set up correctly

**Fix:**
- Verify RLS policies exist (SQL Editor → check migration ran successfully)
- Try disabling RLS temporarily for testing:
  ```sql
  ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.daily_scores DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.alltime_scores DISABLE ROW LEVEL SECURITY;
  ```
- Re-enable after testing!

### Scores not appearing in global leaderboard

**Check:**
1. Browser console for errors
2. Supabase dashboard → **Table Editor** → verify data exists
3. Network tab in dev tools for failed requests
4. Supabase dashboard → **Logs** → **Postgres Logs** for database errors

---

## What's Next?

Now that Supabase is set up, you can:

1. **Test account claiming** - Play a few games, then claim your account
2. **View global leaderboards** - See other players' scores
3. **Add UI improvements** - Create the claim account modal and leaderboard tabs
4. **Enable real-time** - Watch leaderboards update live!

---

## Security Notes

### What's Safe:

✅ **anon public key** - Safe to expose in client code (it's called "public" for a reason!)
✅ **Project URL** - Safe to expose

### What's NOT Safe:

❌ **service_role key** - NEVER put this in client code or commit to Git
❌ **Database password** - Only for direct database access, not needed in app

### Row Level Security (RLS):

The migration sets up RLS policies that ensure:
- Users can read all leaderboards (public data)
- Users can only update their own scores (no cheating!)
- Username claims check for availability (no duplicates)

---

## Support

**Supabase Docs:** https://supabase.com/docs

**Supabase Discord:** https://discord.supabase.com

**This Project Issues:** https://github.com/VallesG/plug-run/issues
