#!/usr/bin/env node
// Check whether every planned Jev job has a complete capture in one raw folder.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (name) => {
  const i = process.argv.indexOf('--' + name);
  return i < 0 ? null : process.argv[i + 1];
};

export function jobKey(job) {
  return [job.profile, job.slot, job.style, job.powers, job.indexBase, job.runs,
    ...(job.stashSeeds || [])].join('/');
}

export function completeCapture(capture, job) {
  return capture?.tool === 'rivals-record/1' && capture.done === true && !capture.aborted &&
    jobKey(capture.job || {}) === jobKey(job) &&
    Array.isArray(capture.races) && capture.races.length === job.runs &&
    capture.races.every(r => r.ok === true) &&
    capture.jev?.route === 'typesafe-direct' && capture.jev?.report?.budgetStopped == null &&
    capture.jev?.relay?.ok > 0;
}

export function progress(plan, folder) {
  const wanted = new Map(plan.map(job => [jobKey(job), job]));
  const complete = new Set();
  let partial = 0;
  for (const name of existsSync(folder) ? readdirSync(folder) : []) {
    if (!name.endsWith('.json') || name.endsWith('.live.json')) continue;
    let capture;
    try { capture = JSON.parse(readFileSync(join(folder, name), 'utf8')); } catch { partial++; continue; }
    const key = jobKey(capture?.job || {});
    const job = wanted.get(key);
    if (!job) continue;
    if (completeCapture(capture, job)) complete.add(key);
    else partial++;
  }
  const missing = plan.filter(job => !complete.has(jobKey(job)));
  return { jobs: plan.length, complete: complete.size, missing: missing.length, partial,
    racesPlanned: plan.reduce((n, j) => n + j.runs, 0),
    racesCovered: plan.filter(j => complete.has(jobKey(j))).reduce((n, j) => n + j.runs, 0),
    next: missing.slice(0, 5).map(j => ({ slot: j.slot, indexBase: j.indexBase })) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const planFile = arg('plan'), folder = arg('out');
  if (!planFile || !folder) throw new Error('usage: node tools/rivals-variant-progress.mjs --plan <plan.json> --out <raw folder>');
  const result = progress(JSON.parse(readFileSync(planFile, 'utf8')), folder);
  console.log(JSON.stringify(result, null, 2));
  if (result.missing) process.exitCode = 1;
}
