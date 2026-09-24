// Today's Daily Race prize as the game last heard it from the server (the
// menu asks when it opens in Telegram). Prizes are Telegram-only, so on the
// web this stays empty.
let today = null;

export function setTodayPrize(p) {
  today = p && Number.isInteger(p.day) && p.usd > 0 ? { day: p.day, usd: p.usd } : null;
}

/** { day, usd } when Daily #n has a prize, else null. */
export function todayPrize(n) {
  return today && today.day === n ? today : null;
}
