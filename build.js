#!/usr/bin/env node
/* Leon Offline — build. Packs the source into the files you drop into your app. No dependencies, no network.
 *   node tools/build.js                 -> dist/ and android/app/src/main/assets/leon/
 *   node tools/build.js --no-android    -> dist/ only
 *
 * Outputs
 *   dist/leon.js                  everything (brain + avatar + voice + UI facade) in one plain <script>. The only file a custom app needs.
 *   dist/leon-demo.html           the full demo app in ONE html file (open it by double-click, works with no server and no network)
 *   dist/leon-overlay.html        the floating-dino page in ONE html file (for a WebView / small window)
 *   dist/web/                     installable offline web app (PWA): index.html, overlay.html, leon.js, app.js, styles.css, manifest, sw.js, icons/
 *   android/app/src/main/assets/leon/   the same pages for the Android template (WebView), without the service worker */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var F = require('./files.js');
var ROOT = path.join(__dirname, '..');

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/^﻿/, ''); }
function write(file, data) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); }
function copy(rel, outRoot) { var to = path.join(outRoot, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(ROOT, rel), to); }
function listFiles(dir, base) {
  var out = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
    var p = path.join(dir, d.name), rel = base ? base + '/' + d.name : d.name;
    if (d.isDirectory()) out = out.concat(listFiles(p, rel)); else out.push(rel);
  });
  return out.sort();
}

var MARK = /<!-- LEON:SCRIPTS -->[\s\S]*?<!-- \/LEON:SCRIPTS -->/;
function swapScripts(html, replacement, what) {
  if (!MARK.test(html)) throw new Error(what + ': LEON:SCRIPTS markers not found');
  return html.replace(MARK, function () { return replacement; });          /* function form: no $-pattern surprises */
}
function mustReplace(html, from, to, what) {
  if (html.indexOf(from) < 0) throw new Error(what + ': expected to find ' + from);
  return html.split(from).join(to);
}
/* Code that goes inside <script>...</script> must not contain sequences the HTML parser treats specially. */
function inlineSafe(code, what) {
  if (/<!--|<script|<\/script/i.test(code)) throw new Error(what + ' contains "<!--", "<script" or "</script": rewrite that string so it can be inlined in HTML');
  return code;
}

