/* Leon Offline — face.js
 * Eyes, brows, cheeks and mouths as SVG strings. The mouth is drawn separately from the rest of the
 * face so lip-sync can swap it many times per second without redrawing anything else. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var A = L.Avatar = L.Avatar || {};
  var C = A.colors, S = A._s, f = S.f, path = S.path, circ = S.circ, ell = S.ell, line = S.line, g = S.g;

  var EL = [152, 208], ER = [248, 208];
  A.EYES = { L: EL, R: ER };
  A.MOUTH_AT = [200, 256];

  /* ---------------- eyes ---------------- */
  function eyeBase(cx, cy, o) {
    o = o || {};
    var s = o.s || 1, bl = o.blink || 0, lx = (o.look && o.look[0]) || 0, ly = (o.look && o.look[1]) || 0;
    var rx = 15 * s, ry = 19 * s * (1 - bl * 0.9);
    var x = cx + lx, y = cy + ly + (19 * s - ry) * 0.2;
    var out = ell(x, y, rx, ry, C.eye);
    out += ell(x, y + ry * 0.36, rx * 0.78, ry * 0.52, C.iris, null, 0, { opacity: 0.8 });
    if (bl < 0.6) {
      out += circ(x - 5.2 * s, y - 7 * s * (1 - bl), 6.2 * s, C.white, null, 0);
      out += circ(x + 5.5 * s, y + 8 * s * (1 - bl), 2.9 * s, C.white, null, 0, { opacity: 0.95 });
      if (o.glossy) { out += circ(x + 7 * s, y - 8 * s, 2.6 * s, C.white, null, 0, { opacity: 0.9 }) + ell(x, y + ry * 0.78, rx * 0.6, 3.2 * s, '#a9dcff', null, 0, { opacity: 0.85 }); }
    }
    return out;
  }
  function closedArc(cx, cy, w) { w = w || 14; return path('M ' + f(cx - w) + ' ' + f(cy + 1) + ' Q ' + f(cx) + ' ' + f(cy + 10) + ' ' + f(cx + w) + ' ' + f(cy + 1), 'none', C.navy, 5); }
  function happyArc(cx, cy) { return path('M ' + f(cx - 15) + ' ' + f(cy + 7) + ' Q ' + f(cx) + ' ' + f(cy - 13) + ' ' + f(cx + 15) + ' ' + f(cy + 7), 'none', C.navy, 5.5); }
  function chevron(cx, cy, side) { /* > for the left eye, < for the right */
    var d = side < 0 ? 'M ' + f(cx - 12) + ' ' + f(cy - 10) + ' L ' + f(cx + 11) + ' ' + f(cy + 1) + ' L ' + f(cx - 12) + ' ' + f(cy + 12)
      : 'M ' + f(cx + 12) + ' ' + f(cy - 10) + ' L ' + f(cx - 11) + ' ' + f(cy + 1) + ' L ' + f(cx + 12) + ' ' + f(cy + 12);
    return path(d, 'none', C.navy, 5.5);
  }
  function lid(cx, cy, side, kind) {
    /* mint "eyelid" polygon that cuts the top of the eye. kind: angry (inner end low) | sad (inner end high) | half (flat) */
    var inner = side < 0 ? 1 : -1;               /* +1 means the inner end is on the right */
    var xo = cx - inner * 22, xi = cx + inner * 22, yo, yi;
    if (kind === 'angry') { yo = cy - 17; yi = cy + 1; }
    else if (kind === 'sad') { yo = cy + 1; yi = cy - 17; }
    else { yo = cy - 1; yi = cy - 1; }
    var d = 'M ' + f(xo) + ' ' + f(cy - 30) + ' L ' + f(xi) + ' ' + f(cy - 30) + ' L ' + f(xi) + ' ' + f(yi) + ' L ' + f(xo) + ' ' + f(yo) + ' Z';
    return path(d, C.mint, null, 0) + line(xo, yo, xi, yi, C.navy, 5);
  }
  A.eyePair = function (type, o) {
    o = o || {};
    var l = EL, r = ER, bl = o.blink || 0, look = o.look;
    function both(fn) { return fn(l[0], l[1], -1) + fn(r[0], r[1], 1); }
    if (bl >= 0.8 && /^(open|wide|angry|sad|glossy|half|think|big|small)/.test(type)) return both(function (x, y) { return closedArc(x, y); });
    switch (type) {
      case 'open': return both(function (x, y) { return eyeBase(x, y, { blink: bl, look: look }); });
      case 'wide': return both(function (x, y) { return eyeBase(x, y, { s: 1.22, blink: bl, look: look, glossy: true }); });
      case 'glossy': case 'big': return both(function (x, y) { return eyeBase(x, y, { s: 1.28, blink: bl, look: look, glossy: true }) + sparkleDots(x, y); });
      case 'angry': return both(function (x, y, sd) { return eyeBase(x, y, { look: look }) + lid(x, y, sd, 'angry'); });
      case 'sad': return both(function (x, y, sd) { return eyeBase(x, y, { glossy: true, s: 1.1, look: look }) + lid(x, y, sd, 'sad'); });
      case 'half': return both(function (x, y, sd) { return eyeBase(x, y, { look: look || [0, 3] }) + lid(x, y, sd, 'half'); });
      case 'think': return both(function (x, y) { return eyeBase(x, y, { look: look || [-5, -5], blink: bl }); });
      case 'happy': return both(function (x, y) { return happyArc(x, y); });
      case 'laugh': return both(function (x, y, sd) { return chevron(x, y, sd); });
      case 'closed': return both(function (x, y, sd) { return closedArc(x, y) + line(x + sd * 14, y + 2, x + sd * 19, y + 6, C.navy, 3.5); });
      case 'flat': return both(function (x, y) { return path('M ' + f(x - 14) + ' ' + f(y + 2) + ' L ' + f(x + 14) + ' ' + f(y + 2), 'none', C.navy, 5); });
      case 'squint': return both(function (x, y, sd) { return chevron(x, y, sd); });
      case 'wink_l': return happyArc(l[0], l[1]) + eyeBase(r[0], r[1], { look: look });
      case 'wink_r': return eyeBase(l[0], l[1], { look: look }) + happyArc(r[0], r[1]);
      case 'scared': return both(function (x, y) { return circ(x, y, 18, C.white, C.navy, 4) + circ(x + (look ? look[0] : 0), y + (look ? look[1] : 0), 5.5, C.eye, null, 0) + circ(x - 1 + (look ? look[0] : 0), y - 2, 1.8, C.white, null, 0); });
      case 'uneven': return eyeBase(l[0], l[1], { s: 1.18, look: look }) + eyeBase(r[0], r[1], { s: 0.88, look: look });
      case 'shades': return '';       /* the sunglasses prop covers the eyes */
      default: return both(function (x, y) { return eyeBase(x, y, { look: look, blink: bl }); });
    }
  };
  function sparkleDots(x, y) { return circ(x - 9, y + 4, 2.2, C.white, null, 0, { opacity: 0.9 }) + circ(x + 8, y - 11, 1.8, C.white, null, 0, { opacity: 0.8 }); }

  /* ---------------- brows ---------------- */
  function brow(cx, cy, ang, len, curve) { len = len || 30; return g(path('M ' + f(cx - len / 2) + ' ' + f(cy) + ' Q ' + f(cx) + ' ' + f(cy - (curve || 0)) + ' ' + f(cx + len / 2) + ' ' + f(cy), 'none', C.navy, 5.5), 'rotate(' + ang + ' ' + f(cx) + ' ' + f(cy) + ')'); }
  /* specs are [leftAngle, rightAngle, dy, leftDy?, rightDy?] */
  A.brows = function (spec) {
    if (!spec) return '';
    var dy = spec[2] || 0;
    return brow(EL[0] + 1, 176 + dy + (spec[3] || 0), spec[0], 30, spec[5] || 0) + brow(ER[0] - 1, 176 + dy + (spec[4] || 0), spec[1], 30, spec[5] || 0);
  };

  /* ---------------- cheeks ---------------- */
  A.cheeks = function (level, lines) {
    var k = Math.max(0.55, Math.min(1.25, 0.55 + level * 0.5)), op = Math.min(0.96, 0.62 + level * 0.3);
    var out = ell(116, 242, 27 * k, 18 * k, C.cheek, null, 0, { opacity: f(op) }) + ell(284, 242, 27 * k, 18 * k, C.cheek, null, 0, { opacity: f(op) });
    out += ell(108, 236, 7 * k, 3.6 * k, 'rgba(255,255,255,.45)', null, 0, { transform: 'rotate(-20 108 236)' });
    if (lines) { [-1, 1].forEach(function (sd) { var cx = sd < 0 ? 116 : 284; for (var i = -1; i <= 1; i++) out += line(cx + i * 9 - 3, 236, cx + i * 9 + 3, 250, '#e8567a', 2.6, { opacity: 0.8 }); }); }
    return out;
  };

  /* ---------------- mouths (drawn around 0,0; caller translates to MOUTH_AT) ---------------- */
  var N = C.navy;
  function fang(x, y, s, flip) { return path('M ' + f(x - 3 * s) + ' ' + f(y) + ' L ' + f(x + 3 * s) + ' ' + f(y) + ' L ' + f(x) + ' ' + f(y + (flip ? -1 : 1) * 6 * s) + ' Z', C.white, N, 1.5); }
  function openShape(rx, ry, top) {
    /* a smile-shaped open mouth: flat-ish top lip, round bottom */
    top = top === undefined ? -3 : top;
    return 'M ' + f(-rx) + ' ' + f(top) + ' Q 0 ' + f(top + 9) + ' ' + f(rx) + ' ' + f(top) + ' Q ' + f(rx * 0.92) + ' ' + f(top + ry) + ' 0 ' + f(top + ry + 2) + ' Q ' + f(-rx * 0.92) + ' ' + f(top + ry) + ' ' + f(-rx) + ' ' + f(top) + ' Z';
  }
  function tongue(rx, ry, top) { top = top === undefined ? -3 : top; return ell(0, top + ry * 0.74, rx * 0.5, ry * 0.26, C.tongue, null, 0, { opacity: 0.95 }); }

  var M = A.MOUTHS = {
    smile_small: function () { return path('M -14 0 Q -7 9 0 2 Q 7 9 14 0', 'none', N, 4.5); },
    smile: function () { return path('M -17 -2 Q 0 15 17 -2', 'none', N, 4.8); },
    smile_open: function () { return path(openShape(14, 15), C.mouthIn, N, 4.5) + tongue(14, 15) + fang(-9, -2, 0.9) + fang(9, -2, 0.9); },
    grin: function () { return path(openShape(21, 24), C.mouthIn, N, 4.8) + tongue(21, 24) + fang(-13, -2, 1.1) + fang(13, -2, 1.1); },
    laugh: function () { return path(openShape(26, 31, -4), C.mouthIn, N, 4.8) + tongue(26, 31, -4) + fang(-16, -3, 1.2) + fang(16, -3, 1.2); },
    yell: function () { return path('M -27 -8 Q 0 -17 27 -8 Q 24 28 0 31 Q -24 28 -27 -8 Z', C.mouthIn, N, 5) + ell(0, 21, 14, 7, C.tongue) + fang(-17, -9, 1.5) + fang(17, -9, 1.5) + fang(-6, -12, 1.1) + fang(6, -12, 1.1); },
    scream: function () { return path('M -30 -10 Q 0 -20 30 -10 Q 28 34 0 36 Q -28 34 -30 -10 Z', C.mouthIn, N, 5) + ell(0, 26, 17, 8, C.tongue) + fang(-19, -11, 1.7) + fang(19, -11, 1.7); },
    o_small: function () { return ell(0, 4, 8, 10, C.mouthIn, N, 4.5) + ell(0, 9, 4.5, 3.4, C.tongue); },
    o_mid: function () { return ell(0, 6, 11, 14, C.mouthIn, N, 4.5) + ell(0, 13, 6, 4.4, C.tongue); },
    frown: function () { return path('M -14 7 Q 0 -6 14 7', 'none', N, 4.8); },
    wobble: function () { return path('M -15 6 Q -10 -2 -5 4 Q 0 -4 5 4 Q 10 -2 15 6', 'none', N, 4.5); },
    cry: function () { return path('M -22 -2 Q 0 -12 22 -2 Q 20 28 0 30 Q -20 28 -22 -2 Z', C.mouthIn, N, 5) + ell(0, 21, 12, 6.5, C.tongue); },
    pout: function () { return path('M -10 5 Q 0 -5 10 5', 'none', N, 4.8) + ell(0, 0, 3, 1.4, 'none'); },
    kiss: function () { return ell(0, 3, 6, 7, C.mouthIn, N, 4) + path('M -5 3 Q 0 7 5 3', 'none', N, 2) ; },
    flat: function () { return path('M -10 3 L 10 3', 'none', N, 5); },
    smirk: function () { return path('M -14 4 Q 4 12 17 -3', 'none', N, 4.8) + path('M 17 -3 L 20 -7', 'none', N, 3); },
    zigzag: function () { return path('M -17 3 L -11 -2 L -5 3 L 1 -2 L 7 3 L 13 -2 L 18 2', 'none', N, 4.2); },
    tremble: function () { return path('M -13 2 Q -7 -4 -2 2 Q 3 8 8 2 Q 12 -2 15 3 Q 10 18 0 18 Q -10 17 -13 2 Z', C.mouthIn, N, 4.2); },
    hmm: function () { return path('M -8 5 Q 3 1 14 -3', 'none', N, 4.8); },
    tongue: function () { return path('M -16 -2 Q 0 13 16 -2', 'none', N, 4.8) + path('M -6 8 Q 0 24 8 9 Q 4 6 -6 8 Z', C.tongue, N, 3.5); },
    drool: function () { return path(openShape(9, 12), C.mouthIn, N, 4.4) + ell(0, 7, 4.5, 3, C.tongue) + path('M 11 8 Q 15 18 11 24 Q 7 18 11 8 Z', '#bfe6ff', N, 2); },
    ww: function () { return path('M -16 1 Q -8 10 0 1 Q 8 10 16 1', 'none', N, 4.5); },
    nibble: function () { return path('M -9 6 L 9 6', 'none', N, 4.5) + circ(-3, 6, 1, N); }
  };

  /* lip-sync visemes. o = how open (0..1.4). The expression's own mouth is used for 'X'. */
  A.VISEMES = ['X', 'M', 'A', 'E', 'I', 'O', 'U', 'F', 'L', 'S'];
  A.viseme = function (v, o) {
    o = Math.max(0.15, Math.min(1.45, o === undefined ? 1 : o));
    switch (v) {
      case 'M': return path('M -12 1 Q 0 ' + f(3 + o * 1.5) + ' 12 1', 'none', N, 4.8);
      case 'A': return path('M ' + f(-13 * (0.8 + o * 0.2)) + ' -3 Q 0 ' + f(-7 - o * 2) + ' ' + f(13 * (0.8 + o * 0.2)) + ' -3 Q ' + f(12 * o) + ' ' + f(6 + 20 * o) + ' 0 ' + f(8 + 21 * o) + ' Q ' + f(-12 * o) + ' ' + f(6 + 20 * o) + ' ' + f(-13 * (0.8 + o * 0.2)) + ' -3 Z', C.mouthIn, N, 4.6) + ell(0, 5 + 18 * o, 8 * o, 4.6 * o, C.tongue, null, 0);
      case 'E': return path('M -17 -2 Q 0 ' + f(-6 - o) + ' 17 -2 Q ' + f(15) + ' ' + f(3 + 9 * o) + ' 0 ' + f(4 + 10 * o) + ' Q -15 ' + f(3 + 9 * o) + ' -17 -2 Z', C.mouthIn, N, 4.6) + path('M -13 -2 Q 0 -5 13 -2 L 12 ' + f(2 + 2 * o) + ' Q 0 ' + f(1 + 2 * o) + ' -12 ' + f(2 + 2 * o) + ' Z', C.white, null, 0);
      case 'I': return path('M -15 -1 Q 0 -5 15 -1 Q 13 ' + f(2 + 6 * o) + ' 0 ' + f(3 + 7 * o) + ' Q -13 ' + f(2 + 6 * o) + ' -15 -1 Z', C.mouthIn, N, 4.4) + path('M -11 -1 Q 0 -3 11 -1 L 10 ' + f(1.5 + o) + ' Q 0 ' + f(0.5 + o) + ' -10 ' + f(1.5 + o) + ' Z', C.white, null, 0);
      case 'O': return ell(0, 4 + 3 * o, 9 + 2 * o, 5 + 11 * o, C.mouthIn, N, 4.5) + ell(0, 6 + 9 * o, 4.6, 2.8 + 2 * o, C.tongue, null, 0);
      case 'U': return ell(0, 4 + 1.5 * o, 5.5 + 1.5 * o, 4 + 5 * o, C.mouthIn, N, 4.2);
      case 'F': return path('M -13 0 Q 0 6 13 0', 'none', N, 4.6) + path('M -8 1 L 8 1 L 7 7 Q 0 9 -7 7 Z', C.white, N, 2.4);
      case 'L': return path('M -12 -2 Q 0 -5 12 -2 Q 11 ' + f(3 + 8 * o) + ' 0 ' + f(4 + 9 * o) + ' Q -11 ' + f(3 + 8 * o) + ' -12 -2 Z', C.mouthIn, N, 4.4) + ell(0, 0 + 2 * o, 5, 3.4, C.tongue, null, 0);
      case 'S': return path('M -15 -1 Q 0 3 15 -1 L 14 ' + f(3 + 3 * o) + ' Q 0 ' + f(7 + 3 * o) + ' -14 ' + f(3 + 3 * o) + ' Z', C.white, N, 4.2) + line(-7, 1, -7, 3 + 3 * o, N, 1.4) + line(0, 2, 0, 4 + 3 * o, N, 1.4) + line(7, 1, 7, 3 + 3 * o, N, 1.4);
      default: return '';
    }
  };
  A.mouth = function (name, o) { var fn = M[name] || M.smile_small; return g(fn(o), 'translate(' + A.MOUTH_AT[0] + ',' + A.MOUTH_AT[1] + ')'); };
  A.visemeAt = function (v, o) { return g(A.viseme(v, o), 'translate(' + A.MOUTH_AT[0] + ',' + A.MOUTH_AT[1] + ')'); };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
