'use strict';
/* Headless-Chromium smoke test of the complete demo app, the overlay page, the one-file builds and the offline PWA.
 *   node tests/browser_app.js [screenshotDir]
 * Fails on any console error / page error / failed request. Screenshots go to the given folder (default: OS temp dir). */
var path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
var pw = require('playwright');
var build = require('../tools/build.js');
var ROOT = path.join(__dirname, '..');
var OUT = process.argv[2] || path.join(os.tmpdir(), 'leon-shots');
fs.mkdirSync(OUT, { recursive: true });
var good = 0, bad = [];
function check(name, cond, detail) {
  if (cond) { good++; return; }
  var line = name + (detail ? ' :: ' + detail : ''); bad.push(line); console.log('  x ' + line);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function watch(page, label, sink) {
  page.on('pageerror', function (e) { sink.push(label + ' pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error' || m.type() === 'warning') sink.push(label + ' console.' + m.type() + ': ' + m.text()); });
  page.on('requestfailed', function (r) { sink.push(label + ' requestfailed: ' + r.url()); });
}
function logTexts(page) { return page.evaluate(function () { return Array.prototype.map.call(document.querySelectorAll('#log li'), function (li) { return (li.classList.contains('msg-you') ? 'you' : 'leon') + (li.classList.contains('action') ? ' action' : '') + '|' + li.textContent; }); }); }
async function waitLog(page, re, ms) {
  var t0 = Date.now(), last = [];
  while (Date.now() - t0 < ms) { last = await logTexts(page); if (last.some(function (l) { return re.test(l); })) return true; await sleep(250); }
  return false;
}

/* ------------------------------------------------------------------ the demo page */
async function runDemo(browser, url, label, shotPrefix, deep) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  var page = await ctx.newPage(), errors = [];
  watch(page, label, errors);
  await page.goto(url);
  await page.waitForSelector('#leon svg', { timeout: 5000 });
  check(label + ': wake screen is up', await page.locator('#wake').isVisible());
  check(label + ': avatar svg drawn', await page.locator('#leon svg').count() === 1);
  await page.screenshot({ path: path.join(OUT, shotPrefix + '_1_wake.png') });

  await page.click('#wakeBtn');
  check(label + ': greeting arrives', await waitLog(page, /^leon\|.+/, 8000));
  await page.waitForTimeout(1500);
  check(label + ': wake screen goes away', await page.locator('#wake').isHidden());
  var bubble = await page.evaluate(function () { var b = document.getElementById('bubble'); var r = b.getBoundingClientRect(); return { show: b.classList.contains('show'), text: b.textContent, l: r.left, r: r.right, t: r.top, w: window.innerWidth }; });
  check(label + ': bubble shows greeting', bubble.show && bubble.text.length > 2, JSON.stringify(bubble));
  check(label + ': bubble inside the screen', bubble.l >= 0 && bubble.r <= bubble.w + 0.5 && bubble.t >= 0, JSON.stringify(bubble));
  await page.screenshot({ path: path.join(OUT, shotPrefix + '_2_greeting.png') });

  /* chat: a joke, a sum, and a memory */
  await page.fill('#msg', 'Joke naman');
  await page.press('#msg', 'Enter');
  check(label + ': user line logged', await waitLog(page, /^you\|Joke naman/, 3000));
  check(label + ': joke answered', await waitLog(page, /^leon\|.{8,}/, 8000));
  var before = (await logTexts(page)).length;
  await page.fill('#msg', '15% of 240');
  await page.click('#send');
  check(label + ': calculator answered 36', await waitLog(page, /^leon\|.*\b36\b/, 12000), JSON.stringify((await logTexts(page)).slice(before)));
  await page.fill('#msg', 'ako si Marco');
  await page.click('#send');
  await waitLog(page, /Marco/, 12000);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, shotPrefix + '_3_chat.png') });
  var chip = page.locator('.chip').first();
  check(label + ': quick-reply chips exist', await page.locator('.chip').count() >= 8);
  await chip.click();
  check(label + ': chip sends a message', await waitLog(page, /^you\|Kumusta/, 3000));

  /* poke him */
  await page.click('#leon');
  await page.waitForTimeout(600);
  check(label + ': poke animates (svg transform present)', await page.evaluate(function () { var r = document.querySelector('#leon [data-p="root"]'); return !!r && /translate/.test(r.getAttribute('transform') || ''); }));

  if (deep) {
    /* the mute button: confusion -> bargaining -> crying; then unmute asks permission */
    await page.waitForTimeout(3000);
    var n0 = (await logTexts(page)).length;
    await page.click('#btnMute');
    check(label + ': mute button pressed state', (await page.getAttribute('#btnMute', 'aria-pressed')) === 'true');
    check(label + ': mute drama starts', await waitLog(page, /^leon\|.*(Hello|walang sound|wala bang tunog|Naririnig|sound|tunog)/i, 25000), JSON.stringify((await logTexts(page)).slice(n0)));
    await page.screenshot({ path: path.join(OUT, shotPrefix + '_4_mute.png') });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: path.join(OUT, shotPrefix + '_4b_mute_later.png') });
    await page.click('#btnMute');
    check(label + ': unmuted state', (await page.getAttribute('#btnMute', 'aria-pressed')) === 'false');
    check(label + ': unmute asks permission', await waitLog(page, /^leon\|.*(Pwede na ba|magsalita)/i, 20000), JSON.stringify((await logTexts(page)).slice(-4)));
    await page.screenshot({ path: path.join(OUT, shotPrefix + '_5_unmute.png') });
  }

  /* history sheet + settings */
  await page.click('#btnTranscript');
  await page.waitForTimeout(450);
  check(label + ': history sheet opens', await page.evaluate(function () { return document.getElementById('transcript').classList.contains('open'); }));
  await page.screenshot({ path: path.join(OUT, shotPrefix + '_6_history.png') });
  await page.keyboard.press('Escape'); await page.waitForTimeout(450);
  await page.click('#btnSettings'); await page.waitForTimeout(450);
  check(label + ': settings sheet opens', await page.evaluate(function () { return document.getElementById('settings').classList.contains('open'); }));
  var info = await page.textContent('#voiceInfo');
  check(label + ': voice info text', /Now using/.test(info), info);
  check(label + ': memory info shows the name', /Marco/.test(await page.textContent('#memInfo')), await page.textContent('#memInfo'));
  await page.screenshot({ path: path.join(OUT, shotPrefix + '_7_settings.png') });
  await page.selectOption('#sEngine', 'off'); await page.waitForTimeout(100);
  check(label + ': engine switch reflected', /no sound/.test(await page.textContent('#voiceInfo')), await page.textContent('#voiceInfo'));
  await page.selectOption('#sEngine', 'leon');
  await page.selectOption('#sProf', 'off');
  var saved = await page.evaluate(function () { try { return JSON.parse(localStorage.getItem('leon:ui')); } catch (e) { return null; } });
  check(label + ': settings persisted', !!saved && saved.config && saved.config.profanity === 'off' && saved.voice && saved.voice.engine === 'leon', JSON.stringify(saved));
  await page.keyboard.press('Escape'); await page.waitForTimeout(450);
  var layout = await page.evaluate(function () { return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, sh: document.documentElement.scrollHeight, ih: window.innerHeight }; });
  check(label + ': no horizontal scroll', layout.sw <= layout.iw, JSON.stringify(layout));

  /* a reload keeps what he learned (stored on the device) */
  await page.reload(); await page.waitForSelector('#leon svg');
  var snap = await page.evaluate(function () { return Leon.app.snapshot().state.profile; });
  check(label + ': memory survives reload', snap && snap.name === 'Marco', JSON.stringify(snap));

  check(label + ': no console errors', errors.length === 0, errors.slice(0, 4).join(' | '));
  await ctx.close();
}