function build(opts) {
  opts = opts || {};
  var dist = opts.dist || path.join(ROOT, 'dist');
  var androidAssets = opts.androidAssets === undefined ? path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'leon') : opts.androidAssets;
  var pkg = JSON.parse(read('package.json')), version = pkg.version;
  var banner = '/*! Leon Offline v' + version + ' - offline talking-dino companion (brain + avatar + voice). Plain ES5, no dependencies, never touches the network. */\n';

  /* ---- 1. the bundle ---- */
  var parts = F.ALL.map(function (f) { return '\n/* ===== ' + f + ' ===== */\n' + read(f).replace(/\s+$/, '') + '\n;\n'; });
  var bundle = banner + parts.join('');
  var app = read(F.APP), overlay = read(F.OVERLAY);

  fs.rmSync(dist, { recursive: true, force: true });
  write(path.join(dist, 'leon.js'), bundle);

  /* ---- 2. web (PWA) folder ---- */
  var web = path.join(dist, 'web');
  var tag = '<script src="leon.js"></script>';
  var indexWeb = mustReplace(swapScripts(read('index.html'), tag, 'index.html'), 'src="src/ui/app.js"', 'src="app.js"', 'index.html');
  var overlayWeb = mustReplace(swapScripts(read('overlay.html'), tag, 'overlay.html'), 'src="src/ui/overlay.js"', 'src="overlay.js"', 'overlay.html');
  write(path.join(web, 'index.html'), indexWeb);
  write(path.join(web, 'overlay.html'), overlayWeb);
  write(path.join(web, 'leon.js'), bundle);
  write(path.join(web, 'app.js'), app);
  write(path.join(web, 'overlay.js'), overlay);
  ['styles.css', 'manifest.webmanifest'].forEach(function (f) { copy(f, web); });
  listFiles(path.join(ROOT, 'icons')).forEach(function (f) { copy('icons/' + f, web); });
  if (fs.existsSync(path.join(ROOT, 'assets', 'sprites'))) listFiles(path.join(ROOT, 'assets', 'sprites')).forEach(function (f) { copy('assets/sprites/' + f, web); });
  var precache = listFiles(web).filter(function (f) { return f !== 'sw.js'; });
  precache.unshift('./');
  var sw = read('sw.js').replace(/\/\*PRECACHE\*\/[\s\S]*?\/\*END\*\//, function () { return '/*PRECACHE*/' + JSON.stringify(precache) + '/*END*/'; }).replace(/var VERSION = '[^']*';/, "var VERSION = 'leon-" + version + "';");
  if (sw.indexOf('/*PRECACHE*/' + JSON.stringify(precache)) < 0) throw new Error('sw.js: PRECACHE markers not found');
  write(path.join(web, 'sw.js'), sw);

  /* ---- 3. single-file pages ---- */
  var css = read('styles.css');
  var favicon = 'data:image/svg+xml,' + encodeURIComponent(fs.readFileSync(path.join(ROOT, 'icons', 'icon.svg'), 'utf8').replace(/\s*\n\s*/g, ''));
  function single(html, appCode, what) {
    if (html.indexOf('<link rel="stylesheet" href="styles.css">') > -1) html = mustReplace(html, '<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '</style>', what);
    html = html.replace(/<link rel="manifest"[^>]*>\s*/, '').replace(/<link rel="apple-touch-icon"[^>]*>\s*/, '');
    html = html.replace(/<link rel="icon"[^>]*>/, function () { return '<link rel="icon" href="' + favicon + '" type="image/svg+xml">'; });
    html = swapScripts(html, '<script>\n' + inlineSafe(bundle, 'leon.js') + '</script>', what);
    var m = html.match(/<script src="src\/ui\/[a-z]+\.js"><\/script>/);
    if (!m) throw new Error(what + ': app script tag not found');
    return html.replace(m[0], function () { return '<script>\n' + inlineSafe(appCode, what + ' script') + '</script>'; });
  }
  write(path.join(dist, 'leon-demo.html'), single(read('index.html'), app, 'index.html'));
  write(path.join(dist, 'leon-overlay.html'), single(read('overlay.html'), overlay, 'overlay.html'));

  /* ---- 4. Android assets (WebView) ---- */
  if (androidAssets) {
    fs.rmSync(androidAssets, { recursive: true, force: true });
    write(path.join(androidAssets, 'index.html'), indexWeb.replace(/<link rel="manifest"[^>]*>\s*/, ''));
    write(path.join(androidAssets, 'overlay.html'), overlayWeb);
    write(path.join(androidAssets, 'leon.js'), bundle);
    write(path.join(androidAssets, 'app.js'), app);
    write(path.join(androidAssets, 'overlay.js'), overlay);
    copy('styles.css', androidAssets);
    ['icons/icon.svg', 'icons/icon-192.png'].forEach(function (f) { copy(f, androidAssets); });
    if (fs.existsSync(path.join(ROOT, 'assets', 'sprites'))) listFiles(path.join(ROOT, 'assets', 'sprites')).forEach(function (f) { copy('assets/sprites/' + f, androidAssets); });
  }

  var result = { dist: dist, androidAssets: androidAssets, version: version, bundle: bundle, bytes: {}, files: listFiles(dist) };
  ['leon.js', 'leon-demo.html', 'leon-overlay.html'].forEach(function (f) { result.bytes[f] = fs.statSync(path.join(dist, f)).size; });
  return result;
}

module.exports = build;

if (require.main === module) {
  var r = build({ androidAssets: process.argv.indexOf('--no-android') > -1 ? null : undefined });
  /* sanity: the bundle must at least parse and define the public API */
  new vm.Script(r.bundle, { filename: 'dist/leon.js' });
  console.log('Leon Offline v' + r.version + ' built into ' + r.dist);
  Object.keys(r.bytes).forEach(function (f) { console.log('  ' + f + '  ' + (r.bytes[f] / 1024).toFixed(0) + ' KB'); });
  console.log('  web/ (' + r.files.filter(function (f) { return f.indexOf('web/') === 0; }).length + ' files)' + (r.androidAssets ? '   android assets: ' + path.relative(ROOT, r.androidAssets) : ''));
}
