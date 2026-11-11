/* Leon Offline — parts.js
 * Pure drawing functions: every piece of Leon as an SVG string (no DOM needed, so tests and the sheet
 * renderer can use them in Node). Coordinates live in a 400 x 460 box. Face centre is (200, 215). */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var A = L.Avatar = L.Avatar || {};

  var C = A.colors = {
    navy: '#1c2760', mint: '#46dca9', mintDark: '#27bd8d', mintLight: '#9bf5d6', cream: '#fdf0b8', creamDark: '#f1d98d',
    cheek: '#ff8fa8', eye: '#1b1346', iris: '#6c50e3', mouthIn: '#e8546f', tongue: '#ff97ab', white: '#ffffff',
    heart: '#ff5c86', heartDark: '#e03a66', gold: '#ffd84a', goldDark: '#e8a91c', blue: '#4aa8ff', blueDark: '#2d6fd6',
    red: '#ff3d4a', shadow: '#2a6f5a'
  };
  var SW = 5; /* main outline width */

  function f(n) { return Math.round(n * 100) / 100; }
  function attrs(o) { var s = ''; for (var k in o) if (o[k] !== undefined && o[k] !== null) s += ' ' + k + '="' + o[k] + '"'; return s; }
  function path(d, fill, stroke, sw, extra) { return '<path d="' + d + '" fill="' + (fill || 'none') + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || SW) + '" stroke-linecap="round" stroke-linejoin="round"' : '') + attrs(extra) + '/>'; }
  function circ(cx, cy, r, fill, stroke, sw, extra) { return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + (fill || 'none') + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || SW) + '"' : '') + attrs(extra) + '/>'; }
  function ell(cx, cy, rx, ry, fill, stroke, sw, extra) { return '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(rx) + '" ry="' + f(ry) + '" fill="' + (fill || 'none') + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || SW) + '"' : '') + attrs(extra) + '/>'; }
  function g(inner, tf, extra) { return '<g' + (tf ? ' transform="' + tf + '"' : '') + attrs(extra) + '>' + inner + '</g>'; }
  function line(x1, y1, x2, y2, stroke, sw, extra) { return '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round"' + attrs(extra) + '/>'; }
  A._s = { f: f, path: path, circ: circ, ell: ell, g: g, line: line, attrs: attrs };

  /* ---------- small shapes ---------- */
  function heartPath(s) { /* heart centred at 0,0 roughly 2s wide */
    return 'M 0 ' + f(s * 0.9) + ' C ' + f(-s * 1.7) + ' ' + f(-s * 0.2) + ' ' + f(-s * 0.9) + ' ' + f(-s * 1.35) + ' 0 ' + f(-s * 0.55) + ' C ' + f(s * 0.9) + ' ' + f(-s * 1.35) + ' ' + f(s * 1.7) + ' ' + f(-s * 0.2) + ' 0 ' + f(s * 0.9) + ' Z';
  }
  function heart(x, y, s, rot, fill, op) {
    return g(path(heartPath(s), fill || C.heart, C.navy, Math.max(2, s * 0.16)) + path('M ' + f(-s * 0.7) + ' ' + f(-s * 0.55) + ' Q ' + f(-s * 0.9) + ' ' + f(-s * 0.2) + ' ' + f(-s * 0.55) + ' ' + f(s * 0.05), 'none', 'rgba(255,255,255,.85)', Math.max(1.5, s * 0.14)),
      'translate(' + f(x) + ',' + f(y) + ') rotate(' + (rot || 0) + ')', op ? { opacity: op } : null);
  }
  function starPath(r, ri, n) {
    var d = '';
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? ri : r; d += (i ? 'L' : 'M') + f(Math.cos(a) * rr) + ' ' + f(Math.sin(a) * rr) + ' '; }
    return d + 'Z';
  }
  function sparkle(x, y, s, fill) { /* 4-point twinkle */
    return g(path('M 0 ' + f(-s) + ' Q ' + f(s * 0.18) + ' ' + f(-s * 0.18) + ' ' + f(s) + ' 0 Q ' + f(s * 0.18) + ' ' + f(s * 0.18) + ' 0 ' + f(s) + ' Q ' + f(-s * 0.18) + ' ' + f(s * 0.18) + ' ' + f(-s) + ' 0 Q ' + f(-s * 0.18) + ' ' + f(-s * 0.18) + ' 0 ' + f(-s) + ' Z', fill || C.gold, '#e8a91c', 1.5), 'translate(' + f(x) + ',' + f(y) + ')');
  }
  function star(x, y, s, rot, fill) { return g(path(starPath(s, s * 0.45, 5), fill || C.gold, C.navy, Math.max(2, s * 0.14)), 'translate(' + f(x) + ',' + f(y) + ') rotate(' + (rot || 0) + ')'); }
  A._s.heart = heart; A._s.star = star; A._s.sparkle = sparkle;

  /* ---------- spikes (cream, outlined) generated around an ellipse ---------- */
  function spikesOnEllipse(cx, cy, rx, ry, angles, size, halfW) {
    var out = '';
    angles.forEach(function (aDeg, i) {
      var a = aDeg * Math.PI / 180, px = cx + rx * Math.cos(a), py = cy + ry * Math.sin(a);
      var nx = Math.cos(a) / rx, ny = Math.sin(a) / ry, nl = Math.sqrt(nx * nx + ny * ny); nx /= nl; ny /= nl;
      var tx = -ny, ty = nx, sz = size * (1 - i * 0.04);
      var bx1 = px + tx * halfW - nx * 8, by1 = py + ty * halfW - ny * 8, bx2 = px - tx * halfW - nx * 8, by2 = py - ty * halfW - ny * 8;
      var tipx = px + nx * sz, tipy = py + ny * sz;
      out += path('M ' + f(bx1) + ' ' + f(by1) + ' Q ' + f((bx1 + tipx) / 2 + tx * 2) + ' ' + f((by1 + tipy) / 2 + ty * 2) + ' ' + f(tipx) + ' ' + f(tipy) + ' Q ' + f((bx2 + tipx) / 2 - tx * 2) + ' ' + f((by2 + tipy) / 2 - ty * 2) + ' ' + f(bx2) + ' ' + f(by2) + ' Z', C.cream, C.navy, 4.5);
    });
    return out;
  }

  /* ---------- head, body, tail, feet ---------- */
  var HEAD = 'M 78 208 C 72 128, 132 78, 202 78 C 280 78, 330 132, 322 208 C 318 264, 268 298, 200 298 C 132 298, 84 264, 78 208 Z';
  A.HEAD_PATH = HEAD;

  A.drawHead = function () {
    var sp = spikesOnEllipse(200, 190, 122, 110, [-84, -60, -36, -12, 12], 30, 15);
    return sp + path(HEAD, C.mint, C.navy, SW + 0.5) +
      path('M 92 232 C 110 282, 160 292, 200 292', 'none', C.mintDark, 6, { opacity: 0.55 }) +
      ell(138, 122, 36, 13, 'rgba(255,255,255,.5)', null, 0, { transform: 'rotate(-28 138 122)' }) +
      ell(176, 100, 9, 4, 'rgba(255,255,255,.55)', null, 0, { transform: 'rotate(-12 176 100)' });
  };

  A.drawTail = function () {
    var spikes = [[300, 318, 12], [326, 322, 12], [350, 330, 11]].map(function (p) {
      return path('M ' + (p[0] - p[2]) + ' ' + (p[1] + 4) + ' L ' + (p[0] + 2) + ' ' + (p[1] - 26) + ' L ' + (p[0] + p[2]) + ' ' + (p[1] + 2) + ' Z', C.cream, C.navy, 4);
    }).join('');
    return spikes +
      path('M 258 368 C 300 372, 346 362, 384 322 C 380 360, 340 404, 262 404 Z', C.mint, C.navy, SW) +
      path('M 276 396 C 322 392, 352 376, 372 346 C 368 372, 330 400, 276 402 Z', C.cream, null, 0, { opacity: 0.95 });
  };

  A.drawBody = function () {
    return path('M 132 292 C 112 350, 138 412, 200 412 C 262 412, 288 350, 268 292 Z', C.mint, C.navy, SW) +
      path('M 262 322 C 276 354, 262 398, 226 408', 'none', C.mintDark, 8, { opacity: 0.45 }) +
      ell(200, 352, 50, 54, C.cream, null, 0) +
      path('M 168 322 Q 200 336 232 322', 'none', C.creamDark, 3, { opacity: 0.6 }) +
      path('M 166 352 Q 200 366 234 352', 'none', C.creamDark, 3, { opacity: 0.5 }) +
      path('M 172 382 Q 200 394 228 382', 'none', C.creamDark, 3, { opacity: 0.5 });
  };

  A.drawFoot = function (cx) {
    return ell(cx, 414, 33, 20, C.mint, C.navy, SW) + line(cx - 10, 400, cx - 10, 410, C.navy, 3) + line(cx + 2, 399, cx + 2, 410, C.navy, 3) + line(cx + 14, 400, cx + 14, 410, C.navy, 3) +
      ell(cx - 12, 421, 5, 3.4, C.cream, null, 0) + ell(cx + 1, 423, 5, 3.4, C.cream, null, 0) + ell(cx + 14, 421, 5, 3.4, C.cream, null, 0);
  };
  A.drawFeet = function () { return A.drawFoot(152) + A.drawFoot(248); };

  A.drawShadow = function (sx) {
    return ell(200, 438, 118 * (sx || 1), 15 * (sx || 1), C.shadow, null, 0, { opacity: 0.22 });
  };

  /* ---------- arms: a thick curved capsule from shoulder to hand ---------- */
  A.SHOULDER = { L: [140, 308], R: [260, 308] };
  /* spec: {h:[x,y] hand, e:[x,y] elbow control, mitt:'fist'|'open'|'point'|'thumb'|'none', r:hand radius} */
  A.drawArm = function (side, spec) {
    var s = A.SHOULDER[side], h = spec.h, e = spec.e || [(s[0] + h[0]) / 2, (s[1] + h[1]) / 2 + 12];
    var d = 'M ' + s[0] + ' ' + s[1] + ' Q ' + f(e[0]) + ' ' + f(e[1]) + ' ' + f(h[0]) + ' ' + f(h[1]);
    var r = spec.r || 17, out = path(d, 'none', C.navy, 40) + path(d, 'none', C.mint, 30) + path(d, 'none', C.mintLight, 6, { opacity: 0.35, transform: 'translate(-3,-3)' });
    var mitt = spec.mitt || 'open';
    if (mitt !== 'none') {
      out += circ(h[0], h[1], r, C.mint, C.navy, 4.5);
      if (mitt === 'open') out += line(h[0] - 5, h[1] + r * 0.2, h[0] - 5, h[1] + r * 0.75, C.navy, 2.5) + line(h[0] + 5, h[1] + r * 0.2, h[0] + 5, h[1] + r * 0.75, C.navy, 2.5);
      if (mitt === 'fist') out += path('M ' + f(h[0] - 8) + ' ' + f(h[1] - 3) + ' Q ' + f(h[0]) + ' ' + f(h[1] + 5) + ' ' + f(h[0] + 8) + ' ' + f(h[1] - 3), 'none', C.navy, 2.5);
      if (mitt === 'point') out += path('M ' + f(h[0] - 7) + ' ' + f(h[1] - 8) + ' L ' + f(h[0] - 4) + ' ' + f(h[1] - 36) + ' Q ' + f(h[0] + 6) + ' ' + f(h[1] - 40) + ' ' + f(h[0] + 8) + ' ' + f(h[1] - 28) + ' L ' + f(h[0] + 8) + ' ' + f(h[1] - 6) + ' Z', C.mint, C.navy, 4.5);
      if (mitt === 'thumb') out += path('M ' + f(h[0] - 11) + ' ' + f(h[1] - 8) + ' L ' + f(h[0] - 12) + ' ' + f(h[1] - 36) + ' Q ' + f(h[0] + 2) + ' ' + f(h[1] - 44) + ' ' + f(h[0] + 6) + ' ' + f(h[1] - 28) + ' L ' + f(h[0] + 6) + ' ' + f(h[1] - 6) + ' Z', C.mint, C.navy, 4.5);
    }
    return out;
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
