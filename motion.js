/* Leon Offline — motion.js
 * Pure math for movement: idle breathing / floating, and the gesture library.
 * Nothing here touches the DOM, so the same motion drives the SVG puppet, the sprite mode and the tests.
 * Every function returns offsets: dx, dy (px in the 400x460 box), rot (deg, about the feet), sx, sy (scale),
 * flip (1 = normal, -1 = mirrored, in-between = turning), headRot, headDy, tail, armL, armR (deg), footL, footR (px). */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var M = L.Motion = {};
  var PI = Math.PI, sin = Math.sin, cos = Math.cos, abs = Math.abs;

  function zero() { return { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, flip: 1, headRot: 0, headDy: 0, tail: 0, armL: 0, armR: 0, footL: 0, footR: 0 }; }
  M.zero = zero;
  M.add = function (a, b) {
    return { dx: a.dx + b.dx, dy: a.dy + b.dy, rot: a.rot + b.rot, sx: a.sx * b.sx, sy: a.sy * b.sy, flip: a.flip * b.flip, headRot: a.headRot + b.headRot, headDy: a.headDy + b.headDy,
      tail: a.tail + b.tail, armL: a.armL + b.armL, armR: a.armR + b.armR, footL: a.footL + b.footL, footR: a.footR + b.footR };
  };
  function mk(o) { var z = zero(); for (var k in o) z[k] = o[k]; return z; }
  function env(u) { /* smooth in/out so gestures never pop */ var e = Math.min(1, u / 0.12, (1 - u) / 0.14); return e <= 0 ? 0 : (e >= 1 ? 1 : e * e * (3 - 2 * e)); }
  function ease(u) { return u * u * (3 - 2 * u); }

  /* floating on the home screen: slow bob, breathing squash, little tail wag */
  M.idle = function (t, mood) {
    var calm = mood === 'sleepy' ? 0.6 : 1;
    return mk({
      dy: sin(t * 1.7) * 4 * calm, sy: 1 + 0.014 * sin(t * 2.3), sx: 1 - 0.009 * sin(t * 2.3), rot: sin(t * 0.8) * 0.7,
      headRot: sin(t * 1.1 + 1) * 1.3, headDy: sin(t * 2.3 + 0.6) * 0.8, tail: sin(t * 2.1) * 3.5
    });
  };

  /* talking: the head and body ride the syllables a little. amp 0..1.5 */
  M.talk = function (t, amp) {
    if (!amp) return zero();
    return mk({ headDy: sin(t * 15) * 1.6 * amp, headRot: sin(t * 7.3) * 1.8 * amp, dy: -abs(sin(t * 7.5)) * 2.2 * amp, sy: 1 + 0.012 * amp * sin(t * 15) });
  };

  /* a short "pop" when the expression changes. u 0..1 */
  M.pop = function (u) {
    if (u >= 1) return zero();
    var k = sin(u * PI * 2.2) * (1 - u);
    return mk({ sx: 1 - 0.05 * k, sy: 1 + 0.07 * k });
  };

  /* Gestures: dur (ms), pose (arm pose to hold during it, optional), mouth (force a mouth, optional), fn(u) -> offsets. u runs 0..1. */
  var G = M.GESTURES = {
    bounce:    { dur: 900, fn: function (u) { var a = abs(sin(u * PI * 2)); return mk({ dy: -30 * a, sy: 1 + 0.06 * a - 0.05 * (1 - a), sx: 1 - 0.04 * a + 0.04 * (1 - a), footL: -4 * a, footR: -4 * a }); } },
    hop:       { dur: 600, fn: function (u) { var a = sin(u * PI); return mk({ dy: -44 * a, sy: 1 + 0.08 * a, sx: 1 - 0.05 * a, footL: -6 * a, footR: -6 * a, armL: -10 * a, armR: 10 * a }); } },
    shake:     { dur: 700, fn: function (u) { var d = 1 - u * 0.4; return mk({ headRot: 10 * sin(u * PI * 7) * d, dx: 4 * sin(u * PI * 14) * d, rot: 2 * sin(u * PI * 7) }); } },
    spin:      { dur: 1000, fn: function (u) { var a = sin(u * PI); return mk({ flip: cos(u * PI * 2), dy: -22 * a, sy: 1 + 0.04 * a }); } },
    wave:      { dur: 1500, pose: 'wave', fn: function (u) { return mk({ armR: 16 * sin(u * PI * 6), headRot: 3 * sin(u * PI * 3), dy: -3 * abs(sin(u * PI * 3)) }); } },
    legbounce: { dur: 1500, fn: function (u) { var a = sin(u * PI * 8); return mk({ dy: -2.5 * abs(a), footL: -7 * Math.max(0, a), footR: -7 * Math.max(0, -a), headRot: 1.5 * a, headDy: 1.2 * a }); } },
    pace:      { dur: 2200, fn: function (u) { var x = sin(u * PI * 2), step = sin(u * PI * 10); return mk({ dx: 46 * x, dy: -4 * abs(step), rot: 3 * cos(u * PI * 2), footL: -6 * Math.max(0, step), footR: -6 * Math.max(0, -step), headRot: 2 * step }); } },
    scream:    { dur: 1100, mouth: 'scream', fn: function (u) { var a = sin(u * PI); return mk({ sy: 1 + 0.1 * a, sx: 1 - 0.05 * a, dy: -8 * a, headRot: -8 * a, dx: 3 * sin(u * PI * 36) * a, headDy: -4 * a }); } },
    wiggle:    { dur: 1000, fn: function (u) { return mk({ rot: 7 * sin(u * PI * 4), headRot: -3 * sin(u * PI * 4), tail: 12 * sin(u * PI * 8), dy: -2 * abs(sin(u * PI * 4)) }); } },
    nod:       { dur: 700, fn: function (u) { var a = sin(u * PI * 2); return mk({ headRot: 5 * a, headDy: 7 * Math.max(0, a), sy: 1 - 0.01 * Math.max(0, a) }); } },
    sit:       { dur: 1700, fn: function (u) { var a = sin(u * PI); return mk({ dy: 12 * a, sy: 1 - 0.06 * a, sx: 1 + 0.04 * a, headRot: 5 * a, headDy: 6 * a }); } },
    shrug:     { dur: 1100, pose: 'shrug', fn: function (u) { var a = sin(u * PI); return mk({ dy: -4 * a, headRot: 7 * sin(u * PI * 2), sy: 1 - 0.02 * a }); } },
    point_mouth: { dur: 1600, pose: 'point_mouth', fn: function (u) { return mk({ headRot: 5 * sin(u * PI), dx: 2 * sin(u * PI * 5) }); } }
  };
  M.gestureNames = Object.keys(G);

  /* offsets for a gesture at elapsed ms (null when finished or unknown) */
  M.gesture = function (name, elapsed, durOverride) {
    var g = G[name]; if (!g) return null;
    var dur = durOverride || g.dur;
    if (elapsed >= dur) return null;
    var u = Math.max(0, elapsed / dur), e = env(u), o = g.fn(u);
    /* blend towards zero at the edges so the gesture eases in and out */
    return { dx: o.dx * e, dy: o.dy * e, rot: o.rot * e, sx: 1 + (o.sx - 1) * e, sy: 1 + (o.sy - 1) * e, flip: 1 + (o.flip - 1) * (name === 'spin' ? 1 : e), headRot: o.headRot * e, headDy: o.headDy * e,
      tail: o.tail * e, armL: o.armL * e, armR: o.armR * e, footL: o.footL * e, footR: o.footR * e };
  };
  M.duration = function (name) { return G[name] ? G[name].dur : 0; };
  M.ease = ease;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
