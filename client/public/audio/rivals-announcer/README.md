# Block Rivals announcer

24 voice clips supplied by Gil from his ElevenLabs announcer voice:

- Four separate countdown cues (3, 2, 1, Go), each shorter than one second.
- Three variants per opponent clear for houses 1–5.
- Two variants for house 6. The mistakenly attached house-three clip is only used for house 3.
- Three opponent-finished variants under house 7.

`client/tools/prepare-rivals-announcer.mjs` maps the original filenames to these assets.
It trims boundary silence, targets -18 LUFS / -1.5 dB true peak, and exports mono
44.1 kHz, 128 kbps MP3. Original Downloads files are left intact.

Runtime: `logic/rivalAnnouncer.js` tracks announcements on the race so retries and
house changes do not repeat them. It selects variants without repeating the
previous selection for that house, and skips intermediate clears after a late
frame. `AudioManager` uses one voice channel, follows sound mute/volume, and lowers
music to 45% while speech is active. A newer cue replaces stale speech. Race end
and menu exit stop it; normal house transitions retain it.

Checks (from client):

```
node test/rivalAnnouncer.test.mjs
node test/rivalsFlow.test.mjs
node tools/check-rivals-announcer.mjs
npm run build
```

The browser check starts its own temporary server and browser, uses no Jev API,
and closes both afterward. Existing recording servers are not touched.
