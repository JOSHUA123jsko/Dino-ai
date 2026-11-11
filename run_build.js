'use strict';
/* The build and the load order: every place that lists Leon's scripts agrees, the bundle runs, and the output pages reference files that exist. */
var fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm');
var H = require('./helpers.js'), ok = H.ok, eq = H.eq;
var F = require('../tools/files.js'), build = require('../tools/build.js');
var ROOT = path.join(__dirname, '..');

function scriptTags(html) {
  var m = html.match(/<!-- LEON:SCRIPTS -->([\s\S]*?)<!-- \/LEON:SCRIPTS -->/);
  if (!m) return null;
  var out = [], re = /<script src="([^"]+)"><\/script>/g, x;
  while ((x = re.exec(m[1]))) out.push(x[1]);
  return out;
}

H.section('script order is the same everywhere');
(function () {
  var idx = scriptTags(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), ov = scriptTags(fs.readFileSync(path.join(ROOT, 'overlay.html'), 'utf8'));
  eq(JSON.stringify(idx), JSON.stringify(F.ALL), 'index.html lists exactly tools/files.js ALL, in order');
  eq(JSON.stringify(ov), JSON.stringify(F.ALL), 'overlay.html lists exactly tools/files.js ALL, in order');
  ok(F.ALL.every(function (f) { return fs.existsSync(path.join(ROOT, f)); }), 'every listed script exists');
  /* nothing in src/ is forgotten */
  var onDisk = [];
  ['engine', 'data', 'avatar', 'voice', 'ui'].forEach(function (d) { fs.readdirSync(path.join(ROOT, 'src', d)).forEach(function (f) { if (/\.js$/.test(f)) onDisk.push('src/' + d + '/' + f); }); });
  var known = F.ALL.concat([F.APP, F.OVERLAY]), forgotten = onDisk.filter(function (f) { return known.indexOf(f) < 0; });
  ok(forgotten.length === 0, 'every file in src/ is listed (or is app/overlay)', forgotten.join(', '));
  ok(/<script src="src\/ui\/app\.js"><\/script>/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), 'index.html loads app.js after the bundle');
  ok(/<script src="src\/ui\/overlay\.js"><\/script>/.test(fs.readFileSync(path.join(ROOT, 'overlay.html'), 'utf8')), 'overlay.html loads overlay.js after the bundle');
})();

H.section('build output');
(function () {
  var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'leon-rb-'));
  var r = build({ dist: path.join(tmp, 'dist'), androidAssets: path.join(tmp, 'assets') });
  ['leon.js', 'leon-demo.html', 'leon-overlay.html', 'web/index.html', 'web/overlay.html', 'web/leon.js', 'web/app.js', 'web/overlay.js', 'web/styles.css', 'web/manifest.webmanifest', 'web/sw.js', 'web/icons/icon.svg', 'web/icons/icon-192.png', 'web/icons/icon-512.png'].forEach(function (f) {
    ok(fs.existsSync(path.join(r.dist, f)), 'dist has ' + f);
  });
  ['index.html', 'overlay.html', 'leon.js', 'app.js', 'overlay.js', 'styles.css'].forEach(function (f) { ok(fs.existsSync(path.join(tmp, 'assets', f)), 'android assets have ' + f); });

  /* every relative src/href in the web pages points at a file that exists */
  ['index.html', 'overlay.html'].forEach(function (page) {
    var html = fs.readFileSync(path.join(r.dist, 'web', page), 'utf8'), re = /(?:src|href)="([^"#?]+)"/g, x, bad = [];
    while ((x = re.exec(html))) if (!/^(https?:|data:)/.test(x[1]) && !fs.existsSync(path.join(r.dist, 'web', x[1]))) bad.push(x[1]);
    ok(bad.length === 0, 'dist/web/' + page + ' references only files that exist', bad.join(', '));
    ok(!/src\/ui\/|LEON:SCRIPTS/.test(html.replace(/<!--.*?-->/g, '')) || /src="app\.js"|src="overlay\.js"/.test(html), page + ' has no source paths left');
  });
  ['leon-demo.html', 'leon-overlay.html'].forEach(function (page) {
    var html = fs.readFileSync(path.join(r.dist, page), 'utf8');
    ok(!/<script src=/.test(html) && !/<link rel="stylesheet"/.test(html), page + ' is self-contained (no external script/css)');
    ok(!/https?:\/\/(?!www\.w3\.org)[a-z0-9.-]+\.[a-z]{2,}/i.test(html.replace(/Sources:.*$/m, '')), page + ' contains no web URLs it could fetch', (html.match(/https?:\/\/(?!www\.w3\.org)[^\s"')]+/i) || [''])[0]);
  });

  /* the service worker's precache list names real files */
  var sw = fs.readFileSync(path.join(r.dist, 'web', 'sw.js'), 'utf8'), list = JSON.parse(sw.match(/\/\*PRECACHE\*\/([\s\S]*?)\/\*END\*\//)[1]);
  ok(list.length > 8 && list.every(function (f) { return f === './' || fs.existsSync(path.join(r.dist, 'web', f)); }), 'service worker precaches existing files only', list.join(','));
  ok(list.indexOf('leon.js') > -1 && list.indexOf('index.html') > -1 && list.indexOf('app.js') > -1, 'service worker precaches the app shell');

  /* the bundle loads in a bare sandbox and exposes the public API (no DOM needed to load) */
  var sb = { console: console, Date: Date, Math: Math, JSON: JSON }; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(r.bundle, sb, { filename: 'dist/leon.js' });
  var L = sb.Leon;
  eq(L.VERSION, JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version, 'bundle version matches package.json');
  ['Brain', 'NLU', 'Calc', 'Safety', 'Avatar', 'Motion', 'G2P', 'LeonSynth', 'Lipsync', 'Sfx', 'Voice', 'Stage', 'Companion'].forEach(function (n) { ok(!!L[n], 'Leon.' + n + ' exists in the bundle'); });
  ok(typeof L.Avatar.create === 'function' && typeof L.Avatar.render === 'function', 'Avatar.create / render exist');
  var b = new L.Brain({ storage: { get: function () { return null; }, set: function () {}, remove: function () {} } });
  var start = b.start();
  ok(start && start.beats && start.beats.length > 0, 'bundled brain answers');
  ok(/class="leon-svg|<svg/.test(L.Avatar.render({ expr: 'happy' })), 'bundled avatar renders SVG');
  fs.rmSync(tmp, { recursive: true, force: true });
})();

process.exit(H.summary() ? 1 : 0);
