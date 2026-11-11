/* Leon Offline — stage.js
 * The beat player. The brain returns "beats"; the stage performs them in order:
 *   wait (beat.delay) -> face (expr) -> body (gesture) -> sound effect (sfx) -> speech + lip-sync -> reading pause (hold)
 * It has no DOM of its own: it drives an avatar (Leon.Avatar controller) and a voice (Leon.Voice) and tells the UI what
 * is happening through events, so it can be tested in Node and reused in the overlay.
 *
 *   var stage = new Leon.Stage({ avatar: avatar, voice: voice });
 *   stage.on('beat', function (beat, info) { showBubble(beat.text, beat.action); });
 *   stage.play(brain.respond('kumusta'));        // returns a Promise; a new play() interrupts the old one
 *   stage.start();                               // starts the per-frame mouth sync (rAF)
 *
 * events: start(reply)  beat(beat, info)  beatEnd(beat)  idle(reply)  cancel()  error(err) */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};

  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }

  function Stage(opts) {
    opts = opts || {};
    this.avatar = opts.avatar || null;
    this.voice = opts.voice || null;
    this.gestureSfx = opts.gestureSfx !== false;     /* quiet automatic sounds for gestures (whoosh, boing, thud) */
    this.readMsPerChar = opts.readMsPerChar === undefined ? 48 : opts.readMsPerChar;   /* how long a line stays up when nothing is spoken */
    this.readMinMs = opts.readMinMs === undefined ? 800 : opts.readMinMs; this.readMaxMs = opts.readMaxMs || 5000;
    this.gapMs = opts.gapMs === undefined ? 220 : opts.gapMs;
    this.token = 0; this.running = false; this.current = null;
    this._waiters = []; this.h = {}; this._mouthOn = false; this._loop = null; this._lastGestureSfx = 0;
  }
  L.Stage = Stage;

  Stage.prototype.on = function (ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return this; };
  Stage.prototype.off = function (ev, fn) { var a = this.h[ev]; if (!a) return this; if (!fn) delete this.h[ev]; else this.h[ev] = a.filter(function (f) { return f !== fn; }); return this; };
  Stage.prototype._emit = function (ev, a, b) {
    var a2 = this.h[ev]; if (!a2) return;
    a2.slice().forEach(function (fn) { try { fn(a, b); } catch (e) { if (root.console) root.console.error('[Leon.Stage] handler error in "' + ev + '":', e); } });
  };

  Stage.prototype.busy = function () { return this.running; };

  /* reply: the object returned by brain.respond()/tick()/poke() ... or just an array of beats */
  Stage.prototype.play = function (reply, o) {
    o = o || {};
    var beats = Array.isArray(reply) ? reply : ((reply && reply.beats) || []);
    if (!beats.length) return Promise.resolve({ completed: true, empty: true, played: 0 });
    if (this.running && o.interrupt === false) return Promise.resolve({ completed: false, dropped: true, played: 0 });
    this.cancel(true);
    var self = this, tok = ++this.token;
    this.running = true;
    this._emit('start', reply);
    return this._run(beats, tok).then(function (res) {
      if (self.token === tok) { self.running = false; self.current = null; self._emit('idle', reply); }
      return res;
    });
  };

  Stage.prototype._run = function (beats, tok) {
    var self = this, i = 0;
    return new Promise(function (resolve) {
      function next() {
        if (self.token !== tok) { resolve({ completed: false, cancelled: true, played: i }); return; }
        if (i >= beats.length) { resolve({ completed: true, played: i }); return; }
        var b = beats[i++], idx = i - 1;
        self._wait(b.delay || 0).then(function () {
          if (self.token !== tok) return null;
          return self._beat(b, tok, idx, beats.length);
        }).then(next, function (e) { self._emit('error', e); next(); });
      }
      next();
    });
  };

  Stage.prototype._wait = function (ms) {
    var self = this;
    return new Promise(function (resolve) {
      if (!(ms > 0)) { resolve(); return; }
      var rec = { resolve: resolve, id: null };
      rec.id = setTimeout(function () { self._waiters = self._waiters.filter(function (r) { return r !== rec; }); resolve(); }, ms);
      self._waiters.push(rec);
    });
  };
  Stage.prototype._clearWaits = function () {
    var w = this._waiters; this._waiters = [];
    w.forEach(function (r) { clearTimeout(r.id); r.resolve(); });             /* resolve now so the chain notices the cancel */
  };

  Stage.prototype._beat = function (b, tok, idx, count) {
    var self = this, av = this.avatar, vo = this.voice, t0 = Date.now(), text = String(b.text || '');
    this.current = b;
    if (av) {
      if (b.expr) { try { av.setExpression(b.expr); } catch (e) { /* unknown expression: keep the current face */ } }
      if (b.gesture) { try { av.gesture(b.gesture); } catch (e2) { /* ignore */ } }
    }
    var readMs = clamp(text.length * this.readMsPerChar, this.readMinMs, this.readMaxMs) + (b.hold || 0);
    var wantsWords = !!b.voice && b.speak !== false;
    this._emit('beat', b, { index: idx, count: count, readMs: readMs, speaks: wantsWords && !b.silent });

    var sfxName = b.sfx || null, sfxDur = 0, chain = Promise.resolve();
    if (!sfxName && b.gesture && this.gestureSfx && L.Sfx && Date.now() - this._lastGestureSfx > 1200) {
      var gs = L.Sfx.forGesture(b.gesture);
      if (gs && vo && !vo.isMuted()) { this._lastGestureSfx = Date.now(); try { vo.sfx(gs, { volume: 0.5 }); } catch (e3) { /* ignore */ } }
    }
    if (sfxName && vo) {
      var made = L.Sfx && L.Sfx.make(sfxName);
      sfxDur = made ? made.duration : 0;
      var sp = vo.sfx(sfxName);
      if (!wantsWords || b.silent) chain = sp.then(function () { return null; });                       /* the effect IS the line (scream, sniffle) */
      else chain = self._wait(Math.min(sfxDur * 700, 900));                                             /* start talking while the giggle fades */
    }
    return chain.then(function () {
      if (self.token !== tok) return null;
      return vo ? vo.speak(b) : null;
    }).then(function (res) {
      if (self.token !== tok) return null;
      var sounded = res && res.engine && res.engine !== 'none' && res.engine !== 'mouth' && res.ok !== false;
      var elapsed = Date.now() - t0, extra = sounded ? self.gapMs + (b.hold || 0) : Math.max(0, readMs - elapsed);
      return self._wait(extra);
    }).then(function () {
      if (self.token === tok) self._emit('beatEnd', b);
      return null;
    });
  };

  Stage.prototype.cancel = function (quiet) {
    var was = this.running;
    this.token++; this.running = false; this.current = null;
    this._clearWaits();
    if (this.voice) { try { this.voice.stop(); } catch (e) { /* ignore */ } }
    if (this.avatar) { try { this.avatar.setMouth('X'); this.avatar.setSpeaking(0); } catch (e2) { /* ignore */ } }
    this._mouthOn = false;
    if (was && !quiet) this._emit('cancel');
  };

  /* mouth sync: call once per animation frame (start() does this for you) */
  Stage.prototype.frame = function () {
    var vo = this.voice, av = this.avatar;
    if (!vo || !av) return;
    var m = vo.mouth();
    if (m.v !== 'X' || m.active) { av.setMouth(m.v, m.open); av.setSpeaking(Math.min(1, m.open / 1.2)); this._mouthOn = true; }
    else if (this._mouthOn) { av.setMouth('X'); av.setSpeaking(0); this._mouthOn = false; }
  };
  Stage.prototype.start = function () {
    if (this._loop) return this;
    var self = this, raf = root.requestAnimationFrame;
    this._loop = { stop: false };
    var rec = this._loop;
    (function tick() {
      if (rec.stop) return;
      self.frame();
      rec.id = raf ? raf.call(root, tick) : setTimeout(tick, 16);
    })();
    return this;
  };
  Stage.prototype.stop = function () {
    if (this._loop) { this._loop.stop = true; if (this._loop.id && root.cancelAnimationFrame) root.cancelAnimationFrame(this._loop.id); }
    this._loop = null; return this;
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
