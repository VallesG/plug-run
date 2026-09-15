# Plug Run identity — Follow the light

These are editable SVG masters, not flattened screenshots. All wordmark letters
are outlined paths: no downloaded font or image-generation service is required.

- `plug-run-wordmark.svg`: transparent 600 × 192 lockup for dark backgrounds.
- `plug-run-mark.svg`: square dark-backed route/house mark for small placements.
- `night-block.svg`: archived exterior establishing illustration; no longer used on the title screen.

The route leads toward a house-shaped gold marker. Ivory is the ink-cut title,
blue is the runner/escape route, and warm gold is light and the selected menu option.
Keep the palette restrained; do not add gradients, neon outlines or emoji.
Use the full lockup at 200 px wide or larger, the square mark for smaller slots.
Leave at least one letter-stem of clear space and preserve the aspect ratio.
Do not put the transparent wordmark directly on white; use a dark backing.

The title screen loads the wordmark through Phaser's SVG loader at 2× resolution.
A quiet vertical menu replaces the old card; faint existing character sprites
frame the background. There is no street illustration or large gold button.
The SVG favicon uses the square mark. Existing PNG/apple-touch icons are retained
as fallbacks; they have not been regenerated in this session.

Review at `/brand-preview.html` under Vite. Its iframe is the actual game, so
buttons can start or resume a real local session. Menu state and launch behavior
remain owned by MenuScene; responsive dimensions, save labels and fixed silhouette placement are in landingLayout.
