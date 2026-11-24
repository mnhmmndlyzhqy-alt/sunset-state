#!/usr/bin/env node
// Game integrity check: do the HTML entry points still load a complete, parseable set of scripts?
// Dependency-free. Read-only. Usage: node QA/game_integrity_check.cjs [--json]
//
// FAIL (exit 1): a referenced local script is missing, is empty, or does not pass `node --check`;
//                a required entry file is missing.
// WARN (exit 0): index.html and START_GAME.html disagree on script order/set or on ?v= versions,
//                or a script is included twice.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const asJson = process.argv.includes('--json');
const entries = ['index.html', 'START_GAME.html'];
const requiredFiles = ['engine44.js', 'index.html', 'START_GAME.html'];

const fails = [];
const warns = [];

function parseScripts(html) {
  const out = [];
  const re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1];
    if (/^(https?:)?\/\//i.test(raw)) continue; // remote script, not ours to check
    const [file, query = ''] = raw.split('?');
    const version = (query.match(/(?:^|&)v=([^&]*)/) || [])[1] || null;
    out.push({ raw, file: file.replace(/^\.\//, ''), version });
  }
  return out;
}

for (const f of requiredFiles) {
  if (!fs.existsSync(path.join(root, f))) fails.push(`required file missing: ${f}`);
}

const perEntry = {};
for (const entry of entries) {
  const p = path.join(root, entry);
  if (!fs.existsSync(p)) continue;
  perEntry[entry] = parseScripts(fs.readFileSync(p, 'utf8'));
}

// Existence, non-empty, syntax - each distinct file checked once.
const checked = new Map();
for (const entry of Object.keys(perEntry)) {
  const seen = new Set();
  for (const s of perEntry[entry]) {
    if (seen.has(s.file)) warns.push(`${entry}: script included twice: ${s.file}`);
    seen.add(s.file);
    if (checked.has(s.file)) continue;
    const abs = path.join(root, s.file);
    let status = 'ok';
    if (!fs.existsSync(abs)) {
      status = 'missing';
      fails.push(`${entry}: referenced script missing: ${s.file}`);
    } else if (fs.statSync(abs).size === 0) {
      status = 'empty';
      fails.push(`${entry}: referenced script is empty: ${s.file}`);
    } else {
      const r = spawnSync(process.execPath, ['--check', abs], { encoding: 'utf8' });
      if (r.status !== 0 || r.error) {
        status = 'syntax';
        fails.push(`${entry}: syntax error in ${s.file}: ${(r.stderr || r.error?.message || '').split('\n').find(l => /Error/.test(l)) || 'node --check failed'}`);
      }
    }
    checked.set(s.file, status);
  }
}

// Cross-entry consistency (warnings only: START_GAME.html is the offline launcher and may legitimately differ).
if (perEntry['index.html'] && perEntry['START_GAME.html']) {
  const a = perEntry['index.html'];
  const b = perEntry['START_GAME.html'];
  const aFiles = a.map(s => s.file);
  const bFiles = b.map(s => s.file);
  const onlyA = aFiles.filter(f => !bFiles.includes(f));
  const onlyB = bFiles.filter(f => !aFiles.includes(f));
  if (onlyA.length) warns.push(`only in index.html: ${onlyA.join(', ')}`);
  if (onlyB.length) warns.push(`only in START_GAME.html: ${onlyB.join(', ')}`);
  if (!onlyA.length && !onlyB.length && aFiles.join('|') !== bFiles.join('|')) {
    warns.push('index.html and START_GAME.html load the same scripts in a different order');
  }
  for (const s of a) {
    const t = b.find(x => x.file === s.file);
    if (t && s.version !== t.version) {
      warns.push(`?v= differs for ${s.file}: index.html=${s.version ?? '(none)'} START_GAME.html=${t.version ?? '(none)'}`);
    }
  }
}

const summary = {
  entries: Object.fromEntries(Object.entries(perEntry).map(([k, v]) => [k, v.length])),
  distinctScripts: checked.size,
  ok: [...checked.values()].filter(v => v === 'ok').length,
  failures: fails,
  warnings: warns,
};

if (asJson) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  for (const [k, n] of Object.entries(summary.entries)) console.log(`${k}: ${n} script tags`);
  console.log(`distinct local scripts: ${summary.distinctScripts}, ok: ${summary.ok}`);
  for (const w of warns) console.log(`WARN ${w}`);
  for (const f of fails) console.log(`FAIL ${f}`);
  console.log(`Summary: ${fails.length} failed, ${warns.length} warnings`);
}
process.exitCode = fails.length ? 1 : 0;
