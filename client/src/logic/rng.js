// Lightweight deterministic RNG + daily seed

export function getDailySeed() {
  // override for testing: localStorage.setItem('prla_seed', 'my-seed')
  const override = localStorage.getItem('prla_seed');
  if (override) return override;

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function createRNG(seedStr) {
  // simple FNV-1a hash → LCG
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = (h ^ 0x9e3779b9) >>> 0;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 0x100000000;
  rnd.int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
  rnd.pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  return rnd;
}
