// Minimal global store for weapons/ammo between scenes
const KEY = 'prla_inv_v1';

const inv = {
  coins: 0,
  product: 0,
  weapons: { pistol: false, doublebarrel: false, laser: false, rifle: false, shotgun: false },
  ammo:    { pistol: 0,     doublebarrel: 0, laser: 0, rifle: 0, shotgun: 0 },
};

export function loadInv() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(inv, JSON.parse(raw));
  } catch {}
  return inv;
}
export function saveInv() { try { localStorage.setItem(KEY, JSON.stringify(inv)); } catch {} }

export function addCoins(n){ inv.coins += n; saveInv(); }
export function addProduct(n){ inv.product += n; saveInv(); }
export function addAmmo(t, n=1){ inv.ammo[t] = (inv.ammo[t]||0)+n; saveInv(); }
export function unlockWeapon(t){ inv.weapons[t] = true; if (!inv.ammo[t]) inv.ammo[t]=0; saveInv(); }

export function spendAmmo(t, n=1){
  if ((inv.ammo[t]||0) < n) return false;
  inv.ammo[t] -= n; saveInv(); return true;
}

export function resetRunDeltas() {
  // utility if you want to snapshot per-run later
}

export default inv;
