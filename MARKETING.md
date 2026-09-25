# Plug Run marketing plan

Plan for getting players, written September 2026. Focus: **mobile players and play-to-earn (P2E) communities**, through Telegram.

## Where we are

- **The game:** Plug Run is a free arcade heist game. Grab the stash, dodge the Plug, make the getaway car. It has a story campaign, head-to-head Block Rivals, and a Daily Race.
- **The hook:** in Telegram, the fastest verified Daily Race run each day wins **1 GRAM**, paid by the owner. The prize is Telegram-only.
- **Links:**
  - Telegram: `t.me/PlugRunBot/play`
  - Web: `plugrun.io`
  - Rules: `plugrun.io/rules`
- **What didn't work:** indie-dev showcase sites (PlayMyGame, AIGameDev). They're full of other developers, not players. Lesson: go where **players** already are, especially players who already play Telegram mini apps for rewards.
- **Prize budget:** 13.9 GRAM loaded, which is about 13 days at 1 GRAM a day.

## Who we're targeting

1. **P2E / TON players on Telegram.** They already open mini apps daily for rewards, already have TON wallets, and already understand "play, win crypto." A small prize still matters to them as long as it's real and paid.
2. **Casual mobile players.** They want something quick to play in a spare minute. Plug Run runs in the browser with swipe controls and no install.

## The message

- **One line:** Free heist game on Telegram. Fastest run every day wins 1 GRAM.
- **Proof beats promises:** show real winners getting paid. "Ana won 1 GRAM with 1:02.0" is worth more than any feature list.
- **Be honest about the size:** 1 GRAM is small. Pitch it as "a skill game with a daily prize," not "earn money." The P2E crowd is used to getting burned and trusts honesty.

## Plan

### Week 1: seed (free, about 20 minutes a day)

**Telegram P2E / TON groups (main channel)**
- Search Telegram for groups like "TON games", "mini apps", "play to earn", "airdrop hunters" and "tap games". Join 5–10 active ones, meaning dozens of messages a day or more.
- Read each group's rules first. Many only allow promotion in one topic or on certain days, and posting against the rules gets you banned.
- Post once per group, then answer every reply.
- Post to use:
  > Made a free arcade heist game on Telegram 🏃💰
  > Grab the stash, dodge the Plug, make the getaway car.
  > Fastest Daily Race run each day wins 1 GRAM, paid by me, winners posted daily.
  > No wallet needed to play, only to claim.
  > 👉 t.me/PlugRunBot/play

  Attach the 47-second gameplay video.

**Mini app catalogs**
- Submit Plug Run to Telegram mini app directories: tApps Center, Find Mini App, and any TON app catalog that's live.
- Check each one is still accepting submissions before spending time on it.
- Use the one-line description, the 4 screenshots, and the video.

**Daily winner post (every day once prizes run)**
- Post the winner and time, then "today's race is live," wherever you've been posting and on X.
- The template:
  > 🏁 Daily Race #N: [name] won 1 GRAM with [time].
  > Today's race is live, same course for everyone: t.me/PlugRunBot/play

### Week 2: mobile channels

- **TikTok / YouTube Shorts / Instagram Reels:**
  - Post a 15–30 second clip, with the video cut vertical.
  - Put the hook in the first 2 seconds: the Plug shooting and a near-miss.
  - Caption: "free game in Telegram, fastest run wins crypto daily."
  - Post 3–5 times, trying different clips.
- **Reddit (players, not devs):** r/WebGames (web link), r/TelegramGames, r/TONcoin (check the rules, and lead with the game, not the prize).
- **X / crypto Twitter:**
  - Post the daily winners with #TON #GRAM #TelegramGames.
  - Reply under TON ecosystem accounts' posts about mini app games, where it's relevant.

### Week 3+: pay only if the free stuff shows people stay

- **Paid shoutouts:** small TON/P2E Telegram channels (a few thousand members) often sell a post for a few dollars' worth of GRAM. Try one or two, and use a tagged link (below) to see what each post brings.
- **Telegram Ads:** can be paid in GRAM and aimed at crypto and gaming channels. Only worth it once organic players come back day after day.
- **Telegram's app store featuring:** Telegram says it may feature Mini Apps that have a Main Mini App and accept Telegram Stars payments. Plug Run has the Main Mini App; it would need one small optional Stars item, like a cosmetic or "chip in to the prize pool." That's a dev task for later.

## Tracking what works

- **Tagged links per place:** Telegram passes the start parameter through, so use a different link for each place you post.
  - Examples: `t.me/PlugRunBot/play?startapp=r_reddit`, `…?startapp=r_tonchat`, `…?startapp=r_tiktok`.
  - The game already reads `r_` links as referrals in analytics (start kind "ref"). To see *which* one, the game needs a small change to log the tag; that's a dev task.
- **Numbers to watch in Google Analytics (Telegram players):**
  - New players a day.
  - Players who finish their first house.
  - Players who come back the next day. This is the most important one.
  - Official Daily Race runs a day.
  - Prize claims.
- **Decide weekly:** drop anything that brought nobody, and do more of anything whose players came back.

## Rules for ourselves

- Never spam: one post per group, follow group rules, answer replies.
- Never promise "earn money." Say "daily prize."
- Pay every winner quickly and publicly. Trust is the whole pitch.
- Review each winner before paying (`/dq N reason` if a run looks fake).
- Don't run paid ads until players are coming back.

## Dev tasks this plan wants (in order)

1. **Log the referral tag:** record which `r_` link each new Telegram player came from.
2. **Share your time:** after a Daily Race, let players post their time to a chat with a play link. Challenges already do this for a friend; this would be the daily version.
3. **Vertical short clips:** 15–30 second highlight cuts for TikTok, Shorts and Reels.
4. **Fix the power picker on small phones:** the power names overlap their descriptions.
5. **A Telegram Stars item,** for app store featuring.
