# Crew sigils and block-clear presentation

The 15-house result now reveals the entire neighborhood, including formerly black courtyard parcels. This is an explicit completion-only presentation pass (`celebration: true` plus a complete block), not a change to exploration, city ownership, seeds, rewards, mission items or Rivals. Normal street screens and embedded city blocks retain their fog behavior.

Journey completion uses the frozen `scene.blockGangID` for a faded crew mural underneath streets and roofs, matching result badges and the primary action. Daily completion reveals the same neighborhood without inventing a crew claim. Crossline has crossed routes, Iron Row an olive/safety-yellow bolt and IR monogram, Afterlight a violet halo and rising spark. Canonical geometry lives in `client/src/logic/crewSigils.js`; portable SVGs live in `client/public/art/crews/`. No raster assets or fonts in the marks.

`BlockComplete.js` registers compact STASH/REP badges and the map with the existing modal lifecycle. ENTER NEXT BLOCK is the only bright Journey action; WATCH REPLAY and MAIN MENU share a quieter row. Replay hides/restores all extras; teardown leaves no veil. Completion styles in GameUI are opt-in and do not recolor ordinary modals.

Review: `/block-map-preview.html` on the Vite dev server, slider at 15, crew selector, including 280×480 and desktop presets. See `CREW_SIGILS_DESIGN.md`.

Measured: adapted in-memory V8 execution of 41 existing logic/flow suites before and after changes; new completion suite 36 assertions; expanded city-flow suite 115 assertions (baseline 77); unchanged Rivals bank 402 assertions across 55 recordings. The bot harness required a console stub, then passed both runs. Seven changed runtime modules and the preview script also parse in V8. Native `npm run verify`, filesystem/art and native ESM integration checks, Vite build, actual Phaser rendering/font metrics and phone appearance remain unverified: local execution is intentionally avoided at the user's Carbon Black request. Run native verify when an execution-safe environment is available.


## Asset contract

- Crossline: `client/public/art/crews/crossline-sigil.svg`; teal crossed route lanes and a central diamond.
- Iron Row: `client/public/art/crews/iron-row-sigil.svg`; safety-yellow hexagonal bolt and IR monogram. Never Plug red.
- Afterlight: `client/public/art/crews/afterlight-sigil.svg`; violet offset halos, rising spark and two baseline bars.

All assets use a 100×100 viewBox, square line caps and currentColor. They are generated from `crewSigilSVG()` and the test asserts exact equivalence. `drawCrewSigil()` paints the same geometry with Phaser graphics; unknown identities draw nothing. Future stickers/flags may reuse these assets, but no new cosmetics or store inventory is added here.

Completion rendering fills land parcels before roads and roofs, then paints the crew mark at 19% opacity. It omits opaque exploration masks and the destination pin only when an explicit celebration is complete. The land is decorative, not interactive, and does not mutate map layout or gameplay RNG.

The existing duo contact cover and its narrative claim occur before this result screen exactly as before. Score badges display the existing session totals; no extra reward is granted.

## Follow-up review

Check the actual phone result for readable badges, visible but subtle mural, all fifteen illuminated roofs, no courtyard holes, and both small footer actions. Check replay returns to intact totals and next block enters its normal city/contact/house sequence. The preview is dev-only, not a promised production route.
