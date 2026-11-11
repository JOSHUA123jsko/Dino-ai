/* Leon Offline — voice.js
 * One object that makes Leon talk. It chooses the sound source, keeps the mouth in sync, and knows about mute.
 *
 *   engines   'device'  the phone's own offline text-to-speech (Android bridge window.LeonNative, or Web Speech API).
 *                       Natural speech; quality and Filipino support depend on the voices installed on the phone.
 *             'leon'    Leon's own built-in voice (LeonSynth formant synthesizer). Always available, fully offline,
 *                       cute and a little robotic.
 *             'auto'    device voice when the phone has one, otherwise Leon's own voice.
 *             'off'     no sound at all (Leon still moves his mouth).
 *             any name you register with registerEngine() (e.g. a Piper or Sherpa-ONNX model you bundle yourself).
 *
 *   var voice = Leon.Voice.create({ engine: 'auto' });
 *   voice.unlock();                                    // once, from a tap / click (browsers block audio before that)
 *   voice.speak({ voice: 'Hello po, yarn!', style: 'excited' }).then(function (r) { ... });
 *   every frame: var m = voice.mouth();  avatar.setMouth(m.v, m.open);
 *   voice.sfx('giggle');  voice.setMuted(true);  voice.stop();
 *
 * A "beat" (see engine/brain.js) maps like this:  silent -> no sound, no lips   |   speak:false -> only sfx, no words
 *   mouth:true -> lips move with no sound (mute drama)   |   style: normal excited whisper shout sob soft
 * No network. Works in a browser, an Android WebView or (with mocks) Node. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var V = L.Voice = {};

  var DEFAULTS = {
    engine: 'auto',
    rate: 1, pitch: 1, volume: 1,           /* user preferences, 1 = default */
    sfx: true,
    lang: 'fil-PH', voiceName: '',          /* device voice preference */
    leon: { pitch: 255, formant: 1.10 }     /* LeonSynth tuning: base pitch in Hz, vocal-tract scale */
  };
  /* how a style maps onto a plain text-to-speech engine (they cannot whisper or sob, so this is an approximation) */
  var DEVICE_STYLE = {
    normal: { rate: 1.00, pitch: 1.25, volume: 1.00 }, excited: { rate: 1.14, pitch: 1.50, volume: 1.00 },
    whisper: { rate: 0.92, pitch: 1.10, volume: 0.35 }, shout: { rate: 1.00, pitch: 1.50, volume: 1.00 },
    sob: { rate: 0.80, pitch: 1.05, volume: 0.60 }, soft: { rate: 0.92, pitch: 1.15, volume: 0.70 }
  };
  var REST = { v: 'X', open: 0, active: false, ph: '' };

  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function wall() { return (root.performance && root.performance.now ? root.performance.now() : Date.now()) / 1000; }
  function LP() { return L.Lipsync; }
  function hasNative() { return !!(root.LeonNative && typeof root.LeonNative.speak === 'function'); }
  function hasWebSpeech() { return !!(root.speechSynthesis && typeof root.SpeechSynthesisUtterance === 'function'); }
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; if (b) for (k in b) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') ? merge(a[k], b[k]) : b[k]; return o; }

  V._instances = [];
  /* Android calls this (via evaluateJavascript) with the text-to-speech progress: type = start | done | error | range */
  V.nativeEvent = function (type, id, a, b) { V._instances.forEach(function (v) { v._nativeEvent(type, String(id), a, b); }); };
  V.availability = function () { return { native: hasNative(), webSpeech: hasWebSpeech(), leon: !!(L.LeonSynth && L.G2P), webAudio: !!(root.AudioContext || root.webkitAudioContext) }; };

  function Voice(opts) {
    this.o = merge(DEFAULTS, opts);
    this.muted = false; this.token = 0; this.cur = null; this.ctx = null; this.master = null;
    this.player = new (LP().Player)(); this.sfxPlayer = new (LP().Player)(); this._clock = 'wall'; this._sfxClock = 'wall';
    this.engines = {}; this._voices = []; this._nativeId = 0; this._nativeCur = null; this._utt = null; this._sfxEnd = 0;
    V._instances.push(this);
    this._loadVoices();
  }
  V.create = function (opts) { return new Voice(opts); };

  /* ---------- setup ---------- */
  Voice.prototype._loadVoices = function () {
    var self = this, ss = root.speechSynthesis;
    if (!ss || !ss.getVoices) return;
    function grab() { try { self._voices = ss.getVoices() || []; } catch (e) { self._voices = []; } }
    grab();
    if (ss.addEventListener) ss.addEventListener('voiceschanged', grab); else ss.onvoiceschanged = grab;
  };
  Voice.prototype._audio = function () {
    if (this.ctx && this.ctx.state !== 'closed') return this.ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try { this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 1; this.master.connect(this.ctx.destination); } catch (e) { this.ctx = null; }
    return this.ctx;
  };
  /* call once from a tap or click: browsers keep audio and speech locked until the user does something */
  Voice.prototype.unlock = function () {
    var ctx = this._audio();
    try {
      if (ctx) {
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
        var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
      }
      if (hasWebSpeech() && !hasNative()) { var u = new root.SpeechSynthesisUtterance(' '); u.volume = 0; root.speechSynthesis.speak(u); }
    } catch (e) { /* not fatal */ }
    return !!ctx;
  };
  Voice.prototype.registerEngine = function (name, fn) { this.engines[name] = fn; return this; };
  Voice.prototype.setOptions = function (o) { this.o = merge(this.o, o); return this; };
  Voice.prototype.setMuted = function (m) { m = !!m; if (m && !this.muted) { this.stop(); } this.muted = m; return this; };
  Voice.prototype.isMuted = function () { return this.muted; };
  Voice.prototype.speaking = function () { return !!this.cur; };

  Voice.prototype.engineName = function () {
    var e = this.o.engine;
    if (e === 'off') return 'off';
    if (this.engines[e]) return e;
    var leonOk = !!(L.LeonSynth && L.G2P), dev = hasNative() || (hasWebSpeech() && this._voices.length > 0);
    if (e === 'leon') return leonOk ? 'leon' : (dev ? 'device' : 'off');
    if (e === 'device') return (hasNative() || hasWebSpeech()) ? 'device' : (leonOk ? 'leon' : 'off');
    return dev ? 'device' : (leonOk ? 'leon' : 'off');                       /* auto */
  };
  Voice.prototype.info = function () {
    var a = V.availability();
    return { requested: this.o.engine, active: this.engineName(), native: a.native, webSpeech: a.webSpeech, leon: a.leon, webAudio: a.webAudio, voices: this._voices.length, muted: this.muted, custom: Object.keys(this.engines) };
  };
  Voice.prototype.listVoices = function () {
    return this._voices.map(function (v) { return { name: v.name, lang: v.lang, local: !!v.localService, isDefault: !!v.default }; })
      .sort(function (a, b) { var fa = /^(fil|tl)/i.test(a.lang) ? 0 : (/^en-PH/i.test(a.lang) ? 1 : 2), fb = /^(fil|tl)/i.test(b.lang) ? 0 : (/^en-PH/i.test(b.lang) ? 1 : 2); return fa - fb || a.name.localeCompare(b.name); });
  };
  Voice.prototype._pickVoice = function () {
    var vs = this._voices, want = this.o.voiceName, i, pref = [String(this.o.lang || 'fil-PH').toLowerCase(), 'fil', 'tl', 'en-ph', 'en-us', 'en'];
    if (!vs.length) return null;
    if (want) for (i = 0; i < vs.length; i++) if (vs[i].name === want || vs[i].voiceURI === want) return vs[i];
    for (var p = 0; p < pref.length; p++) {
      var cand = vs.filter(function (v) { return String(v.lang).toLowerCase().replace('_', '-').indexOf(pref[p]) === 0; });
      if (cand.length) { var local = cand.filter(function (v) { return v.localService; }); return (local.length ? local : cand)[0]; }   /* prefer voices that work offline */
    }
    return vs[0];
  };

  /* ---------- speaking ---------- */
  Voice.prototype.speak = function (beat) {
    beat = typeof beat === 'string' ? { text: beat } : (beat || {});
    var self = this, engine = this.engineName();
    var raw = beat.voice !== undefined && beat.voice !== null ? beat.voice : beat.text;
    var text = String(raw || '').replace(/\s+/g, ' ').trim(), style = beat.style || 'normal';
    if (!text || beat.speak === false) return Promise.resolve({ ok: true, engine: 'none' });
    var sound = !this.muted && engine !== 'off' && !beat.silent;
    var mouthOnly = !sound && (beat.mouth || (engine === 'off' && !this.muted && !beat.silent));
    if (!sound && !mouthOnly) return Promise.resolve({ ok: true, engine: 'none' });
    var tok = ++this.token;
    this._cancel('interrupted');

    return new Promise(function (resolve) {
      var ended = false, cleanups = [];
      var cur = self.cur = { tok: tok, resolve: resolve, cleanup: function () { cleanups.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); } };
      function finish(res) {
        if (ended) return; ended = true;
        if (self.cur === cur) { self.cur = null; self.player.stop(); }
        cur.cleanup(); res = res || {}; if (res.ok === undefined) res.ok = true; resolve(res);
      }
      cur.finish = finish;
      cur.addCleanup = function (f) { cleanups.push(f); };
      try {
        if (mouthOnly) self._mouthing(text, style, cur, finish);
        else if (engine === 'device') self._speakDevice(text, style, cur, finish);
        else if (engine === 'leon') self._speakLeon(text, style, cur, finish);
        else if (self.engines[engine]) self._speakCustom(engine, text, style, cur, finish);
        else self._mouthing(text, style, cur, finish);
      } catch (e) { finish({ ok: false, error: String(e && e.message || e) }); }
    });
  };
  Voice.prototype._cancel = function (why) {
    var c = this.cur; this.cur = null;
    if (c) { this.player.stop(); try { c.cleanup(); } catch (e) { /* ignore */ } c.resolve({ ok: false, cancelled: true, why: why }); }
  };
  Voice.prototype.stop = function () {
    this.token++;
    this._cancel('stopped');
    this._stopSfx();
    try { if (hasWebSpeech()) root.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    try { if (hasNative() && root.LeonNative.stopSpeaking) root.LeonNative.stopSpeaking(); } catch (e) { /* ignore */ }
    this._nativeCur = null;
  };

  /* lips only: wall clock, no sound */
  Voice.prototype._mouthing = function (text, style, cur, finish) {
    var est = LP().estimate(text, { rate: this.o.rate, style: style }), t0 = wall();
    this._clock = 'wall';
    this.player.start(est.keys, t0, { scale: 1, words: est.words });
    var tm = setTimeout(function () { finish({ engine: 'mouth', duration: est.duration }); }, Math.round(est.duration * 1000) + 40);
    cur.addCleanup(function () { clearTimeout(tm); });
  };

  /* Leon's own voice */
  Voice.prototype._speakLeon = function (text, style, cur, finish) {
    var lv = this.o.leon, r = L.LeonSynth.synth(text, { style: style, pitch: lv.pitch * this.o.pitch, formant: lv.formant, rate: this.o.rate });
    this._playPcm(r.pcm, r.sampleRate, clamp(this.o.volume, 0, 1.5), LP().fromTimeline(r.timeline), cur, finish, 'leon');
  };
  /* a plugged-in engine: fn(text, {style, rate, pitch, lang}) -> {pcm: Float32Array, sampleRate} (or a Promise of it) */
  Voice.prototype._speakCustom = function (name, text, style, cur, finish) {
    var self = this, tok = cur.tok;
    Promise.resolve(this.engines[name](text, { style: style, rate: this.o.rate, pitch: this.o.pitch, lang: this.o.lang })).then(function (r) {
      if (self.token !== tok || self.cur !== cur) return;
      if (!r || !r.pcm) { finish({ ok: false, engine: name, error: 'engine returned no audio' }); return; }
      var dur = r.pcm.length / r.sampleRate, est = LP().estimate(text, { rate: 1, style: style }), sc = dur / Math.max(0.2, est.duration);
      var keys = est.keys.map(function (k) { return { t0: k.t0 * sc, t1: k.t1 * sc, v: k.v, open: k.open, ph: k.ph }; });
      self._playPcm(r.pcm, r.sampleRate, clamp(self.o.volume, 0, 1.5), keys, cur, finish, name);
    }, function (e) { finish({ ok: false, engine: name, error: String(e && e.message || e) }); });
  };
  Voice.prototype._playPcm = function (pcm, sr, vol, keys, cur, finish, engine) {
    var ctx = this._audio(), dur = pcm.length / sr;
    if (!ctx) {                                                              /* no WebAudio (tests, very old WebView): lips only */
      this._clock = 'wall'; this.player.start(keys, wall(), { scale: 1 });
      var tm0 = setTimeout(function () { finish({ engine: engine, duration: dur, silent: true }); }, Math.round(dur * 1000) + 40);
      cur.addCleanup(function () { clearTimeout(tm0); });
      return;
    }
    if (ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (e) { /* ignore */ } }
    var buf = ctx.createBuffer(1, pcm.length, sr);
    if (buf.copyToChannel) buf.copyToChannel(pcm, 0); else buf.getChannelData(0).set(pcm);
    var src = ctx.createBufferSource(), g = ctx.createGain(), startAt = ctx.currentTime + 0.04;
    src.buffer = buf; g.gain.value = vol; src.connect(g); g.connect(this.master);
    src.onended = function () { finish({ engine: engine, duration: dur }); };
    this._clock = 'audio'; this.player.start(keys, startAt, { scale: 1 });
    src.start(startAt);
    cur.addCleanup(function () { src.onended = null; try { src.stop(); } catch (e) { /* already stopped */ } try { g.disconnect(); } catch (e2) { /* ignore */ } });
    var wd = setTimeout(function () { finish({ ok: false, engine: engine, duration: dur, error: 'audio never started (locked?)' }); }, Math.round((dur + 2.5) * 1000));
    cur.addCleanup(function () { clearTimeout(wd); });
  };

  /* the phone's text-to-speech */
  Voice.prototype._deviceParams = function (style) {
    var d = DEVICE_STYLE[style] || DEVICE_STYLE.normal;
    return { rate: clamp(d.rate * this.o.rate, 0.5, 2.0), pitch: clamp(d.pitch * this.o.pitch, 0.1, 2.0), volume: clamp(d.volume * this.o.volume, 0, 1) };
  };
  Voice.prototype._speakDevice = function (text, style, cur, finish) {
    var self = this, P = this._deviceParams(style), est = LP().estimate(text, { rate: 1, style: style });
    var expected = LP().expectedSeconds(text, P.rate), scale = expected / Math.max(0.2, est.duration);
    this._clock = 'wall';
    this.player.start(est.keys, wall(), { scale: scale, endless: true, words: est.words });
    cur.est = est;
    var wd = setTimeout(function () { finish({ ok: false, engine: 'device', error: 'speech never finished' }); }, Math.round((expected * 2.5 + 3) * 1000));
    cur.addCleanup(function () { clearTimeout(wd); });
    var spoke = false;
    function done(ok) { spoke = true; finish({ ok: ok, engine: 'device', duration: expected }); }
    cur.addCleanup(function () {                                               /* cancelled before it finished: silence the engine */
      if (spoke) return;
      try { if (hasNative()) { if (root.LeonNative.stopSpeaking) root.LeonNative.stopSpeaking(); } else if (hasWebSpeech()) root.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    });
    if (hasNative()) {
      var id = String(++this._nativeId);
      this._nativeCur = { id: id, cur: cur, done: done };
      cur.addCleanup(function () { if (self._nativeCur && self._nativeCur.id === id) self._nativeCur = null; });
      var lang = this._pickLangForNative();
      root.LeonNative.speak(id, text, P.rate, P.pitch, P.volume, lang);
      return;
    }
    var ss = root.speechSynthesis, u = new root.SpeechSynthesisUtterance(text), v = this._pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = this.o.lang;
    u.rate = P.rate; u.pitch = P.pitch; u.volume = P.volume;
    u.onboundary = function (e) { if (!e || (e.name && e.name !== 'word')) return; self._onChar(cur, e.charIndex); };
    u.onend = function () { done(true); };
    u.onerror = function (e) { done(!!(e && (e.error === 'canceled' || e.error === 'interrupted'))); };
    this._utt = u;                                                           /* keep a reference: some engines drop events from collected utterances */
    cur.addCleanup(function () { if (self._utt === u) { u.onend = null; u.onerror = null; u.onboundary = null; } });
    try { ss.cancel(); } catch (e0) { /* ignore */ }
    ss.speak(u);
  };
  Voice.prototype._pickLangForNative = function () { return this.o.lang || 'fil-PH'; };
  Voice.prototype._onChar = function (cur, ci) {
    if (!cur || this.cur !== cur || !cur.est) return;
    var ws = cur.est.words, wi = -1, i;
    for (i = 0; i < ws.length; i++) { if (ws[i].start <= ci) wi = i; else break; }
    if (wi >= 0) this.player.anchorWord(wi, wall());
  };
  Voice.prototype._nativeEvent = function (type, id, a, b) {
    var nc = this._nativeCur;
    if (!nc || nc.id !== id) return;
    if (type === 'range') this._onChar(nc.cur, +a);
    else if (type === 'done') nc.done(true);
    else if (type === 'error') nc.done(false);
  };

  /* ---------- sound effects ---------- */
  Voice.prototype.sfx = function (name, o) {
    o = o || {};
    var self = this;
    if (this.muted || this.engineName() === 'off' || this.o.sfx === false || !L.Sfx) return Promise.resolve({ ok: false, skipped: true });
    var s = L.Sfx.make(name);
    if (!s) return Promise.resolve({ ok: false, error: 'unknown sfx' });
    var ctx = this._audio(), vol = clamp((o.volume === undefined ? 1 : o.volume) * s.gain * this.o.volume, 0, 1.5);
    if (!ctx) {
      if (s.keys && !this.cur) { this._sfxClock = 'wall'; this.sfxPlayer.start(s.keys, wall(), { scale: 1 }); }
      return new Promise(function (res) { setTimeout(function () { self.sfxPlayer.stop(); res({ ok: true, silent: true }); }, Math.round(s.duration * 1000)); });
    }
    if (ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (e) { /* ignore */ } }
    return new Promise(function (resolve) {
      var buf = ctx.createBuffer(1, s.pcm.length, s.sampleRate);
      if (buf.copyToChannel) buf.copyToChannel(s.pcm, 0); else buf.getChannelData(0).set(s.pcm);
      var src = ctx.createBufferSource(), g = ctx.createGain(), at = ctx.currentTime + 0.02;
      src.buffer = buf; g.gain.value = vol; src.connect(g); g.connect(self.master);
      var tm = setTimeout(end, Math.round((s.duration + 1.5) * 1000)), done = false;
      function end() { if (done) return; done = true; clearTimeout(tm); if (self._sfxCur === rec) { self._sfxCur = null; self.sfxPlayer.stop(); } resolve({ ok: true, duration: s.duration }); }
      var rec = { src: src, g: g, end: end };
      self._stopSfx(); self._sfxCur = rec;                                      /* replace any effect that is still playing */
      if (s.keys && !self.cur) { self._sfxClock = 'audio'; self.sfxPlayer.start(s.keys, at, { scale: 1 }); }
      src.onended = end; src.start(at);
    });
  };
  Voice.prototype._stopSfx = function () {
    var r = this._sfxCur; this._sfxCur = null; this.sfxPlayer.stop();
    if (r) { try { r.src.onended = null; r.src.stop(); } catch (e) { /* ignore */ } try { r.g.disconnect(); } catch (e2) { /* ignore */ } try { r.end(); } catch (e3) { /* ignore */ } }
  };

  /* ---------- per frame ---------- */
  Voice.prototype.mouth = function () {
    var m;
    if (this.player.keys) {
      m = this.player.mouth(this._clock === 'audio' && this.ctx ? this.ctx.currentTime : wall());
      if (m.active || m.open > 0.05) return m;
    }
    if (this.sfxPlayer.keys) {
      m = this.sfxPlayer.mouth(this._sfxClock === 'audio' && this.ctx ? this.ctx.currentTime : wall());
      if (m.active || m.open > 0.05) return m;
    }
    return REST;
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
