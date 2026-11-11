'use strict';
/* Runs every test suite and prints one summary line per suite.   node tests/run_all.js [--no-browser] */
var cp = require('child_process'), path = require('path');
var skipBrowser = process.argv.indexOf('--no-browser') > -1;
var SUITES = [
  ['engine + brain + NLU', 'run.js'],
  ['voice (G2P, synth, lip-sync, sfx, manager)', 'run_voice.js'],
  ['stage + companion', 'run_ui.js'],
  ['build + script order', 'run_build.js'],
  ['avatar in Chromium', 'browser_avatar.js', true],
  ['demo app in Chromium', 'browser_app.js', true]
];
var failed = [], t0 = Date.now();
SUITES.forEach(function (s) {
  if (s[2] && skipBrowser) { console.log('-- skipped (browser): ' + s[0]); return; }
  var t = Date.now();
  var r = cp.spawnSync(process.execPath, [path.join(__dirname, s[1])].concat(s[2] ? [require('os').tmpdir() + '/leon-shots'] : []), { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  var out = (r.stdout || '') + (r.stderr || ''), last = out.trim().split('\n').filter(function (l) { return /passed|PASSED|FAILED|checks/.test(l); }).pop() || out.trim().split('\n').pop();
  var good = r.status === 0;
  console.log((good ? 'ok   ' : 'FAIL ') + s[0] + '  (' + ((Date.now() - t) / 1000).toFixed(1) + 's)  ' + (last || '').trim());
  if (!good) { failed.push(s[0]); console.log(out.split('\n').slice(-25).join('\n')); }
});
console.log('\n' + (failed.length ? 'FAILED: ' + failed.join('; ') : 'ALL SUITES PASSED') + '  (' + ((Date.now() - t0) / 1000).toFixed(0) + 's)');
process.exit(failed.length ? 1 : 0);
