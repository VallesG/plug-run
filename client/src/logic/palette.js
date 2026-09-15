// The character palette — one place the game's people get their colours.
//
// Reference look: thick dark outlines, chunky readable silhouettes, muted
// environments with the characters popping through a few saturated accents,
// hard ground shadows. Most of that is treatment rather than art, which is why
// it lives in code.
//
// Team identity is carried by an ACCENT (ground ring, effects), not by tinting
// the whole sprite — a flat tint crushes whatever shading the art has. The
// outline is the same ink for everyone, because a black line is what makes a
// figure read at thumbnail size, and thumbnail size is what an ad is.
export const PALETTE = {
  ink: 0x0b0b12,      // outline and hard shadow
  runner: 0x9ad1ff,   // matches the menu's runner colour
  plug: 0xff6b6b,     // matches the menu's plug colour
  // The plug sprite has always shipped tinted; its art has not been re-seen
  // untinted, so the tint stays until someone looks at it. Identity now also
  // comes from the ring, so this can be softened later without losing the read.
  plugTint: 0xff6b6b,
  dust: 0xe8dcc8
};

/** Character height in cells. The scale is derived from the texture, not assumed. */
export const CHAR_HEIGHT_CELLS = 1.0;

/** Outline thickness in px for a given cell size — 2px at the shipped 24px cell. */
export function outlinePx(cell) {
  return Math.max(1, Math.round(cell * 0.07));
}
