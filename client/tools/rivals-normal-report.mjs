#!/usr/bin/env node
// Summarize raw Normal Jev captures before admitting any race to the bank.
// Usage: node tools/rivals-normal-report.mjs --in tools/recordings/jev/normal-pilot
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const root = arg('in', 'tools/recordings/jev/normal-pilot');
const low = Number(arg('low', '110'));
const high = Number(arg('high', '120'));
if (!existsSync(root) || !statSync(root).isDirectory() || !(low > 0 && high >= low)) {
  console.error('Usage: node tools/rivals-normal-report.mjs --in <capture-directory> [--low 110 --high 120]');
  process.exit(2);
}
const byCourse = new Map();
let files = 0, ignored = 0;
for (const name of readdirSync(root)) {
  if (!name.endsWith('.json') || name.endsWith('.live.json')) continue;
  let data;
  try { data = JSON.parse(readFileSync(join(root, name), 'utf8')); }
  catch { ignored++; continue; }
  if (!Array.isArray(data.races)) { ignored++; continue; }
  files++;
  for (const race of data.races) {
    const profile = race?.record?.driverConfig?.jev?.profile ?? race?.jev?.report?.profile;
    if (profile !== 'normal') { ignored++; continue; }
    const slot = race.record?.courseSlot ?? data.job?.slot;
    if (!Number.isInteger(slot)) { ignored++; continue; }
    const group = byCourse.get(slot) || [];
    group.push({ ok: !!race.ok && race.houses === 7, sec: race.elapsedMs / 1000,
      retries: race.retries ?? 0, budgetStopped: race.jev?.report?.budgetStopped });
    byCourse.set(slot, group);
  }
}
console.log(`Normal Jev raw captures: ${files} files; target ${low}-${high}s; ignored ${ignored}`);
console.log('slot  valid/total  median  range       target  retries(median)');
for (const [slot, rows] of [...byCourse].sort((a, b) => a[0] - b[0])) {
  const valid = rows.filter(r => r.ok && !r.budgetStopped && Number.isFinite(r.sec));
  const times = valid.map(r => r.sec).sort((a, b) => a - b);
  const retries = valid.map(r => r.retries).sort((a, b) => a - b);
  const median = a => a[Math.floor(a.length / 2)];
  const inBand = times.filter(s => s >= low && s <= high).length;
  console.log(`${String(slot).padStart(4)}  ${String(valid.length + '/' + rows.length).padEnd(11)}  ` +
    `${times.length ? median(times).toFixed(0).padStart(6) : '     -'}  ` +
    `${times.length ? `${times[0].toFixed(0)}-${times.at(-1).toFixed(0)}`.padEnd(10) : '-'.padEnd(10)}  ` +
    `${String(inBand + '/' + valid.length).padEnd(6)}  ${retries.length ? median(retries) : '-'}`);
}
