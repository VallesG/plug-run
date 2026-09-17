## Five-expression character pack — Codex (2026-09-17)

Seven character atlases now ship under public/art/the-window/expressions/.
Each is 1600x400 WebP: five 320x400 frames in this stable order:
neutral, amused, hyped, concerned, unimpressed. Total runtime bytes: 810,428.
The four untouched generated PNG sheets (8,879,713 bytes) are archived in
client/art-sources/the-window/expressions/, never public/ or dist.

Presentation-only logic/contactExpressions.js is authoritative. Explicit
page.expression overrides the automatic mapping; unknown expressions are neutral.
Focused job instructions/openers/teases use neutral; fixed joke setup/payoff uses
unimpressed/amused; comeback praise uses concerned; bunk feedback is unimpressed;
other already-earned praise is hyped on its first authored page only.
Celebrations and crew-join confirmation use hyped for BOTH contacts. Retry tips
use the rotating contact's concerned face (Ro for unselected crew).
Ro's bodega introduction maps its existing skeptical/amused beats onto new faces.

ContactPanel lazy-loads only its cue's pair, caches the small expression atlases,
and retains legacy portraits/initials as failure fallbacks. Window preloads the
pack (under 1 MB total); tips request only their one contact and never block retry.
No new dialogue claims, random choices, storage keys, cadence, rewards, mission
rules, bank payloads or input-resumption rules were introduced.

Asset preparation trims disconnected neighboring-pose fragments, then applies
ONE scale per character row, pads to fixed frames, preserves alpha and encodes
quality-82 WebP. A real-browser screenshot caught an adjacent arm in Rook's cell;
the connected-silhouette pass fixes it. Originals are unchanged and fingerprinted.
Rebuild from client/ with node tools/prepare-contact-expressions.mjs; Sharp must
be available to tooling, or pass input directory plus Sharp module path.
It is not a runtime dependency.

Review with Vite: /expressions-preview.html (client root, dev-only).
The page shows all 35 frames plus real Phaser ContactPanel/EliminationTip samples.
Its praise samples explicitly do not measure, persist or award anything.

Verification: 779 expression assertions, actual WebP alpha flags/dimensions/bytes/
SHA-256 and archived source fingerprints; controller rendering/lifecycle tests,
Window selection bounds and shared hyped frames; 22 headless Chrome checks across
all three crews and seven moments plus a real pointer page-turn to the joke payoff.
No browser page errors. Full native verify tests passed; plain Vite build encountered
the existing isolated-checkout Windows realpath EPERM. Production build passes
with build-invocation-only resolve.preserveSymlinks. Physical-phone GPU/decoding
performance and an entire live campaign run remain unverified.
