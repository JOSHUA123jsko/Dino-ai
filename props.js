/* Leon Offline — props.js
 * Hats, glasses, held items and floating effects. Everything is a function returning SVG text. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var A = L.Avatar = L.Avatar || {};
  var C = A.colors, S = A._s, f = S.f, path = S.path, circ = S.circ, ell = S.ell, line = S.line, g = S.g;
  var heart = S.heart, star = S.star, sparkle = S.sparkle;

  function glyphQ(x, y, s, col) {
    return g(path('M -9 -12 Q -9 -25 2 -25 Q 13 -25 13 -13 Q 13 -4 3 0 Q 0 3 0 9', 'none', C.navy, 11 / 1) + path('M -9 -12 Q -9 -25 2 -25 Q 13 -25 13 -13 Q 13 -4 3 0 Q 0 3 0 9', 'none', col || C.blue, 6.5) + circ(0, 19, 5.6, col || C.blue, C.navy, 2.6), 'translate(' + f(x) + ',' + f(y) + ') scale(' + s + ')');
  }
  function glyphE(x, y, s, col, rot) {
    return g(path('M 0 -26 L 0 4', 'none', C.navy, 12) + path('M 0 -26 L 0 4', 'none', col || C.gold, 7) + circ(0, 17, 6, col || C.gold, C.navy, 2.6), 'translate(' + f(x) + ',' + f(y) + ') rotate(' + (rot || 0) + ') scale(' + s + ')');
  }
  function glyphZ(x, y, s) { return g(path('M -9 -9 L 9 -9 L -9 9 L 9 9', 'none', C.navy, 9) + path('M -9 -9 L 9 -9 L -9 9 L 9 9', 'none', C.blue, 5), 'translate(' + f(x) + ',' + f(y) + ') scale(' + s + ')'); }
  function puff(x, y, s) { return g(circ(-9, 4, 11, C.white, C.navy, 3.2) + circ(6, 0, 13, C.white, C.navy, 3.2) + circ(-1, 10, 10, C.white, C.navy, 3.2) + circ(9, 10, 8, C.white, null, 0) + circ(-5, 6, 9, C.white, null, 0), 'translate(' + f(x) + ',' + f(y) + ') scale(' + s + ')'); }
  function drop(x, y, s, fill) { return g(path('M 0 -14 Q 10 2 0 10 Q -10 2 0 -14 Z', fill || '#9fd8ff', C.navy, 2.4) + path('M -3 -2 Q -5 3 -1 6', 'none', C.white, 2.2), 'translate(' + f(x) + ',' + f(y) + ') scale(' + s + ')'); }

  /* ---------- head props (drawn inside the head group, so they tilt with the head) ---------- */
  var HEAD_PROPS = {
    nightcap: function () {
      return path('M 262 116 Q 252 52 168 46 Q 118 44 92 60 Q 122 76 134 108 Z', '#5b8cff', C.navy, 5) +
        star(210, 74, 7, -10, '#fff') + star(164, 66, 5.5, 12, '#fff') + star(130, 86, 4.5, -8, '#fff') +
        path('M 270 110 Q 200 92 128 102 L 130 124 Q 200 114 268 132 Z', C.white, C.navy, 5) +
        circ(90, 62, 13, C.white, C.navy, 4.5);
    },
    crown: function () {
      return path('M 164 92 L 158 52 L 184 70 L 204 36 L 224 70 L 250 52 L 244 92 Z', C.gold, C.navy, 4.5) +
        circ(158, 52, 5, '#ff6b8a', C.navy, 2) + circ(204, 36, 5.5, '#6bd0ff', C.navy, 2) + circ(250, 52, 5, '#ff6b8a', C.navy, 2) +
        path('M 170 84 L 238 84', 'none', C.goldDark, 3);
    },
    shades: function () {
      var lensL = 'M 120 194 Q 120 188 128 188 L 176 188 Q 186 188 186 198 Q 186 226 166 228 L 138 228 Q 120 226 120 206 Z';
      var lensR = 'M 280 194 Q 280 188 272 188 L 224 188 Q 214 188 214 198 Q 214 226 234 228 L 262 228 Q 280 226 280 206 Z';
      return path(lensL, '#141a3d', C.navy, 4.5) + path(lensR, '#141a3d', C.navy, 4.5) + path('M 186 198 Q 200 192 214 198', 'none', C.navy, 5) +
        path('M 120 198 L 92 190', 'none', C.navy, 5) + path('M 280 198 L 308 190', 'none', C.navy, 5) +
        path('M 130 196 L 150 196 L 136 214 L 130 214 Z', 'rgba(255,255,255,.35)') + path('M 226 196 L 246 196 L 232 214 L 226 214 Z', 'rgba(255,255,255,.35)') +
        sparkle(300, 168, 9, '#fff');
    },
    glasses: function () {
      return circ(152, 208, 29, 'rgba(210,240,255,.22)', C.navy, 4.5) + circ(248, 208, 29, 'rgba(210,240,255,.22)', C.navy, 4.5) +
        path('M 181 206 Q 200 196 219 206', 'none', C.navy, 4.5) + path('M 123 204 L 96 198', 'none', C.navy, 4.5) + path('M 277 204 L 304 198', 'none', C.navy, 4.5) +
        path('M 134 192 Q 142 184 152 184', 'none', 'rgba(255,255,255,.8)', 3) + path('M 230 192 Q 238 184 248 184', 'none', 'rgba(255,255,255,.8)', 3);
    },
    bandage: function () {
      return g(path('M 214 98 L 262 98 Q 270 98 270 106 L 270 112 Q 270 120 262 120 L 214 120 Q 206 120 206 112 L 206 106 Q 206 98 214 98 Z', '#ffd9b0', C.navy, 3.6) +
        path('M 228 98 L 228 120 M 248 98 L 248 120', 'none', '#e8b685', 2) + circ(238, 109, 3, '#e8b685', null, 0), 'rotate(-18 238 109)');
    },
    anger: function () {
      var col = C.red, d = function (a) { return g(path('M -10 -2 Q -3 -2 -3 -10 M 10 -2 Q 3 -2 3 -10 M -10 2 Q -3 2 -3 10 M 10 2 Q 3 2 3 10', 'none', col, 4.4), 'rotate(' + a + ')'); };
      return g(d(0), 'translate(268,124)');
    }
  };

  /* ---------- things Leon holds, in front of the belly / near the mouth ---------- */
  var BODY_PROPS = {
    heart_big: function () { return heart(200, 346, 46, 0, C.heart); },
    pillow: function () {
      return g(path('M 112 340 Q 112 326 126 326 L 252 330 Q 270 332 268 350 L 262 392 Q 260 408 244 408 L 128 404 Q 112 402 114 388 Z', '#fbfdff', C.navy, 5) +
        path('M 128 344 Q 150 352 190 346', 'none', '#dfe9f7', 3) + path('M 132 376 Q 160 386 200 380', 'none', '#dfe9f7', 3), 'rotate(-6 190 366)');
    }
  };
  var MID_PROPS = {
    burger: function () {
      return g(path('M -36 -4 Q -36 -30 0 -30 Q 36 -30 36 -4 Z', '#e8a64f', C.navy, 4) + ell(-12, -20, 3.2, 1.8, '#fff3c4') + ell(6, -24, 3.2, 1.8, '#fff3c4') + ell(18, -16, 3.2, 1.8, '#fff3c4') +
        path('M -38 -3 Q -30 4 -22 -3 Q -14 4 -6 -3 Q 2 4 10 -3 Q 18 4 26 -3 Q 32 2 38 -3 L 38 2 L -38 2 Z', '#79d65f', C.navy, 3) +
        path('M -34 2 L 34 2 L 30 8 L -30 8 Z', '#ffd24a', C.navy, 3) +
        path('M -35 8 Q -35 20 -24 20 L 24 20 Q 35 20 35 8 Z', '#7a4a2b', C.navy, 3.6) +
        path('M -35 22 L 35 22 Q 35 36 18 36 L -18 36 Q -35 36 -35 22 Z', '#e8a64f', C.navy, 4), 'translate(236,262) rotate(-14) scale(0.95)');
    },
    star_wand: function () {
      return line(300, 352, 322, 246, C.creamDark, 9) + line(300, 352, 322, 246, C.navy, 3.5, { opacity: 0.5 }) + star(326, 226, 26, 12, C.gold) + sparkle(356, 196, 9) + sparkle(296, 214, 7);
    }
  };

  /* ---------- floating effects ---------- */
  var FX = {
    excl: function () { return [[96, 92, 74, 62], [118, 78, 110, 46], [66, 124, 40, 118]].map(function (l) { return line(l[0], l[1], l[2], l[3], C.navy, 10) + line(l[0], l[1], l[2], l[3], C.gold, 5.5); }).join(''); },
    excl_q: function () { return glyphE(84, 92, 0.8, '#ff5c86', -14) + glyphQ(116, 70, 0.62, C.gold); },
    sparkles: function () { return sparkle(66, 120, 11) + sparkle(338, 104, 13) + sparkle(84, 300, 8) + sparkle(344, 270, 9) + sparkle(300, 52, 7); },
    hearts: function () { return heart(66, 126, 10, -16) + heart(336, 96, 13, 14) + heart(88, 66, 7, -8) + heart(320, 168, 8, 16) + heart(54, 210, 7, -10, C.cheek); },
    hearts_small: function () { return heart(328, 108, 10, 14) + heart(80, 100, 8, -12); },
    kiss_heart: function () { return heart(290, 232, 11, 14) + heart(320, 206, 7, 20, C.cheek); },
    zzz: function () { return glyphZ(312, 98, 0.9) + glyphZ(344, 66, 1.2) + glyphZ(374, 30, 1.5); },
    tears: function () {
      function st(x, dir) { return path('M ' + (x - 6) + ' 224 C ' + (x - 8 + dir * 3) + ' 246 ' + (x - 8 + dir * 4) + ' 262 ' + (x - 5 + dir * 5) + ' 278 Q ' + (x + dir * 5) + ' 286 ' + (x + 6 + dir * 5) + ' 278 C ' + (x + 8 + dir * 4) + ' 262 ' + (x + 8 + dir * 3) + ' 246 ' + (x + 6) + ' 224 Z', '#b9e3ff', C.navy, 3) + path('M ' + (x - 2) + ' 232 Q ' + (x - 3 + dir * 2) + ' 252 ' + (x - 1 + dir * 4) + ' 270', 'none', C.white, 2.6, { opacity: 0.95 }); }
      return st(140, -1) + st(260, 1) + drop(124, 296, 0.8) + drop(278, 300, 0.8);
    },
    tears_one: function () { return path('M 262 222 Q 255 244 251 272 Q 260 276 267 268 Q 268 244 272 224 Z', '#aedcff', C.navy, 3) + drop(256, 288, 0.8); },
    tears_joy: function () { return drop(120, 196, 0.8, '#aedcff') + drop(282, 196, 0.8, '#aedcff'); },
    tears_big: function () {
      function st(x, dir) { return path('M ' + (x - 8) + ' 224 C ' + (x - 12 + dir * 4) + ' 250 ' + (x - 12 + dir * 8) + ' 280 ' + (x - 8 + dir * 10) + ' 302 Q ' + (x + dir * 10) + ' 314 ' + (x + 9 + dir * 10) + ' 302 C ' + (x + 12 + dir * 8) + ' 280 ' + (x + 12 + dir * 4) + ' 250 ' + (x + 8) + ' 224 Z', '#b9e3ff', C.navy, 3.2) + path('M ' + (x - 3) + ' 234 Q ' + (x - 4 + dir * 4) + ' 262 ' + (x + dir * 8) + ' 290', 'none', C.white, 3, { opacity: 0.95 }); }
      return st(138, -1) + st(262, 1) + drop(110, 326, 0.9) + drop(292, 332, 0.9) + drop(98, 280, 0.7) + drop(304, 288, 0.7);
    },
    sweat: function () { return drop(310, 128, 1.1); },
    question: function () { return glyphQ(318, 96, 0.95) + glyphQ(84, 70, 0.7, C.blueDark); },
    shiver: function () { return [60, 340].map(function (x, i) { var s = i ? -1 : 1; return path('M ' + x + ' 140 q ' + (-9 * s) + ' 12 0 24 q ' + (9 * s) + ' 12 0 24 q ' + (-9 * s) + ' 12 0 24', 'none', C.blue, 4.5) + path('M ' + (x + 14 * s) + ' 150 q ' + (-8 * s) + ' 10 0 20 q ' + (8 * s) + ' 10 0 20', 'none', C.blue, 3.4, { opacity: 0.7 }); }).join(''); },
    puff: function () { return puff(52, 130, 1) + puff(352, 126, 0.9); },
    puff_small: function () { return puff(70, 150, 0.7); },
    sigh: function () { return puff(300, 270, 0.8); },
    broken_heart: function () { return g(path('M 0 13 C -22 -3 -14 -18 0 -9 L 4 -3 L -3 4 L 4 10 L 0 13 Z', C.red, C.navy, 2.6) + path('M 4 -3 L -3 4 L 4 10', 'none', C.white, 2) + path('M 0 -9 C 14 -18 22 -3 0 13', C.red, C.navy, 2.6), 'translate(92,98) scale(1.35) rotate(-10)'); },
    swirl: function () { return path('M 66 96 q 14 -14 28 -2 q 12 14 -4 24 q -16 8 -24 -6 q -4 -14 10 -16', 'none', C.blueDark, 4); },
    anger_two: function () { return g(FX.anger_mark(), 'translate(0,0)'); },
    anger_mark: function () { return ''; },
    bubble_bye: function () {
      return path('M 296 52 Q 296 38 312 38 L 366 38 Q 384 38 384 54 L 384 74 Q 384 90 366 90 L 330 90 L 312 108 L 314 90 Q 296 90 296 74 Z', C.white, C.navy, 4.5) +
        '<text x="340" y="73" text-anchor="middle" font-family="Trebuchet MS, Verdana, DejaVu Sans, sans-serif" font-weight="800" font-size="25" fill="' + C.navy + '">Bye!</text>';
    },
    star_burst: function () { return star(70, 112, 11, 12) + star(336, 100, 9, -10); }
  };

  A.HEAD_PROPS = HEAD_PROPS; A.BODY_PROPS = BODY_PROPS; A.MID_PROPS = MID_PROPS; A.FX = FX;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
