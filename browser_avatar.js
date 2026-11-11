'use strict';
/* Headless-Chromium test of the animated avatar: loads the real scripts, drives every expression, gesture and
 * mouth shape, fails on any console error / page error, and saves screenshots for a visual check. */
var path = require('path'), fs = require('fs');
var pw = require('playwright');
var ROOT = path.join(__dirname, '..');
var OUT = process.argv[2] || path.join(require('os').tmpdir(), 'leon-shots');
fs.mkdirSync(OUT, { recursive: true });
var SCRIPTS = ['src/engine/util.js', 'src/avatar/parts.js', 'src/avatar/face.js', 'src/avatar/props.js', 'src/avatar/expressions.js', 'src/avatar/avatar.js', 'src/avatar/motion.js', 'src/avatar/animator.js'];

(async function () {
  var browser = await pw.chromium.launch();
  var page = await browser.newPage({ viewport: { width: 420, height: 480 }, deviceScaleFactor: 1 });
  var errors = [];
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error' || m.type() === 'warning') errors.push('console.' + m.type() + ': ' + m.text()); });
  var html = '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#c9f7e4"><div id="leon" style="width:400px;height:460px"></div>' +
    SCRIPTS.map(function (s) { return '<script src="file://' + path.join(ROOT, s) + '"></script>'; }).join('') + '</body>';
  var htmlPath = path.join(OUT, 'avatar_test.html'); fs.writeFileSync(htmlPath, html);
  await page.goto('file://' + htmlPath);
  var results = await page.evaluate(async function () {
    var out = { ok: [], bad: [] };
    var leon = Leon.Avatar.create(document.getElementById('leon'), { autostart: false });
    var t = 0;
    function frames(n) { for (var i = 0; i < n; i++) { t += 0.033; leon.step(t); } }
    function check(name, cond, detail) { (cond ? out.ok : out.bad).push(name + (cond ? '' : ' :: ' + detail)); }
    /* every expression draws and has face parts */
    Leon.Avatar.NAMES.forEach(function (n) {
      leon.setExpression(n, { force: true }); frames(5);
      var svg = leon.el;
      check('expr ' + n, svg.querySelector('[data-p="eyes"]').innerHTML.length > 10 || n === 'cool', 'eyes empty');
      check('mouth ' + n, svg.querySelector('[data-p="mouth"]').innerHTML.length > 20, 'mouth empty');
      var tf = svg.querySelector('[data-p="root"]').getAttribute('transform');
      check('finite transform ' + n, !/NaN|Infinity/.test(tf), tf);
    });
    /* every viseme */
    leon.setExpression('happy', { force: true });
    Leon.Avatar.VISEMES.forEach(function (v) { leon.setMouth(v, 1); frames(1); check('viseme ' + v, leon.el.querySelector('[data-p="mouth"]').innerHTML.length > 0 || v === 'X' || v === 'M', 'empty mouth'); });
    leon.setMouth('X');
    /* every gesture runs to completion and leaves no override behind */
    Leon.Motion.gestureNames.forEach(function (g) {
      var d = leon.gesture(g); check('gesture starts ' + g, d > 0, 'dur ' + d);
      for (var ms = 0; ms < d + 200; ms += 33) { t += 0.033; leon.step(t); }
      check('gesture ends ' + g, leon.state.pose === null && leon.state.mouthForce === null, 'pose=' + leon.state.pose + ' mouth=' + leon.state.mouthForce);
      var tf = leon.el.querySelector('[data-p="root"]').getAttribute('transform');
      check('transform sane after ' + g, !/NaN|Infinity/.test(tf), tf);
    });
    /* blink + look do not break anything over a long idle */
    leon.setExpression('neutral', { force: true });
    for (var i = 0; i < 900; i++) { t += 0.033; leon.step(t); }
    check('30s idle ok', !/NaN/.test(leon.el.innerHTML), 'NaN in markup');
    leon.blink(); frames(10);
    return out;
  });
  results.bad.forEach(function (b) { console.log('  x ' + b); });
  console.log('  avatar checks: ' + results.ok.length + ' passed, ' + results.bad.length + ' failed');

  /* screenshots: neutral, a talking mouth, mid-gesture */
  async function shot(name, setup) { await page.evaluate(setup); await page.waitForTimeout(120); await page.screenshot({ path: path.join(OUT, name + '.png') }); }
  await page.evaluate(function () { window.__leon = Leon.Avatar.create(document.getElementById('leon'), { autostart: true, fps: 60 }); });
  await shot('neutral', function () { __leon.setExpression('neutral'); });
  await shot('talk_A', function () { __leon.setExpression('cheerful'); __leon.setMouth('A', 1.1); __leon.setSpeaking(1); });
  await shot('gesture_hop', function () { __leon.setSpeaking(0); __leon.setMouth('X'); __leon.setExpression('excited'); __leon.gesture('hop', { dur: 1200 }); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'gesture_hop_mid.png') });
  await page.waitForTimeout(1200);
  await shot('scream', function () { __leon.setExpression('angry2'); __leon.gesture('scream'); });
  await page.waitForTimeout(1500);
  var live = await page.evaluate(function () { return document.getElementById('leon').querySelector('[data-p="root"]').getAttribute('transform'); });
  console.log('  live rAF transform: ' + live);
  if (!/translate/.test(live)) errors.push('animator loop did not run');
  await browser.close();
  errors.forEach(function (e) { console.log('  ! ' + e); });
  process.exit(results.bad.length || errors.length ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(2); });