/* ------------------------------------------------------------------ other screen shapes */
async function runShapes(browser, url) {
  var shapes = [['desktop', 1280, 720, false], ['tablet', 820, 1180, true], ['landscape-phone', 780, 360, true], ['small-phone', 320, 568, true]];
  for (var i = 0; i < shapes.length; i++) {
    var sh = shapes[i], label = 'shape ' + sh[0];
    var ctx = await browser.newContext({ viewport: { width: sh[1], height: sh[2] }, deviceScaleFactor: 1, isMobile: sh[3], hasTouch: sh[3] });
    var page = await ctx.newPage(), errors = [];
    watch(page, label, errors);
    await page.goto(url + '?engine=off&nosw=1&autostart=1');
    await page.waitForSelector('#leon svg');
    await page.waitForTimeout(900);
    await page.fill('#msg', 'Sino ka?'); await page.press('#msg', 'Enter');
    await page.waitForTimeout(1500);
    var m = await page.evaluate(function () {
      function box(id) { var r = document.querySelector(id).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }
      return { iw: window.innerWidth, ih: window.innerHeight, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, leon: box('#leon'), bubble: box('#bubble'), form: box('#form') };
    });
    check(label + ': avatar fully visible', m.leon.l >= -0.5 && m.leon.r <= m.iw + 0.5 && m.leon.t >= -0.5 && m.leon.b <= m.ih + 0.5 && m.leon.h > 120, JSON.stringify(m.leon) + ' in ' + m.iw + 'x' + m.ih);
    check(label + ': composer visible', m.form.b <= m.ih + 0.5 && m.form.t >= 0, JSON.stringify(m.form));
    check(label + ': bubble inside the screen', m.bubble.l >= -0.5 && m.bubble.r <= m.iw + 0.5 && m.bubble.t >= -0.5, JSON.stringify(m.bubble));
    check(label + ': no sideways scroll', m.sw <= m.iw, m.sw + ' > ' + m.iw);
    check(label + ': page does not scroll vertically', m.sh <= m.ih + 1, m.sh + ' > ' + m.ih);
    await page.screenshot({ path: path.join(OUT, 'shape_' + sh[0] + '.png') });
    check(label + ': no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ overlay with a fake Android bridge */
async function runOverlay(browser, url, label) {
  var ctx = await browser.newContext({ viewport: { width: 170, height: 210 }, deviceScaleFactor: 2 });
  var page = await ctx.newPage(), errors = [];
  watch(page, label, errors);
  await page.addInitScript(function () {
    window.__native = { calls: [], speakIds: [] };
    window.LeonNative = {
      moveBy: function (x, y) { window.__native.calls.push(['moveBy', x, y]); },
      resize: function (w, h) { window.__native.calls.push(['resize', w, h]); },
      openApp: function () { window.__native.calls.push(['openApp']); },
      stopSpeaking: function () { window.__native.calls.push(['stop']); },
      speak: function (id, text, rate, pitch, vol, lang) {
        window.__native.calls.push(['speak', text, lang]); window.__native.speakIds.push(id);
        setTimeout(function () { Leon.Voice.nativeEvent('start', id); }, 20);
        setTimeout(function () { Leon.Voice.nativeEvent('done', id); }, 250 + text.length * 22);
      }
    };
  });
  await page.goto(url + (url.indexOf('?') > -1 ? '&' : '?') + 'boredom=off');
  await page.waitForSelector('#leon svg');
  await page.waitForTimeout(1200);
  var calls = function () { return page.evaluate(function () { return window.__native.calls.slice(); }); };
  check(label + ': native bridge used for speech after start', (await calls()).some(function (c) { return c[0] === 'speak'; }), JSON.stringify(await calls()));
  check(label + ': bubble expanded the window', (await calls()).some(function (c) { return c[0] === 'resize'; }));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(OUT, 'overlay_1.png') });
  var box = await page.locator('#leon').boundingBox();
  var cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  /* drag moves the window */
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 25, cy + 10, { steps: 4 }); await page.mouse.move(cx + 40, cy + 20, { steps: 4 }); await page.mouse.up();
  var moved = (await calls()).filter(function (c) { return c[0] === 'moveBy'; });
  check(label + ': drag calls moveBy', moved.length > 0, JSON.stringify(await calls()));
  check(label + ': drag did not open the app', !(await calls()).some(function (c) { return c[0] === 'openApp'; }));
  /* long press opens the full app */
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up();
  check(label + ': long press calls openApp', (await calls()).some(function (c) { return c[0] === 'openApp'; }));
  /* tap pokes */
  var spoke0 = (await calls()).filter(function (c) { return c[0] === 'speak'; }).length;
  await page.waitForTimeout(6000);
  var spoke1 = (await calls()).filter(function (c) { return c[0] === 'speak'; }).length;
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(1500);
  var spoke2 = (await calls()).filter(function (c) { return c[0] === 'speak'; }).length;
  check(label + ': tap makes him say something', spoke2 > spoke1 || spoke2 > spoke0, spoke0 + ',' + spoke1 + ',' + spoke2);
  var bg = await page.evaluate(function () { return getComputedStyle(document.body).backgroundColor; });
  check(label + ': page background is transparent', /rgba\(0, 0, 0, 0\)|transparent/.test(bg), bg);
  check(label + ': no console errors', errors.length === 0, errors.slice(0, 4).join(' | '));
  await ctx.close();
}

