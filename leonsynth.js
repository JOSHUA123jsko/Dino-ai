/* Leon Offline — leonsynth.js
 * LeonSynth: Leon's own voice, generated from scratch with no recordings, no network and no model files.
 * It is a small Klatt-style formant synthesizer:
 *   text -> Leon.G2P phones -> durations + pitch contour (prosody) -> formant / amplitude tracks -> samples.
 *   voice source : glottal-flow-derivative pulse (polyBLEP band-limited) + tilt filter + aspiration noise
 *   vocal tract  : cascade of 5 resonators (F1..F5), nasal pole + zero for m n ng
 *   consonants   : band-pass noise (frication, stop bursts), closures, voice bars, locus-based formant transitions
 * It sounds like a cute synthetic dino voice, not a human recording: best on Filipino spelling, English is approximate.
 *
 *   var r = Leon.LeonSynth.synth('Hello po, yarn!', { style: 'excited' });
 *   r.pcm (Float32Array), r.sampleRate (22050), r.duration (s), r.timeline, r.words
 *   var p = Leon.LeonSynth.plan(text, opts)   // same without rendering samples (used for silent lip movement)
 *
 * No DOM, no network. Works in Node, a browser, a WebView or a Worker. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var SR = 22050, TAU = Math.PI * 2;

  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function isVow(p) { return p === 'a' || p === 'e' || p === 'i' || p === 'o' || p === 'u' || p === '@'; }

  /* ---------------- DSP blocks ---------------- */
  function Res() { this.a = 1; this.b = 0; this.c = 0; this.y1 = 0; this.y2 = 0; }       /* 2-pole resonator, unity DC gain */
  Res.prototype.set = function (f, bw) {
    f = clamp(f, 40, SR * 0.46); bw = Math.max(bw, 20);
    var r = Math.exp(-Math.PI * bw / SR);
    this.c = -r * r; this.b = 2 * r * Math.cos(TAU * f / SR); this.a = 1 - this.b - this.c;
  };
  Res.prototype.run = function (x) { var y = this.a * x + this.b * this.y1 + this.c * this.y2; this.y2 = this.y1; this.y1 = y; return y; };

  function Anti() { this.a = 1; this.b = 0; this.c = 0; this.x1 = 0; this.x2 = 0; }      /* anti-resonator (nasal zero), unity DC gain */
  Anti.prototype.set = function (f, bw) {
    f = clamp(f, 100, SR * 0.46); bw = Math.max(bw, 40);
    var r = Math.exp(-Math.PI * bw / SR), c = -r * r, b = 2 * r * Math.cos(TAU * f / SR), a = 1 - b - c;
    this.a = 1 / a; this.b = -b / a; this.c = -c / a;
  };
  Anti.prototype.run = function (x) { var y = this.a * x + this.b * this.x1 + this.c * this.x2; this.x2 = this.x1; this.x1 = x; return y; };

  function BP() { this.g = 0; this.b = 0; this.c = 0; this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0; }  /* band-pass for noise */
  BP.prototype.set = function (f, bw) {
    f = clamp(f, 150, SR * 0.46); bw = Math.max(bw, 80);
    var r = Math.exp(-Math.PI * bw / SR);
    this.c = -r * r; this.b = 2 * r * Math.cos(TAU * f / SR); this.g = (1 - r * r) * 0.5;
  };
  BP.prototype.run = function (x) { var y = this.g * (x - this.x2) + this.b * this.y1 + this.c * this.y2; this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y; };

  function rngMake(seed) { var s = (seed | 0) || 123456789; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; }; }
  function blep(t, dt) {                                                                  /* polyBLEP residual for a step at t = 0 */
    if (t < dt) { t /= dt; return t + t - t * t - 1; }
    if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
    return 0;
  }

  /* ---------------- phone table ----------------
   * F: formants of a bright adult-female voice (Hz); scaled by opts.formant. B: bandwidths. d: base duration (ms).
   * k: V vowel, G glide/liquid, R tap, M nasal, F fricative, H h, P stop, A affricate. */
  var PH = {
    a:  { k: 'V', F: [790, 1350, 2650], B: [130, 130, 180], d: 95, amp: 1.00 },
    e:  { k: 'V', F: [540, 1990, 2700], B: [120, 120, 180], d: 90, amp: 0.95 },
    i:  { k: 'V', F: [330, 2350, 3050], B: [100, 120, 190], d: 80, amp: 0.85 },
    o:  { k: 'V', F: [540, 1000, 2600], B: [120, 120, 170], d: 92, amp: 0.95 },
    u:  { k: 'V', F: [360, 950, 2450], B: [100, 120, 170], d: 80, amp: 0.85 },
    '@': { k: 'V', F: [500, 1450, 2550], B: [130, 130, 180], d: 55, amp: 0.80 },
    w:  { k: 'G', F: [320, 760, 2300], B: [80, 110, 170], d: 55, amp: 0.66 },
    y:  { k: 'G', F: [290, 2250, 3000], B: [80, 110, 170], d: 55, amp: 0.62 },
    l:  { k: 'G', F: [390, 1450, 2800], B: [90, 120, 180], d: 62, amp: 0.62 },
    r:  { k: 'R', F: [450, 1400, 2150], B: [90, 120, 180], d: 50, amp: 0.60 },
    m:  { k: 'M', F: [270, 1050, 2200], B: [70, 150, 220], nz: 1100, d: 68, amp: 0.50 },
    n:  { k: 'M', F: [270, 1650, 2600], B: [70, 150, 220], nz: 1750, d: 62, amp: 0.50 },
    N:  { k: 'M', F: [270, 1900, 2500], B: [70, 150, 220], nz: 2400, d: 75, amp: 0.50 },
    s:  { k: 'F', fc: 6400, fb: 3000, af: 0.56, voiced: 0, d: 95 },
    z:  { k: 'F', fc: 6200, fb: 3000, af: 0.40, voiced: 1, d: 80 },
    S:  { k: 'F', fc: 3300, fb: 2000, af: 0.75, voiced: 0, d: 100 },
    f:  { k: 'F', fc: 4800, fb: 6000, af: 0.09, voiced: 0, d: 85 },
    v:  { k: 'F', fc: 4800, fb: 6000, af: 0.08, voiced: 1, d: 70 },
    h:  { k: 'H', d: 70 },
    p:  { k: 'P', voiced: 0, loc: [900, 2300], kk: 0.50, bc: 1500, bb: 3000, ba: 0.55, clo: 55, vot: 14 },
    b:  { k: 'P', voiced: 1, loc: [900, 2300], kk: 0.50, bc: 1500, bb: 3000, ba: 0.40, clo: 48, vot: 5 },
    t:  { k: 'P', voiced: 0, loc: [1700, 2900], kk: 0.40, bc: 4800, bb: 3200, ba: 0.70, clo: 50, vot: 16 },
    d:  { k: 'P', voiced: 1, loc: [1700, 2900], kk: 0.40, bc: 4500, bb: 3000, ba: 0.50, clo: 42, vot: 6 },
    k:  { k: 'P', voiced: 0, velar: 1, bc: 2200, bb: 2200, ba: 0.65, clo: 55, vot: 22 },
    g:  { k: 'P', voiced: 1, velar: 1, bc: 2000, bb: 2000, ba: 0.50, clo: 45, vot: 8 },
    tS: { k: 'A', voiced: 0, fc: 3600, fb: 2200, af: 0.66, clo: 40, d: 70 },
    dZ: { k: 'A', voiced: 1, fc: 3400, fb: 2200, af: 0.50, clo: 36, d: 60 }
  };

  /* ---------------- voice styles ---------------- */
  var STYLES = {
    normal:  { pitch: 1.00, range: 1.00, rate: 1.00, amp: 1.00, oq: 0.60, tilt: 3800, breath: 0.03, jitter: 0.004, vib: 0.000, vibHz: 5.5, voiced: 1, drop: 0 },
    excited: { pitch: 1.10, range: 1.55, rate: 1.14, amp: 1.10, oq: 0.55, tilt: 5600, breath: 0.02, jitter: 0.005, vib: 0.008, vibHz: 6.0, voiced: 1, drop: 0 },
    whisper: { pitch: 1.00, range: 0.00, rate: 0.95, amp: 0.55, oq: 0.60, tilt: 3800, breath: 0.00, jitter: 0.000, vib: 0.000, vibHz: 5.0, voiced: 0, drop: 0 },
    shout:   { pitch: 1.20, range: 1.30, rate: 0.96, amp: 1.35, oq: 0.46, tilt: 8000, breath: 0.01, jitter: 0.010, vib: 0.004, vibHz: 6.0, voiced: 1, drop: 0 },
    sob:     { pitch: 0.97, range: 1.25, rate: 0.80, amp: 0.80, oq: 0.74, tilt: 2300, breath: 0.12, jitter: 0.020, vib: 0.030, vibHz: 5.3, voiced: 1, drop: 0.07 },
    soft:    { pitch: 0.94, range: 0.80, rate: 0.90, amp: 0.78, oq: 0.70, tilt: 2600, breath: 0.07, jitter: 0.004, vib: 0.000, vibHz: 5.0, voiced: 1, drop: 0 }
  };

  var DEFAULTS = { pitch: 255, formant: 1.10, rate: 1.0, pauses: 1.0, style: 'normal', volume: 1.0, seed: 7, lead: 45 };

  /* ---------------- planning: phones -> timed segments -> parameter tracks ---------------- */
  function scaleF(F, fs) { return [F[0] * fs, F[1] * fs, F[2] * fs]; }
  function ref(T, i, fs) {                                                               /* formants of the nearest vowel (next first, else previous) */
    var j;
    for (j = i + 1; j < T.length && T[j].p !== '_'; j++) if (isVow(T[j].p)) return scaleF(PH[T[j].p].F, fs);
    for (j = i - 1; j >= 0 && T[j].p !== '_'; j--) if (isVow(T[j].p)) return scaleF(PH[T[j].p].F, fs);
    return scaleF(PH['@'].F, fs);
  }
  function locus(e, rf, fs) {
    var F;
    if (e.velar) { var f2 = clamp(rf[1] * 1.04, 1250 * fs, 2450 * fs); F = [260 * fs, f2, f2 + 480]; }
    else F = [260 * fs, (1 - e.kk) * e.loc[0] * fs + e.kk * rf[1], (1 - 0.3) * e.loc[1] * fs + 0.3 * rf[2]];
    return F;
  }

  function plan(text, opts) {
    opts = opts || {};
    var o = {}, k;
    for (k in DEFAULTS) o[k] = opts[k] !== undefined ? opts[k] : DEFAULTS[k];
    var st = STYLES[o.style] || STYLES.normal, fs = o.formant, rate = Math.max(0.4, o.rate * st.rate), crate = Math.pow(rate, 0.65);
    var base = o.pitch * st.pitch;
    var g = L.G2P.phonemize(text), T = g.tokens, i;

    /* phrases: runs of tokens between pauses; the final token tells how the phrase ends */
    var phrases = [], cur = { vs: [], first: -1, last: -1, end: '.' };
    for (i = 0; i < T.length; i++) {
      if (T[i].p === '_') { if (cur.first >= 0) { phrases.push(cur); cur = { vs: [], first: -1, last: -1, end: '.' }; } continue; }
      if (cur.first < 0) cur.first = i;
      cur.last = i; T[i].phr_i = phrases.length;
      if (isVow(T[i].p)) cur.vs.push(i);
    }
    if (cur.first >= 0) phrases.push(cur);
    phrases.forEach(function (ph) { var lt = T[ph.last]; ph.end = lt.end || (lt.phr ? ',' : '.'); });

    /* segments */
    var segs = [];
    function add(s) { segs.push(s); return s; }
    for (i = 0; i < T.length; i++) {
      var t = T[i], p = t.p, e = PH[p], phr = phrases[t.phr_i], amp = (t.caps ? 1.2 : 1) * (t.st ? 1 : 0.88), prev = T[i - 1], nxt = T[i + 1];
      if (p === '_') { add({ tk: i, ph: '_', k: 'pause', d: t.ms * o.pauses / Math.sqrt(rate) }); continue; }
      if (!e) continue;
      var consBefore = prev && prev.p !== '_' && !isVow(prev.p), d;
      if (e.k === 'V') {
        d = e.d * (t.st ? 1.22 : 1) * (t.lng || 1) * (t.caps ? 1.1 : 1);
        var fin = phr && phr.vs[phr.vs.length - 1] === i;
        if (fin) d *= phr.end === ',' ? 1.12 : 1.35;
        add({ tk: i, ph: p, k: 'V', d: d / rate, amp: amp, stress: t.st });
      } else if (e.k === 'G' || e.k === 'R') {
        d = e.d * (consBefore ? 0.9 : 1) / crate;
        add({ tk: i, ph: p, k: e.k, d: d, amp: amp });
      } else if (e.k === 'M') {
        d = e.d * (consBefore ? 0.88 : 1) * (t.lng || 1) / crate;
        add({ tk: i, ph: p, k: 'M', d: d, amp: amp });
      } else if (e.k === 'F') {
        d = e.d * (consBefore ? 0.9 : 1) * (t.lng || 1) / crate;
        add({ tk: i, ph: p, k: 'F', d: d, amp: amp });
      } else if (e.k === 'H') {
        var between = prev && isVow(prev.p) && nxt && isVow(nxt.p);
        d = e.d * (t.lng || 1) / crate;
        add({ tk: i, ph: p, k: 'H', d: d, amp: amp, voicedH: between });
      } else if (e.k === 'P') {
        var weak = !nxt || nxt.p === '_' || !isVow(nxt.p) ? 0.6 : 1;
        add({ tk: i, ph: p, k: 'clo', d: e.clo * (consBefore ? 0.85 : 1) / crate, amp: amp });
        add({ tk: i, ph: p, k: 'burst', d: 10, amp: amp * weak });
        add({ tk: i, ph: p, k: 'asp', d: e.vot / crate * (weak < 1 ? 0.6 : 1), amp: amp });
      } else if (e.k === 'A') {
        add({ tk: i, ph: p, k: 'clo', d: e.clo / crate, amp: amp });
        add({ tk: i, ph: p, k: 'fr', d: e.d / crate, amp: amp });
      }
    }

    if (segs.length && segs[segs.length - 1].k === 'pause') segs[segs.length - 1].d = Math.min(segs[segs.length - 1].d, 110);   /* no long silent tail */
    /* times (ms) */
    var tms = o.lead;
    segs.forEach(function (s) { s.t0 = tms; tms += s.d; s.t1 = tms; });
    var totalMs = tms + 60;

    /* frames: target parameter values of each segment */
    function frameOf(s) {
      var e = PH[s.ph], f = { F: null, B: [80, 110, 160], av: 0, af: 0, ah: 0, ab: 0, nm: 0, fc: 5000, fb: 3000, nz: 1500 }, rf, ix = s.tk;
      if (s.k === 'pause') { f.F = scaleF(PH['@'].F, fs); return f; }
      rf = ref(T, ix, fs);
      switch (s.k) {
        case 'V': case 'G': case 'R': f.F = scaleF(e.F, fs); f.B = e.B; f.av = e.amp * s.amp; f.ah = 0; break;
        case 'M': f.F = scaleF(e.F, fs); f.B = e.B; f.av = e.amp * s.amp; f.nm = 1; f.nz = e.nz * fs; break;
        case 'F': f.F = [380 * fs, 0.55 * 1500 * fs + 0.45 * rf[1], 2500 * fs]; f.av = e.voiced ? 0.30 * s.amp : 0; f.af = e.af * s.amp; f.fc = e.fc * (fs > 1 ? 1 + (fs - 1) * 0.5 : 1); f.fb = e.fb; break;
        case 'H': f.F = rf; f.ah = 0.07 * s.amp; f.av = s.voicedH ? 0.11 : 0; break;
        case 'clo': f.F = e.k === 'A' ? [300 * fs, 1700 * fs, 2700 * fs] : locus(e, rf, fs); f.av = e.voiced ? 0.08 : 0; break;
        case 'burst':
          f.F = locus(e, rf, fs); f.ab = e.ba * s.amp; f.av = e.voiced ? 0.15 : 0;
          f.fc = e.velar ? clamp(f.F[1] * 1.05, 1500, 3400) : e.bc * (fs > 1 ? 1 + (fs - 1) * 0.5 : 1); f.fb = e.bb; break;
        case 'asp': f.F = locus(e, rf, fs); f.ah = e.voiced ? 0.10 : 0.60 * s.amp; f.av = e.voiced ? 0.45 : 0; break;
        case 'fr': f.F = [330 * fs, 1700 * fs, 2700 * fs]; f.af = e.af * s.amp; f.av = e.voiced ? 0.28 : 0; f.fc = e.fc * (fs > 1 ? 1 + (fs - 1) * 0.5 : 1); f.fb = e.fb; break;
      }
      if (!f.F) f.F = scaleF(PH['@'].F, fs);
      return f;
    }
    var voc = function (s) { return s.k === 'V' || s.k === 'G' || s.k === 'R'; };
    var frames = segs.map(frameOf);
    for (i = 0; i < segs.length; i++) if (segs[i].k === 'pause') {                          /* a pause keeps the previous formants */
      frames[i].F = i ? frames[i - 1].F : scaleF(PH['@'].F, fs); frames[i].B = i ? frames[i - 1].B : [80, 110, 160];
    }

    function fwin(a, b) {                                                                  /* formant transition windows (ms): [inside a, inside b] */
      if (a.k === 'pause' || b.k === 'pause') return [0, 0];
      if (a.k === 'H' || b.k === 'H') return [6, 6];
      var va = voc(a), vb = voc(b);
      if (va && vb) return [26, 26];
      if (!va && vb) return [Math.min(8, a.d * 0.5), 38];
      if (va && !vb) return [32, Math.min(8, b.d * 0.5)];
      return [10, 10];
    }
    function awin(a, b) {                                                                  /* amplitude windows (ms) */
      if (a.k === 'pause') return [0, 12];
      if (b.k === 'pause') return [Math.min(24, a.d * 0.5), 0];
      var va = voc(a), vb = voc(b);
      if ((va && vb) || (a.k === 'M' && vb) || (va && b.k === 'M')) return [12, 12];
      if (a.k === 'H' || b.k === 'H') return [8, 8];
      if (a.k === 'asp' && vb) return [6, 8];
      return [4, 4];
    }
    function build(wf, keys) {
      var out = [], n = segs.length, ins = [], outs = [], s, j2;
      for (j2 = 0; j2 < n; j2++) { ins.push(0); outs.push(0); }
      for (j2 = 0; j2 < n - 1; j2++) {
        var w = wf(segs[j2], segs[j2 + 1]);
        outs[j2] = w[0]; ins[j2 + 1] = w[1];
      }
      for (j2 = 0; j2 < n; j2++) {
        s = segs[j2];
        var tot = ins[j2] + outs[j2], lim = s.d * 0.9;
        if (tot > lim) { var sc = lim / tot; ins[j2] *= sc; outs[j2] *= sc; }
        [s.t0 + ins[j2], s.t1 - outs[j2]].forEach(function (tt) { var kf = { t: tt / 1000 }; keys(kf, frames[j2], s); out.push(kf); });
      }
      return out;
    }
    var ftrack = build(fwin, function (kf, f) { kf.F1 = f.F[0]; kf.F2 = f.F[1]; kf.F3 = f.F[2]; kf.B1 = f.B[0]; kf.B2 = f.B[1]; kf.B3 = f.B[2]; });
    var atrack = build(awin, function (kf, f) { kf.av = f.av; kf.af = f.af; kf.ah = f.ah; kf.ab = f.ab; kf.nm = f.nm; kf.fc = f.fc; kf.fb = f.fb; kf.nz = f.nz; });
    /* glottal-stop-like dip between adjacent vowels (maaga, saan) and a flap dip inside r */
    var dips = [];
    for (i = 0; i < segs.length - 1; i++) {
      if (segs[i].k === 'V' && segs[i + 1].k === 'V') dips.push({ t: segs[i].t1 / 1000, k: 0.35 });
      if (segs[i].k === 'R') dips.push({ t: (segs[i].t0 + segs[i].d * 0.5) / 1000, k: 0.25 });
    }
    dips.forEach(function (dp) {
      var at = dp.t, a0 = null, a1 = null, q;
      for (q = 0; q < atrack.length; q++) { if (atrack[q].t <= at) a0 = q; else { a1 = q; break; } }
      if (a0 === null || a1 === null) return;
      var u = (at - atrack[a0].t) / Math.max(1e-6, atrack[a1].t - atrack[a0].t), kf = { t: at };
      ['av', 'af', 'ah', 'ab', 'nm', 'fc', 'fb', 'nz'].forEach(function (key) { kf[key] = atrack[a0][key] + (atrack[a1][key] - atrack[a0][key]) * u; });
      kf.av *= dp.k;
      var pre = { t: at - 0.008 }, post = { t: at + 0.008 };
      ['av', 'af', 'ah', 'ab', 'nm', 'fc', 'fb', 'nz'].forEach(function (key) {
        pre[key] = atrack[a0][key] + (atrack[a1][key] - atrack[a0][key]) * clamp((pre.t - atrack[a0].t) / Math.max(1e-6, atrack[a1].t - atrack[a0].t), 0, 1);
        post[key] = atrack[a0][key] + (atrack[a1][key] - atrack[a0][key]) * clamp((post.t - atrack[a0].t) / Math.max(1e-6, atrack[a1].t - atrack[a0].t), 0, 1);
      });
      if (pre.t > atrack[a0].t && post.t < atrack[a1].t) atrack.splice(a1, 0, pre, kf, post);
    });

    /* pitch contour (Hz) */
    var f0track = [], pm = function (m) { return 1 + (m - 1) * st.range; };
    function pushF0(tt, hz) { f0track.push({ t: tt / 1000, f0: hz }); }
    segs.forEach(function (s) {
      if (s.k !== 'V') return;
      var phr = phrases[T[s.tk].phr_i], n = phr.vs.length, idx = phr.vs.indexOf(s.tk), pr = n > 1 ? idx / (n - 1) : 0;
      var m = 1 + (0.5 - pr) * 0.16 + (idx === 0 ? 0.04 : 0);
      if (T[s.tk].caps) m *= 1.12;
      var m0 = m * (s.stress ? 0.98 : 0.995), m1 = m * (s.stress ? 1.07 : 0.97);
      if (idx === n - 1) {
        if (phr.end === '?') { m0 = m * 0.97; m1 = m * 1.32; }
        else if (phr.end === '!') { m0 = m * 1.08; m1 = m * 0.86; }
        else if (phr.end === ',') { m1 = m * 1.06; }
        else m1 = m * 0.80;
      }
      pushF0(s.t0, base * pm(m0)); pushF0(s.t1, base * pm(m1));
    });
    if (!f0track.length) pushF0(0, base);
    f0track.unshift({ t: 0, f0: f0track[0].f0 });
    if (st.drop) f0track.forEach(function (kf) { kf.f0 *= Math.max(0.6, 1 - st.drop * kf.t); });

    /* timeline per token, words */
    var tl = [], byTok = {};
    segs.forEach(function (s) {
      var q = byTok[s.tk];
      if (!q) { q = byTok[s.tk] = { tk: s.tk, ph: s.ph, t0: s.t0 / 1000, t1: s.t1 / 1000, w: T[s.tk].w, st: T[s.tk].st ? 1 : 0, k: s.k === 'clo' || s.k === 'burst' || s.k === 'asp' ? 'P' : s.k }; tl.push(q); }
      else q.t1 = s.t1 / 1000;
    });
    var words = g.words.map(function (w) {
      var a = byTok[w.first], b = byTok[w.last];
      return { text: w.text, start: w.start, end: w.end, t0: a ? a.t0 : 0, t1: b ? b.t1 : 0 };
    });

    return { sr: SR, text: text, opts: o, style: st, styleName: o.style, segs: segs, frames: frames, ftrack: ftrack, atrack: atrack, f0track: f0track,
      timeline: tl, words: words, tokens: T, duration: totalMs / 1000, phrases: phrases.length };
  }

  /* ---------------- rendering ---------------- */
  function Track(kfs, keys) {
    var idx = 0, n = kfs.length, v = {};
    keys.forEach(function (k) { v[k] = kfs.length ? kfs[0][k] : 0; });
    return {
      v: v,
      at: function (t) {
        if (!n) return v;
        var k, key;
        if (t <= kfs[0].t) { for (k = 0; k < keys.length; k++) v[keys[k]] = kfs[0][keys[k]]; return v; }
        while (idx < n - 1 && kfs[idx + 1].t <= t) idx++;
        var a = kfs[idx], b = kfs[Math.min(idx + 1, n - 1)], u = (b.t > a.t && t > a.t) ? Math.min(1, (t - a.t) / (b.t - a.t)) : 0;
        for (k = 0; k < keys.length; k++) { key = keys[k]; v[key] = a[key] + (b[key] - a[key]) * u; }
        return v;
      }
    };
  }

  var GAIN = { voice: 0.35, asp: 0.45, fric: 0.55, burst: 0.45, nasal: 0.50 };

  function render(pl) {
    var st = pl.style, o = pl.opts, n = Math.ceil((pl.duration + 0.05) * SR), out = new Float32Array(n);
    var rnd = rngMake(o.seed * 7919 + 17), rnd2 = rngMake(o.seed * 104729 + 3);
    var R = [new Res(), new Res(), new Res(), new Res(), new Res()], RNP = new Res(), RNZ = new Anti(), BPf = new BP();
    var ft = Track(pl.ftrack, ['F1', 'F2', 'F3', 'B1', 'B2', 'B3']);
    var at = Track(pl.atrack, ['av', 'af', 'ah', 'ab', 'nm', 'fc', 'fb', 'nz']);
    var p0 = Track(pl.f0track, ['f0']);
    var fs = o.formant, F4 = 3500 * fs, F5 = 4500 * fs, B4 = 260, B5 = 330;
    var oq = st.oq, tiltK = 1 - Math.exp(-TAU * st.tilt / SR), tl = 0, phase = 0, jit = 1, voiced = st.voiced;
    var dcx = 0, dcy = 0, BLOCK = 16, vol = o.volume * st.amp, nBlocks = Math.ceil(n / BLOCK), avB = new Float32Array(nBlocks);
    RNP.set(280 * fs, 90);
    R[3].set(F4, B4); R[4].set(F5, B5);
    for (var i = 0; i < n; i += BLOCK) {
      var t = i / SR, F = ft.at(t), A = at.at(t), f0 = p0.at(t).f0;
      R[0].set(F.F1, F.B1); R[1].set(F.F2, F.B2); R[2].set(F.F3, F.B3);
      var nm = clamp(A.nm, 0, 1);
      avB[i / BLOCK] = (A.af < 0.04 && A.ab < 0.04 && A.ah < 0.2 && A.av > 0.25) ? A.av : 0;     /* voiced sonorant frames feed the leveler */
      if (nm > 0.01) RNZ.set(A.nz, 120);
      if (A.af > 0.001 || A.ab > 0.001) BPf.set(A.fc, A.fb);
      var vib = st.vib ? 1 + st.vib * Math.sin(TAU * st.vibHz * t) : 1;
      var end = Math.min(n, i + BLOCK);
      for (var j = i; j < end; j++) {
        var dt = f0 * vib * jit / SR;
        phase += dt;
        if (phase >= 1) { phase -= 1; if (st.jitter) jit = 1 + st.jitter * rnd2(); }
        var open = phase < oq, x = phase / oq, gs = open ? (2 * x - 3 * x * x) : 0, tt = phase - oq;
        if (tt < 0) tt += 1;
        gs += 0.5 * blep(tt, dt);
        tl += tiltK * (gs - tl);
        var noise = rnd(), src;
        if (voiced) src = A.av * tl * GAIN.voice + (A.ah + A.av * st.breath) * noise * GAIN.asp * (open ? 1 : 0.4);
        else src = (A.av * 0.9 + A.ah) * noise * GAIN.asp;
        if (nm > 0.01) src = (1 - nm) * src + nm * RNZ.run(RNP.run(src)) * GAIN.nasal;
        var xv = R[4].run(R[3].run(R[2].run(R[1].run(R[0].run(src)))));
        var fr = 0;
        if (A.af > 0.001 || A.ab > 0.001) fr = BPf.run(noise) * (A.af * GAIN.fric + A.ab * GAIN.burst);
        var y = xv + fr;
        dcy = y - dcx + 0.995 * dcy; dcx = y;                                          /* DC block */
        out[j] = dcy * vol;
      }
    }
    /* leveler: harmonic-vs-formant alignment makes some syllables 6-10 dB louder than others. Pull every voiced
     * sonorant block towards the utterance's median level (gain limited to x0.5 .. x2, smoothed over ~25 ms). */
    var k, cs = new Float64Array(n + 1);
    for (k = 0; k < n; k++) cs[k + 1] = cs[k] + out[k] * out[k];
    var half = Math.round(0.010 * SR), ratios = [], rms = new Float32Array(nBlocks), b;
    for (b = 0; b < nBlocks; b++) {
      if (avB[b] > 0) {
        var c = b * BLOCK + BLOCK / 2, lo = Math.max(0, c - half), hi = Math.min(n, c + half);
        rms[b] = Math.sqrt((cs[hi] - cs[lo]) / Math.max(1, hi - lo));
        if (rms[b] > 1e-7) ratios.push(rms[b] / avB[b]);
      }
    }
    if (ratios.length > 3) {
      ratios.sort(function (x, y) { return x - y; });
      var refLvl = ratios[ratios.length >> 1], gS = 1, kS = 1 - Math.exp(-BLOCK / (0.025 * SR));
      for (b = 0; b < nBlocks; b++) {
        var want = (avB[b] > 0 && rms[b] > 1e-7) ? clamp(refLvl * avB[b] / rms[b], 0.5, 2.0) : 1;
        gS += kS * (want - gS);
        for (k = b * BLOCK; k < Math.min(n, (b + 1) * BLOCK); k++) out[k] *= gS;
      }
    }
    /* normalise, then a soft limiter so peaks never clip */
    var peak = 0;
    for (k = 0; k < n; k++) { var a = Math.abs(out[k]); if (a > peak) peak = a; }
    var norm = peak > 1e-9 ? 0.88 / peak : 1;
    for (k = 0; k < n; k++) { var v = out[k] * norm; out[k] = Math.tanh(v * 1.25) / Math.tanh(1.25); }
    var fade = Math.round(0.004 * SR);                                                  /* 4 ms edges */
    for (k = 0; k < fade && k < n; k++) { out[k] *= k / fade; out[n - 1 - k] *= k / fade; }
    return out;
  }

  function synth(text, opts) {
    var pl = plan(text, opts), pcm = render(pl);
    return { pcm: pcm, sampleRate: SR, duration: pcm.length / SR, plan: pl, timeline: pl.timeline, words: pl.words };
  }

  /* Hand-built plan for sound effects (giggle, scream, sob ...). Rows are keyframes, times in seconds:
   *   spec = { duration, style, styleOverride, opts, f0: [[t, hz]], F: [[t, F1, F2, F3, B1, B2, B3]], A: [[t, av, ah, af, ab, nasal, fc, fb, nz]] } */
  function custom(spec) {
    var o = {}, st = {}, k, base = STYLES[spec.style] || STYLES.normal;
    for (k in DEFAULTS) o[k] = spec.opts && spec.opts[k] !== undefined ? spec.opts[k] : DEFAULTS[k];
    for (k in base) st[k] = base[k];
    if (spec.styleOverride) for (k in spec.styleOverride) st[k] = spec.styleOverride[k];
    return {
      sr: SR, text: '', opts: o, style: st, styleName: spec.style || 'normal', segs: [], frames: [], timeline: [], words: [], tokens: [], phrases: 0, duration: spec.duration,
      f0track: spec.f0.map(function (r) { return { t: r[0], f0: r[1] }; }),
      ftrack: spec.F.map(function (r) { return { t: r[0], F1: r[1], F2: r[2], F3: r[3], B1: r[4] || 100, B2: r[5] || 120, B3: r[6] || 170 }; }),
      atrack: spec.A.map(function (r) { return { t: r[0], av: r[1] || 0, ah: r[2] || 0, af: r[3] || 0, ab: r[4] || 0, nm: r[5] || 0, fc: r[6] || 4000, fb: r[7] || 3000, nz: r[8] || 1500 }; })
    };
  }

  L.LeonSynth = { SAMPLE_RATE: SR, PHONES: PH, STYLES: STYLES, DEFAULTS: DEFAULTS, plan: plan, render: render, synth: synth,
    custom: custom, renderCustom: function (spec) { return render(custom(spec)); },
    dsp: { Res: Res, Anti: Anti, BP: BP, rng: rngMake, blep: blep } };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
