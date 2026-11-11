/* Leon Offline — sfx.js
 * Procedural sound effects: nothing to download, nothing recorded. Everything is generated from oscillators, noise
 * and Leon's own formant synthesizer (LeonSynth), so Leon can giggle, scream, sniffle and sob fully offline.
 *
 *   var s = Leon.Sfx.make('giggle');           // { pcm, sampleRate, duration, keys, gain, name }
 *   Leon.Sfx.names                              // everything available
 *   Leon.Sfx.forGesture('spin')                 // 'whoosh' (optional automatic sounds for gestures)
 * `keys` are mouth shapes in the same format as Leon.Lipsync.fromTimeline() (or null when the sound has none).
 * No DOM, no network. Deterministic: the same call gives the same samples. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var SR = 22050, TAU = Math.PI * 2;
  var X = L.Sfx = { SAMPLE_RATE: SR };

  function LS() { return L.LeonSynth; }
  function buf(sec) { return new Float32Array(Math.max(1, Math.round(sec * SR))); }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function peakNorm(b, p) {
    var m = 0, i;
    for (i = 0; i < b.length; i++) { var a = Math.abs(b[i]); if (a > m) m = a; }
    if (m > 1e-9) { var k = p / m; for (i = 0; i < b.length; i++) b[i] *= k; }
    return b;
  }
  function fadeEdges(b, ms) {
    var n = Math.min(b.length >> 1, Math.round(ms / 1000 * SR)), i;
    for (i = 0; i < n; i++) { var g = i / n; b[i] *= g; b[b.length - 1 - i] *= g; }
    return b;
  }
  function add(dst, src, at, g) {
    var o = Math.round(at * SR), i;
    for (i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * g;
    return dst;
  }
  function rng(seed) { return LS().dsp.rng(seed); }

  /* band-pass noise with time-varying centre / width / loudness */
  function noiseBand(seed, sec, fc, bw, env) {
    var r = rng(seed), n = Math.round(sec * SR), out = new Float32Array(n), bp = new (LS().dsp.BP)(), i;
    for (i = 0; i < n; i++) {
      var t = i / SR;
      if (i % 24 === 0) bp.set(fc(t), bw(t));
      out[i] = bp.run(r()) * env(t);
    }
    return out;
  }
  function lowNoise(seed, sec, fc, env, poles) {
    var r = rng(seed), n = Math.round(sec * SR), out = new Float32Array(n), k = 1 - Math.exp(-TAU * fc / SR), st = [0, 0, 0, 0], i, p;
    for (i = 0; i < n; i++) {
      var v = r();
      for (p = 0; p < (poles || 2); p++) { st[p] += k * (v - st[p]); v = st[p]; }
      out[i] = v * env(i / SR);
    }
    return out;
  }
  function expEnv(t, a, tau) { return (t < a ? t / a : 1) * Math.exp(-Math.max(0, t - a) / tau); }
  function bell(t, dur) { var u = clamp(t / dur, 0, 1); return Math.sin(Math.PI * u); }

  /* ---------- the sounds ---------- */
  var MAKERS = {
    pop: function () {
      var b = buf(0.1), ph = 0, i;
      for (i = 0; i < b.length; i++) { var t = i / SR, f = 170 + 650 * Math.exp(-t / 0.016); ph += TAU * f / SR; b[i] = Math.sin(ph) * expEnv(t, 0.002, 0.03); }
      return { pcm: b, gain: 0.7 };
    },
    boing: function () {
      var b = buf(0.5), ph = 0, i;
      for (i = 0; i < b.length; i++) {
        var t = i / SR, f = 140 + 520 * (1 - Math.exp(-t / 0.045)) * Math.exp(-t / 0.3) + 50 * Math.sin(TAU * 15 * t) * Math.exp(-t / 0.22);
        ph += TAU * f / SR; b[i] = (Math.sin(ph) + 0.3 * Math.sin(2 * ph + 0.6)) * expEnv(t, 0.004, 0.24);
      }
      return { pcm: b, gain: 0.6 };
    },
    ding: function () {
      var b = buf(0.7), i;
      for (i = 0; i < b.length; i++) {
        var t = i / SR;
        b[i] = (Math.sin(TAU * 1318.5 * t) * Math.exp(-t / 0.24) + 0.5 * Math.sin(TAU * 1975.5 * t) * Math.exp(-t / 0.17) + 0.25 * Math.sin(TAU * 2637 * t) * Math.exp(-t / 0.1)) * Math.min(1, t / 0.002);
      }
      return { pcm: b, gain: 0.55 };
    },
    sparkle: function () {
      var b = buf(0.5), at = [0, 0.07, 0.14, 0.24], fr = [2093, 2637, 3136, 4186], k, i;
      for (k = 0; k < at.length; k++) {
        var s = Math.round(at[k] * SR);
        for (i = 0; i < 0.14 * SR && s + i < b.length; i++) { var t = i / SR; b[s + i] += Math.sin(TAU * fr[k] * t) * expEnv(t, 0.002, 0.04) * (1 - k * 0.12); }
      }
      return { pcm: b, gain: 0.45 };
    },
    whoosh: function () {
      var d = 0.5;
      return { pcm: noiseBand(11, d, function (t) { return 450 + 2600 * Math.pow(bell(t, d), 1.2); }, function () { return 1800; }, function (t) { return Math.pow(bell(t, d), 2); }), gain: 0.5 };
    },
    thud: function () {
      var b = buf(0.26), ph = 0, i, nz = lowNoise(5, 0.26, 450, function (t) { return Math.exp(-t / 0.012) * 0.5; }, 1);
      for (i = 0; i < b.length; i++) { var t = i / SR, f = 52 + 70 * Math.exp(-t / 0.035); ph += TAU * f / SR; b[i] = Math.sin(ph) * expEnv(t, 0.002, 0.075) + nz[i]; }
      return { pcm: b, gain: 0.8 };
    },
    gasp: function () {
      var d = 0.24;
      var b = noiseBand(21, d, function (t) { return 900 + 2400 * clamp(t / 0.15, 0, 1); }, function () { return 1700; }, function (t) { return t < 0.2 ? Math.pow(t / 0.2, 1.4) : Math.max(0, 1 - (t - 0.2) / 0.03); });
      return { pcm: b, gain: 0.6, keys: [{ t0: 0, t1: d, v: 'O', open: 1.1, ph: 'o' }] };
    },
    sniffle: function () {
      var out = buf(0.62), k, sn = [[0, 1.0, 0.2], [0.27, 0.7, 0.18], [0.5, 0.4, 0.1]];
      for (k = 0; k < sn.length; k++) {
        (function (at, g, d) {
          var hi = noiseBand(30 + k, d, function (t) { return 2000 + 1700 * clamp(t / d, 0, 1); }, function () { return 1500; }, function (t) { return expEnv(t, 0.012, d * 0.35); });
          var lo = lowNoise(40 + k, d, 600, function (t) { return expEnv(t, 0.02, d * 0.3) * 0.5; }, 2);
          add(out, hi, at, g); add(out, lo, at, g);
        })(sn[k][0], sn[k][1], sn[k][2]);
      }
      return { pcm: out, gain: 0.95 };
    },
    rumble: function () {
      var d = 1.2, n = Math.round(d * SR), out = new Float32Array(n), a = lowNoise(7, d, 130, function () { return 1; }, 3), b = noiseBand(8, d, function () { return 240; }, function () { return 140; }, function () { return 1; }), i;
      for (i = 0; i < n; i++) {
        var t = i / SR, am = 0.5 + 0.5 * Math.sin(TAU * (5 + 2.5 * Math.sin(1.7 * t)) * t), sw = Math.pow(bell(t, d), 0.8);
        out[i] = (a[i] * 3.2 + b[i] * 0.9) * am * sw;
      }
      return { pcm: out, gain: 0.9 };
    },
    giggle: function () {
      var P = [], A = [], F = [], keys = [], k, t0, N = 4, hz, step = 0.118;
      for (k = 0; k < N; k++) {
        t0 = 0.03 + k * step; hz = 520 - k * 18;
        P.push([t0 + 0.02, hz * 1.07], [t0 + 0.088, hz * 0.8]);                                  /* each "he" drops in pitch, each one a little lower */
        A.push([t0 - 0.006, 0, 0.0], [t0 + 0.004, 0, 0.16], [t0 + 0.026, 0.0, 0.1], [t0 + 0.036, 0.95 * Math.pow(0.86, k), 0.04], [t0 + 0.068, 0.75 * Math.pow(0.86, k), 0.02], [t0 + 0.088, 0, 0]);
        F.push([t0, 620 + k * 8, 2200, 3050, 110, 130, 190]);
        keys.push({ t0: t0, t1: t0 + 0.034, v: 'E', open: 0.45, ph: 'h' }, { t0: t0 + 0.034, t1: t0 + 0.09, v: 'E', open: 1.0, ph: 'e' });
      }
      var dur = 0.03 + N * step + 0.06;
      A.unshift([0, 0, 0]); P.unshift([0, P[0][1]]); F.unshift([0, 620, 2200, 3050, 110, 130, 190]);
      return { pcm: LS().renderCustom({ duration: dur, style: 'excited', styleOverride: { vib: 0, jitter: 0.012, breath: 0.05 }, f0: P, F: F, A: A }), gain: 0.9, keys: keys };
    },
    scream: function () {
      var d = 1.7;
      var s = LS().renderCustom({
        duration: d, style: 'shout', styleOverride: { vib: 0.03, vibHz: 7.2, jitter: 0.03, oq: 0.42, tilt: 9000, breath: 0.08 },
        f0: [[0, 330], [0.06, 650], [0.18, 900], [0.72, 860], [1.1, 790], [1.45, 610], [d, 430]],
        F: [[0, 700, 1300, 2600, 150, 160, 200], [0.12, 1080, 1680, 2800, 170, 180, 230], [1.4, 1010, 1620, 2800, 170, 180, 230], [d, 820, 1400, 2700, 150, 160, 200]],
        A: [[0, 0, 0.05], [0.014, 1.0, 0.12], [1.42, 1.0, 0.1], [d - 0.04, 0.0, 0.0]]
      });
      var i, am;
      for (i = 0; i < s.length; i++) { var t = i / SR; am = 1 - 0.28 * clamp((t - 0.35) / 0.4, 0, 1) * (0.5 + 0.5 * Math.sin(TAU * 74 * t)); s[i] *= am; }
      return { pcm: s, gain: 1.0, keys: [{ t0: 0, t1: d, v: 'A', open: 1.4, ph: 'a' }] };
    },
    sob: function () {
      var P = [[0, 300]], A = [[0, 0, 0]], F = [[0, 400, 1000, 2400, 120, 140, 190]], keys = [], k, t0, N = 3, d = 0.07 + N * 0.44 + 0.1;
      for (k = 0; k < N; k++) {
        t0 = 0.05 + k * 0.44;
        A.push([t0, 0, 0], [t0 + 0.05, 0, 0.32], [t0 + 0.11, 0, 0.1], [t0 + 0.14, 0.7 - k * 0.1, 0.18], [t0 + 0.26, 0.72 - k * 0.1, 0.16], [t0 + 0.36, 0, 0.02], [t0 + 0.38, 0, 0]);
        P.push([t0 + 0.12, 335 - k * 22], [t0 + 0.36, 245 - k * 22]);
        F.push([t0 + 0.05, 520, 1450, 2500, 120, 140, 190], [t0 + 0.14, 420, 1050, 2450, 120, 140, 190], [t0 + 0.34, 640, 1350, 2500, 130, 150, 200]);
        keys.push({ t0: t0 + 0.05, t1: t0 + 0.13, v: 'O', open: 0.6, ph: 'h' }, { t0: t0 + 0.13, t1: t0 + 0.36, v: 'U', open: 0.8, ph: 'u' });
      }
      var s = LS().renderCustom({ duration: d, style: 'sob', styleOverride: { vib: 0.035, vibHz: 6.2, jitter: 0.03, breath: 0.16, drop: 0 }, f0: P, F: F, A: A });
      return { pcm: s, gain: 0.8, keys: keys };
    },
    sigh: function () {
      var d = 0.95;
      var s = LS().renderCustom({ duration: d, style: 'whisper', f0: [[0, 220], [d, 200]],
        F: [[0, 700, 1400, 2600, 130, 150, 190], [0.5, 560, 1200, 2500, 130, 150, 190], [d, 420, 1000, 2450, 130, 150, 190]],
        A: [[0, 0, 0], [0.12, 0, 0.35], [0.45, 0, 0.3], [d - 0.05, 0, 0.0]] });
      return { pcm: s, gain: 0.55, keys: [{ t0: 0.08, t1: d - 0.1, v: 'O', open: 0.7, ph: 'o' }] };
    },
    yawn: function () {
      var d = 1.6;
      var s = LS().renderCustom({ duration: d, style: 'soft', styleOverride: { breath: 0.18, vib: 0.01, vibHz: 4.5 }, f0: [[0, 250], [0.5, 310], [1.0, 245], [d, 170]],
        F: [[0, 700, 1300, 2600, 140, 150, 190], [0.6, 880, 1350, 2700, 150, 160, 200], [1.2, 560, 1000, 2600, 140, 150, 190], [d, 450, 950, 2500, 140, 150, 190]],
        A: [[0, 0, 0], [0.3, 0.8, 0.2], [1.1, 0.8, 0.18], [d - 0.05, 0, 0]] });
      return { pcm: s, gain: 0.7, keys: [{ t0: 0.1, t1: 1.0, v: 'A', open: 1.4, ph: 'a' }, { t0: 1.0, t1: d - 0.1, v: 'O', open: 0.9, ph: 'o' }] };
    },
    hum: function () {
      var r = LS().synth('hmm', { rate: 0.62, style: 'soft' });
      return { pcm: r.pcm, gain: 0.6, keys: [{ t0: 0.05, t1: r.duration - 0.05, v: 'M', open: 0.1, ph: 'm' }] };
    },
    oh: function () {
      var r = LS().synth('oh!', { rate: 0.9, style: 'excited', pitch: 330 });
      return { pcm: r.pcm, gain: 0.8, keys: L.Lipsync ? L.Lipsync.fromTimeline(r.timeline) : null };
    },
    kiss: function () {
      var r = LS().synth('mwa', { rate: 1.5, style: 'excited', pitch: 340 }), n = r.pcm.length + Math.round(0.08 * SR), out = new Float32Array(n);
      add(out, r.pcm, 0, 0.9);
      var click = noiseBand(51, 0.025, function () { return 2600; }, function () { return 1800; }, function (t) { return expEnv(t, 0.001, 0.007); });
      add(out, click, r.duration - 0.02, 0.8);
      return { pcm: out, gain: 0.8, keys: [{ t0: 0, t1: 0.1, v: 'U', open: 0.5, ph: 'm' }, { t0: 0.1, t1: r.duration - 0.03, v: 'M', open: 0.1, ph: 'm' }] };
    }
  };
  X.names = Object.keys(MAKERS);

  /* optional automatic sounds for gestures (the stage plays these quietly) */
  var GESTURE = { spin: 'whoosh', hop: 'boing', sit: 'thud', wave: null, bounce: null };
  X.forGesture = function (g) { return GESTURE[g] || null; };

  var cache = {};
  X.make = function (name, opts) {
    var mk = MAKERS[name];
    if (!mk || !LS()) return null;
    if (cache[name] && !(opts && opts.fresh)) return cache[name];
    var r = mk(), pcm = r.pcm;
    peakNorm(pcm, 0.85); fadeEdges(pcm, 3);
    var out = { name: name, pcm: pcm, sampleRate: SR, duration: pcm.length / SR, keys: r.keys || null, gain: r.gain === undefined ? 1 : r.gain };
    cache[name] = out;
    return out;
  };
  X.clearCache = function () { cache = {}; };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