/* ------------------------------------------------------------------ the installable offline web app */
function serve(dir) {
  var types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  return new Promise(function (resolve) {
    var srv = http.createServer(function (req, res) {
      var p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      var f = path.join(dir, p);
      if (f.indexOf(dir) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nope'); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
    }).listen(0, '127.0.0.1', function () { resolve(srv); });
  });
}
async function runPwa(browser, dir) {
  var srv = await serve(dir), port = srv.address().port, base = 'http://127.0.0.1:' + port + '/';
  var ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'allow' });
  var page = await ctx.newPage(), errors = [];
  watch(page, 'pwa', errors);
  await page.goto(base + '?engine=off');
  await page.waitForSelector('#leon svg');
  var ready = await page.evaluate(async function () { var r = await navigator.serviceWorker.ready; return !!r.active; });
  check('pwa: service worker active', ready);
  await page.waitForTimeout(800);
  var cached = await page.evaluate(async function () { var keys = await caches.keys(); var out = {}; for (var i = 0; i < keys.length; i++) out[keys[i]] = (await (await caches.open(keys[i])).keys()).length; return out; });
  var wanted = fs.readdirSync(dir).length;
  check('pwa: app shell cached', Object.keys(cached).length === 1 && cached[Object.keys(cached)[0]] >= wanted, JSON.stringify(cached));
  await page.reload(); await page.waitForSelector('#leon svg');
  await ctx.setOffline(true);
  srv.close();                                                 /* really gone: offline flag + no server */
  await page.reload(); await page.waitForSelector('#leon svg', { timeout: 5000 });
  check('pwa: loads with the server gone (offline)', await page.locator('#wakeBtn').isVisible());
  await page.click('#wakeBtn'); await page.waitForTimeout(800);
  await page.fill('#msg', 'kumusta'); await page.press('#msg', 'Enter');
  check('pwa: chats offline', await waitLog(page, /^leon\|.{3,}/, 8000));
  var manifest = await page.evaluate(function () { var l = document.querySelector('link[rel=manifest]'); return l ? l.getAttribute('href') : null; });
  check('pwa: manifest linked', manifest === 'manifest.webmanifest', String(manifest));
  check('pwa: no console errors', errors.length === 0, errors.slice(0, 4).join(' | '));
  await ctx.close();
}

