'use strict';
var load = require('./load.js');
var T0 = new Date('2026-11-09T14:00:00+08:00').getTime();

/* A brain with a fake clock so tests are deterministic. */
function mk(cfg, hourIso) {
  var Leon = load();
  var clock = { t: hourIso ? new Date(hourIso).getTime() : T0 };
  var b = new Leon.Brain({ config: Object.assign({ seed: 42 }, cfg || {}), now: function () { return clock.t; }, storage: memStore() });
  b.clock = clock; b.Leon = Leon;
  return b;
}
function memStore() {
  var m = {};
  return { get: function (k) { return m[k] ? JSON.parse(m[k]) : null; }, set: function (k, v) { m[k] = JSON.stringify(v); }, remove: function (k) { delete m[k]; } };
}
function text(r) { return r.beats.map(function (b) { return b.text; }).join(' | '); }
function say(b, msg) { return b.respond(msg); }

var passed = 0, failed = 0, fails = [];
function ok(cond, name, detail) {
  if (cond) passed++; else { failed++; fails.push(name + (detail ? '  -> ' + detail : '')); }
}
function eq(a, b, name) { ok(a === b, name, 'got ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b)); }
function section(n) { console.log('\n== ' + n); }
function summary() {
  console.log('\n' + (failed ? 'FAILED' : 'ALL PASSED') + ': ' + passed + ' passed, ' + failed + ' failed');
  fails.forEach(function (f) { console.log('  x ' + f); });
  return failed;
}
module.exports = { mk: mk, memStore: memStore, text: text, say: say, ok: ok, eq: eq, section: section, summary: summary, load: load, T0: T0 };
