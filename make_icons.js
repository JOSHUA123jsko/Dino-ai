#!/usr/bin/env node
/* Draws Leon's face as app icons. Needs rsvg-convert for the PNGs (the SVG is written either way).
 *   node tools/make_icons.js [--android]      -> icons/*.svg|png   (+ android/app/src/main/res/mipmap-* with --android) */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
var ROOT = path.join(__dirname, '..');
var FILES = ['src/engine/util.js', 'src/avatar/parts.js', 'src/avatar/face.js', 'src/avatar/props.js', 'src/avatar/expressions.js', 'src/avatar/avatar.js'];
var ctx = { console: console, Math: Math, JSON: JSON }; ctx.globalThis = ctx; vm.createContext(ctx);
FILES.forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); });
var A = ctx.Leon.Avatar;
A.EXPRESSIONS.happy.fx = [];                                   /* no sparkle lines in an icon */
var BG = '#c9f7e4';

/* crop = [x, y, size] in avatar units (the avatar is drawn in 400x460); round = corner radius as a fraction of the size */
function iconSvg(crop, round, bg, transparentBg) {
  var inner = A.render({ expr: 'happy', pose: 'down' }, {});
  inner = inner.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  var x = crop[0], y = crop[1], s = crop[2], r = Math.round(s * round);
  var clip = r ? '<clipPath id="ic"><rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" rx="' + r + '"/></clipPath>' : '';
  var bgRect = transparentBg ? '' : '<rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" fill="' + bg + '"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + x + ' ' + y + ' ' + s + ' ' + s + '" width="512" height="512">' + clip +
    '<g' + (r ? ' clip-path="url(#ic)"' : '') + '>' + bgRect + inner + '</g></svg>';
}
function has(cmd) { try { cp.execSync('command -v ' + cmd, { stdio: 'ignore' }); return true; } catch (e) { return false; } }
function png(svgPath, px, out) { fs.mkdirSync(path.dirname(out), { recursive: true }); cp.execSync('rsvg-convert -w ' + px + ' -h ' + px + ' "' + svgPath + '" -o "' + out + '"'); }

var ANY = [50, 35, 300], FULL = [10, 0, 380];                  /* FULL keeps the head inside the 80% safe circle that Android masks to */
var outDir = path.join(ROOT, 'icons');
fs.mkdirSync(outDir, { recursive: true });
var anySvg = path.join(outDir, 'icon.svg'), fullSvg = path.join(outDir, 'icon-full.svg');
fs.writeFileSync(anySvg, iconSvg(ANY, 0.22, BG));
fs.writeFileSync(fullSvg, iconSvg(FULL, 0, BG));
console.log('wrote ' + anySvg);
if (!has('rsvg-convert')) { console.log('(rsvg-convert not found: PNG icons skipped)'); process.exit(0); }
png(anySvg, 192, path.join(outDir, 'icon-192.png'));
png(anySvg, 512, path.join(outDir, 'icon-512.png'));
png(fullSvg, 512, path.join(outDir, 'icon-maskable-512.png'));
png(fullSvg, 180, path.join(outDir, 'apple-touch-icon.png'));
fs.unlinkSync(fullSvg);
console.log('wrote icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png');

if (process.argv.indexOf('--android') > -1) {
  var res = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
  var legacy = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }, adaptive = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
  var fg = path.join(outDir, '_fg.svg'), sq = path.join(outDir, '_sq.svg');
  /* adaptive foreground: the head sits inside the middle 66% of a transparent 108dp canvas */
  fs.writeFileSync(fg, iconSvg([-20, -35, 460], 0, BG, true));
  fs.writeFileSync(sq, iconSvg(ANY, 0.18, BG));
  Object.keys(legacy).forEach(function (d) {
    png(sq, legacy[d], path.join(res, 'mipmap-' + d, 'ic_launcher.png'));
    png(sq, legacy[d], path.join(res, 'mipmap-' + d, 'ic_launcher_round.png'));
    png(fg, adaptive[d], path.join(res, 'mipmap-' + d, 'ic_launcher_foreground.png'));
  });
  fs.unlinkSync(fg); fs.unlinkSync(sq);
  console.log('wrote Android launcher icons under ' + res);
}