(async function () {
  var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'leon-build-'));
  var built = build({ dist: path.join(tmp, 'dist'), androidAssets: path.join(tmp, 'android-assets') });
  var browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    console.log('  demo (source files)');
    await runDemo(browser, 'file://' + path.join(ROOT, 'index.html') + '?engine=leon&nosw=1', 'demo', 'demo', true);
    console.log('  demo (one-file build)');
    await runDemo(browser, 'file://' + path.join(built.dist, 'leon-demo.html') + '?engine=leon&nosw=1', 'single', 'single', false);
    console.log('  demo (android assets, as a WebView would load it)');
    await runDemo(browser, 'file://' + path.join(built.androidAssets, 'index.html') + '?engine=leon', 'android', 'android', false);
    console.log('  screen shapes');
    await runShapes(browser, 'file://' + path.join(ROOT, 'index.html'));
    console.log('  overlay (source) with a fake Android bridge');
    await runOverlay(browser, 'file://' + path.join(ROOT, 'overlay.html'), 'overlay');
    console.log('  overlay (one-file build)');
    await runOverlay(browser, 'file://' + path.join(built.dist, 'leon-overlay.html'), 'overlay-single');
    console.log('  installable offline web app');
    await runPwa(browser, path.join(built.dist, 'web'));
  } catch (e) { bad.push('test crashed: ' + (e && e.stack || e)); console.log('  x crashed: ' + (e && e.stack || e)); }
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('  browser app checks: ' + good + ' passed, ' + bad.length + ' failed   (screenshots: ' + OUT + ')');
  process.exit(bad.length ? 1 : 0);
})();
