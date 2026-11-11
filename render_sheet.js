#!/usr/bin/env node
/* Renders every expression to SVG (and, if rsvg-convert + ImageMagick exist, a PNG contact sheet).
 *   node tools/render_sheet.js [outDir]        -> outDir/svg/<name>.svg, outDir/contact-sheet.png */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
var ROOT = path.join(__dirname, '..');
var FILES = ['src/engine/util.js', 'src/avatar/parts.js', 'src/avatar/face.js', 'src/avatar/props.js', 'src/avatar/expressions.js', 'src/avatar/avatar.js'];
var ctx = { console: console, Math: Math, JSON: JSON }; ctx.globalThis = ctx; vm.createContext(ctx);
FILES.forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); });
var A = ctx.Leon.Avatar;
var out = path.resolve(process.argv[2] || path.join(ROOT, 'dist', 'sheet'));
fs.mkdirSync(path.join(out, 'svg'), { recursive: true });
var names = A.NAMES;
names.forEach(function (n) { fs.writeFileSync(path.join(out, 'svg', n + '.svg'), A.render({ expr: n }, { background: '#c9f7e4' })); });
console.log('wrote ' + names.length + ' SVGs to ' + path.join(out, 'svg'));
function has(cmd) { try { cp.execSync('command -v ' + cmd, { stdio: 'ignore' }); return true; } catch (e) { return false; } }
if (has('rsvg-convert') && (has('montage') || has('convert'))) {
  fs.mkdirSync(path.join(out, 'png'), { recursive: true });
  names.forEach(function (n) { cp.execSync('rsvg-convert -w 300 "' + path.join(out, 'svg', n + '.svg') + '" -o "' + path.join(out, 'png', n + '.png') + '"'); });
  var list = names.map(function (n) { return '"' + path.join(out, 'png', n + '.png') + '"'; }).join(' ');
  var tool = has('montage') ? 'montage' : 'convert';
  var cmd = tool === 'montage' ? 'montage ' + list + ' -tile 7x -geometry +4+4 -background "#c9f7e4" "' + path.join(out, 'contact-sheet.png') + '"' : 'convert ' + list + ' +append "' + path.join(out, 'contact-sheet.png') + '"';
  cp.execSync(cmd); console.log('contact sheet: ' + path.join(out, 'contact-sheet.png'));
} else console.log('(rsvg-convert / ImageMagick not found: skipped PNG sheet)');
