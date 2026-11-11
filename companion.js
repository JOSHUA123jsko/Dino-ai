/* Leon Offline — companion.js
 * The one-call facade: brain + avatar + voice + stage wired together. This is what your app talks to.
 *
 *   var leon = Leon.Companion.create({
 *     container: document.getElementById('leon'),   // the avatar is drawn here (SVG, no image files needed)
 *     bubble:    document.getElementById('bubble'), // optional: text bubble element (typewriter + .action class)
 *     config:    { region: 'PH', profanity: 'on' }, // see Leon.Brain.DEFAULTS
 *     voice:     { engine: 'auto' }                 // see voice.js
 *   });
 *   leon.unlock();            // from the first tap / click (browsers keep audio locked until then)
 *   leon.start();             // greeting
 *   leon.say('kumusta');      // what the person typed or said
 *   leon.poke(); leon.mute(); leon.unmute(); leon.quiet();
 *   leon.on('beat', function (beat) { ... });  // also: user, reply, start, beatEnd, idle, cancel, mute
 *
 * Idle behaviour (boredom, dozing off) runs by itself: a 1-second timer asks the brain, and pauses while the page is hidden.
 * Nothing here uses the network. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var C = L.Companion = {};

  function reducedMotion() { try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }

  /* types text into an element; returns a cancel function. cps = characters per second */
  C.typeInto = function (el, text, cps) {
    var i = 0, id = null, n = text.length, step;
    if (!el) return function () {};
    if (!cps || reducedMotion() || n < 4) { el.textContent = text; return function () {}; }
    el.textContent = '';
    step = Math.max(1, Math.round(cps / 30));
    id = setInterval(function () { i = Math.min(n, i + step); el.textContent = text.slice(0, i); if (i >= n) { clearInterval(id); id = null; } }, 33);
    return function () { if (id) { clearInterval(id); id = null; } el.textContent = text; };
  };

  C.create = function (opts) {
    opts = opts || {};
    var storage = opts.storage || L.Util.makeStorage(opts.storagePrefix || 'leon:');
    var brain = opts.brainInstance || new L.Brain({ config: opts.config, storage: storage, now: opts.now });
    var ownAvatar = !opts.avatarInstance && !!opts.container && !!L.Avatar;
    var avatar = opts.avatarInstance || (ownAvatar ? L.Avatar.create(opts.container, opts.avatar || {}) : null);
    var voice = opts.voiceInstance || L.Voice.create(opts.voice || {});
    var stage = new L.Stage({ avatar: avatar, voice: voice, gestureSfx: opts.gestureSfx, readMsPerChar: opts.readMsPerChar, readMinMs: opts.readMinMs, gapMs: opts.gapMs });
    var handlers = {}, bubble = opts.bubble || null, cancelType = null, tickId = null, destroyed = false, self = {};

    function emit(ev, a, b) {
      (handlers[ev] || []).slice().forEach(function (fn) { try { fn(a, b); } catch (e) { if (root.console) root.console.error('[Leon] handler error in "' + ev + '":', e); } });
    }
    self.on = function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return self; };
    self.off = function (ev, fn) { if (!fn) delete handlers[ev]; else handlers[ev] = (handlers[ev] || []).filter(function (f) { return f !== fn; }); return self; };

    /* stage events -> bubble + public events */
    stage.on('beat', function (b, info) {
      if (bubble) {
        if (cancelType) cancelType();
        bubble.classList.toggle('action', !!b.action);
        bubble.classList.add('show');
        bubble.setAttribute('data-expr', b.expr || '');
        cancelType = C.typeInto(bubble, String(b.text || ''), opts.typeCps === undefined ? 60 : opts.typeCps);
      }
      emit('beat', b, info);
    });
    stage.on('beatEnd', function (b) { emit('beatEnd', b); });
    stage.on('start', function (r) { emit('start', r); });
    stage.on('idle', function (r) {
      brain.touch();                                        /* boredom counts from the end of his last line */
      emit('idle', r);
      if (bubble && opts.fadeBubble !== false) { var tok = stage.token; setTimeout(function () { if (stage.token === tok && !stage.running) bubble.classList.remove('show'); }, 4200); }
    });
    stage.on('cancel', function () { emit('cancel'); });
    stage.on('error', function (e) { if (root.console) root.console.error('[Leon] stage error', e); emit('error', e); });
    stage.start();

    function play(reply, o) { if (!reply) return Promise.resolve(null); emit('reply', reply); return stage.play(reply, o).then(function () { return reply; }); }

    self.brain = brain; self.avatar = avatar; self.voice = voice; self.stage = stage; self.storage = storage;
    self.unlock = function () { return voice.unlock(); };
    self.start = function () { return play(brain.start()); };
    self.say = function (text) {
      text = String(text === undefined || text === null ? '' : text).trim();
      if (!text) return Promise.resolve(null);
      emit('user', text);
      return play(brain.respond(text));
    };
    self.poke = function () { return play(brain.poke()); };
    self.wake = function () { return play(brain.wake()); };
    self.quiet = function () { stage.cancel(true); return play(brain.requestQuiet()); };
    self.mute = function () {
      if (voice.isMuted()) return Promise.resolve(null);
      voice.setMuted(true); emit('mute', true);
      return play(brain.onMute());
    };
    self.unmute = function () {
      if (!voice.isMuted()) return Promise.resolve(null);
      voice.setMuted(false); emit('mute', false);
      return play(brain.onUnmute());
    };
    self.toggleMute = function () { return voice.isMuted() ? self.unmute() : self.mute(); };
    self.isMuted = function () { return voice.isMuted(); };
    self.setConfig = function (partial) { return brain.setConfig(partial); };
    self.setVoice = function (partial) { voice.setOptions(partial); return voice.info(); };
    self.resetMemory = function () { brain.resetMemory(); };
    self.snapshot = function () { return brain.snapshot(); };
    /* say something in his own voice without going through the brain (e.g. a notification text) */
    self.speak = function (text, o) { o = o || {}; return play([{ text: text, voice: text, expr: o.expr || 'happy', gesture: o.gesture, style: o.style, sfx: o.sfx }]); };
    self.setExpression = function (name) { if (avatar) avatar.setExpression(name); };
    self.stopTalking = function () { stage.cancel(); };

    /* idle life: boredom / dozing. Skips while he is mid-sentence or the page is hidden. */
    if (opts.idle !== false) {
      tickId = setInterval(function () {
        if (destroyed) return;
        if (root.document && root.document.hidden && !opts.tickWhenHidden) return;
        if (stage.running) return;
        var r = brain.tick(opts.now ? opts.now() : Date.now());
        if (r) play(r, { interrupt: false });
      }, opts.tickMs || 1000);
    }

    self.destroy = function () {
      destroyed = true; if (tickId) clearInterval(tickId);
      stage.cancel(true); stage.stop(); if (cancelType) cancelType();
      if (ownAvatar && avatar) avatar.destroy();
      if (L.host === host) L.host = null;
    };

    /* hooks for a native shell (Android overlay etc.): Leon.host.say('...'), Leon.host.mute() ... */
    var host = { say: self.say, poke: self.poke, wake: self.wake, mute: self.mute, unmute: self.unmute, toggleMute: self.toggleMute, quiet: self.quiet,
      speak: self.speak, setConfig: self.setConfig, setVoice: self.setVoice, unlock: self.unlock, start: self.start, stopTalking: self.stopTalking,
      snapshot: self.snapshot, companion: self };
    if (opts.host !== false) L.host = host;
    return self;
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
