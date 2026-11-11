/* Leon Offline — lipsync.js
 * Turns a phone timeline into mouth shapes for the avatar (visemes X M A E I O U F L S, see avatar/face.js).
 *   LeonSynth voice  : exact timeline from the synthesizer, played against the audio clock.
 *   Device TTS voice : an estimated timeline (same planner, no samples), stretched to the expected length and
 *                      re-aligned whenever the engine reports a word boundary.
 *   Muted ("mouthing") : the same estimate, played on the wall clock with no sound at all.
 *
 *   var keys = Leon.Lipsync.fromTimeline(synth.timeline);
 *   var player = new Leon.Lipsync.Player();  player.start(keys, now);
 *   every frame:  var m = player.mouth(now);  avatar.setMouth(m.v, m.open);   // m.v === 'X' means "rest"
 * No DOM, no network. Times are seconds. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var LP = L.Lipsync = {};

  var VOWEL = { a: ['A', 1.18], e: ['E', 0.92], i: ['I', 0.62], o: ['O', 0.98], u: ['U', 0.62], '@': ['E', 0.58] };
  var LIPS = { p: ['M', 0.15], b: ['M', 0.15], m: ['M', 0.15], f: ['F', 0.45], v: ['F', 0.45], w: ['U', 0.55] };
  var TEETH = { s: ['S', 0.42], z: ['S', 0.42], S: ['S', 0.5], tS: ['S', 0.5], dZ: ['S', 0.5] };
  var TONGUE = { l: ['L', 0.62] };

  /* timeline entries are {ph, t0, t1, st, w, k}; returns [{t0, t1, v, open, ph}] with rests as v:'X' */
  LP.fromTimeline = function (tl) {
    var keys = [], i, j, e, o, m;
    function vowelNear(i0, dir, limit) {
      for (var q = i0 + dir, n = 0; q >= 0 && q < tl.length && n < 4; q += dir, n++) {
        var x = tl[q];
        if (x.ph === '_') return null;
        if (Math.abs(x.t0 - tl[i0].t0) > limit) return null;
        if (VOWEL[x.ph]) return VOWEL[x.ph];
      }
      return null;
    }
    for (i = 0; i < tl.length; i++) {
      e = tl[i];
      if (e.ph === '_') { keys.push({ t0: e.t0, t1: e.t1, v: 'X', open: 0, ph: '_' }); continue; }
      if (VOWEL[e.ph]) {
        m = VOWEL[e.ph]; o = m[1] * (e.st ? 1.12 : 0.94);
        keys.push({ t0: e.t0, t1: e.t1, v: m[0], open: Math.min(1.4, o), ph: e.ph });
      } else if (LIPS[e.ph]) {
        m = LIPS[e.ph]; var dur = e.t1 - e.t0;
        if (m[0] === 'M' && dur > 0.03) {                                          /* closed through the closure, then open for the release */
          keys.push({ t0: e.t0, t1: e.t0 + dur * 0.72, v: 'M', open: 0.1, ph: e.ph });
          var nv = vowelNear(i, 1, 0.2) || vowelNear(i, -1, 0.2) || ['E', 0.5];
          keys.push({ t0: e.t0 + dur * 0.72, t1: e.t1, v: nv[0], open: nv[1] * 0.5, ph: e.ph });
        } else keys.push({ t0: e.t0, t1: e.t1, v: m[0], open: m[1], ph: e.ph });
      } else if (TEETH[e.ph]) {
        m = TEETH[e.ph]; keys.push({ t0: e.t0, t1: e.t1, v: m[0], open: m[1], ph: e.ph });
      } else if (TONGUE[e.ph]) {
        m = TONGUE[e.ph]; keys.push({ t0: e.t0, t1: e.t1, v: m[0], open: m[1], ph: e.ph });
      } else {                                                                      /* tongue / throat sounds (t d n r k g N h y) and anything unknown: lips keep the vowel's shape */
        m = vowelNear(i, 1, 0.22) || vowelNear(i, -1, 0.22) || ['E', 0.55];
        keys.push({ t0: e.t0, t1: e.t1, v: m[0], open: Math.max(0.3, m[1] * 0.55), ph: e.ph });
      }
    }
    /* very short non-lip keys (taps, bursts) are folded into their neighbour so the mouth does not flicker */
    var out = [];
    for (j = 0; j < keys.length; j++) {
      var k = keys[j], prev = out[out.length - 1];
      if (prev && k.t1 - k.t0 < 0.03 && k.v !== 'M' && prev.v !== 'X' && k.v !== 'X') { prev.t1 = k.t1; continue; }
      out.push(k);
    }
    return out;
  };

  /* binary search; returns the key covering t, or null (silence before / after) */
  LP.keyAt = function (keys, t) {
    var lo = 0, hi = keys.length - 1, mid;
    if (!keys.length || t < keys[0].t0 || t > keys[hi].t1) return null;
    while (lo <= hi) {
      mid = (lo + hi) >> 1;
      if (t < keys[mid].t0) hi = mid - 1; else if (t >= keys[mid].t1) lo = mid + 1; else return keys[mid];
    }
    return keys[Math.min(Math.max(lo, 0), keys.length - 1)];
  };

  /* generic talking motion for when the real timing is unknown */
  var FLAP = [['A', 1.0], ['E', 0.75], ['O', 0.9], ['E', 0.6], ['A', 1.1], ['I', 0.55], ['U', 0.6], ['E', 0.8]];
  LP.flap = function (t, out) {
    var ph = t * 4.6, idx = Math.floor(ph), f = ph - idx, sh = FLAP[((idx % FLAP.length) + FLAP.length) % FLAP.length];
    var pulse = Math.sin(Math.PI * Math.min(1, f * 1.15));
    out.v = pulse < 0.12 ? 'M' : sh[0]; out.open = Math.max(0.12, sh[1] * pulse); return out;
  };

  /* Estimate a timeline for text we cannot synthesize here (device TTS, or muted mouthing).
   * Uses the LeonSynth planner when it is loaded (no samples are rendered), else a crude vowel-group estimate. */
  LP.estimate = function (text, opts) {
    opts = opts || {};
    var tl, words = [], dur;
    if (L.LeonSynth && L.LeonSynth.plan) {
      var pl = L.LeonSynth.plan(text, { rate: opts.rate || 1, style: opts.style || 'normal' });
      tl = pl.timeline; words = pl.words; dur = pl.duration;
    } else {
      tl = []; dur = 0.05;
      var syl = String(text).toLowerCase().match(/[aeiouáéíóú]+|[^aeiouáéíóú\s]+|\s+/g) || [];
      syl.forEach(function (s) {
        var isV = /^[aeiou]/.test(s), d = /^\s/.test(s) ? 0.06 : (isV ? 0.11 : 0.06) * s.length;
        tl.push({ ph: /^\s/.test(s) ? '_' : (isV ? s.charAt(0) : s.charAt(0)), t0: dur, t1: dur + d, st: 1, w: 0, k: isV ? 'V' : 'C' }); dur += d;
      });
    }
    return { keys: LP.fromTimeline(tl), words: words, duration: dur, timeline: tl };
  };

  /* Expected speaking time (seconds) of the device TTS for `text` at its rate setting: ~13.5 characters per second. */
  LP.expectedSeconds = function (text, rate) {
    var n = String(text || '').replace(/\s+/g, ' ').trim().length;
    return Math.max(0.35, n / 13.5 / Math.max(0.4, rate || 1)) + 0.12;
  };

  /* ------------- Player ------------- */
  function Player() { this.out = { v: 'X', open: 0, active: false, ph: '' }; this.keys = null; this.cur = 0; this.last = 0; this.endless = false; this.scale = 1; this.sT = 0; this.nT = 0; this.words = []; this._lastB = null; }
  LP.Player = Player;

  /* keys: from fromTimeline; now: wall/audio clock in seconds; opts.scale: wall seconds per speech second; opts.endless: keep flapping past the end */
  Player.prototype.start = function (keys, now, opts) {
    opts = opts || {};
    this.keys = keys || []; this.scale = opts.scale > 0 ? opts.scale : 1; this.endless = !!opts.endless; this.words = opts.words || [];
    this.sT = 0; this.nT = now; this.last = now; this.cur = 0; this._lastB = null; this.out.active = true;
    this.end = this.keys.length ? this.keys[this.keys.length - 1].t1 : 0;
  };
  Player.prototype.stop = function () { this.keys = null; this.out.v = 'X'; this.out.open = 0; this.out.active = false; this.cur = 0; };
  Player.prototype.speechTime = function (now) { return this.sT + (now - this.nT) / this.scale; };
  /* the engine says: speech time `sT` is happening now. Adapts the playback speed from consecutive anchors. */
  Player.prototype.anchor = function (sT, now) {
    if (this._lastB && sT > this._lastB.s + 0.15 && now > this._lastB.n) {
      var sc = (now - this._lastB.n) / (sT - this._lastB.s);
      if (sc > 0.4 && sc < 2.5) this.scale = this.scale * 0.5 + sc * 0.5;
    }
    this._lastB = { s: sT, n: now };
    this.sT = sT; this.nT = now;
  };
  /* word index (from words[]) -> speech time of its start */
  Player.prototype.anchorWord = function (wi, now) {
    var w = this.words[wi]; if (!w) return;
    this.anchor(w.t0, now);
  };
  Player.prototype.finishing = function () { this.endless = false; };

  Player.prototype.mouth = function (now) {
    var o = this.out;
    if (!this.keys) { o.v = 'X'; o.open = 0; o.active = false; return o; }
    var ts = this.speechTime(now), dt = Math.max(0, Math.min(0.1, now - this.last)); this.last = now;
    var tv = 'X', to = 0, k, tmp;
    if (ts < 0) { tv = 'X'; to = 0; }
    else if (ts > this.end + 0.04) {
      if (this.endless) { tmp = LP.flap(now, { v: 'X', open: 0 }); tv = tmp.v; to = tmp.open; }
      else { o.active = false; }
    } else {
      k = LP.keyAt(this.keys, ts);
      if (k) { tv = k.v; to = k.open; }
    }
    var tau = to > o.open ? 0.035 : 0.065, a = 1 - Math.exp(-dt / tau);
    o.open += (to - o.open) * (dt ? a : 1);
    o.v = (tv === 'X' && o.open > 0.2) ? (o.lastV || 'E') : tv;                   /* keep the last shape while the lips close */
    if (tv !== 'X') o.lastV = tv;
    if (tv === 'X' && o.open < 0.12) { o.v = 'X'; o.open = 0; }
    o.ph = k ? k.ph : '';
    return o;
  };

  LP.VOWEL = VOWEL;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
