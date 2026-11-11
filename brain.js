/* Leon Offline — brain.js
 * Leon's dialogue manager. Everything runs on the device: no API, no network.
 *
 *   var brain = new Leon.Brain({ config: {...}, storage: Leon.Util.makeStorage() });
 *   var reply = brain.respond('pagod ako');      // { intent, beats:[...], mood:{...} }
 *   var idle  = brain.tick();                    // call about once a second: boredom, sleep
 *   brain.onMute(); brain.onUnmute();            // the mute-button emotional emergency
 *
 * A "beat" is one thing Leon does:  { text, voice, expr, gesture, sfx, style, delay, hold, silent, action }
 * The UI (src/ui/stage.js) plays beats in order: face, body gesture, sound, speech, lip-sync.  */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var U = L.Util, P = L.Persona, S = L.Safety, N = L.NLU, C = L.Calc;

  var DEFAULTS = {
    region: 'PH',            // picks crisis resources in Leon.Safety.resources
    profanity: 'on',         // 'on' | 'off'  (off = kid-safe: putragis & co become "hay naku")
    honorific: 'auto',       // 'auto' | 'always' | 'never'   (po / opo)
    call: 'auto',            // 'auto' | 'kuya' | 'ate' | 'boss' | 'bes' | 'pare' | 'sir' | "ma'am"
    yarn: 'normal',          // 'low' | 'normal' | 'high'
    boredom: 'casual',       // 'off' | 'demo' | 'casual' | 'chill'
    sleepHours: [22, 6],     // Leon dozes off when you are idle in these hours; null = never
    muteDrama: 'full',       // 'full' | 'short' | 'off'
    maxScreams: 2,           // boredom screams per session
    askQuestions: true,      // Leon may ask (politely) where you are from, favourite food...
    seed: null               // number = deterministic (tests)
  };

  /* seconds of idle time before boredom stage 1..5 */
  var BOREDOM = {
    off: null,
    demo: [25, 50, 75, 100, 125],
    casual: [120, 240, 360, 480, 600],
    chill: [300, 600, 900, 1200, 1500]
  };

  var DAYS = ['Linggo', 'Lunes', 'Martes', 'Miyerkules', 'Huwebes', 'Biyernes', 'Sabado'];
  var MONTHS = ['Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo', 'Hulyo', 'Agosto', 'Setyembre', 'Oktubre', 'Nobyembre', 'Disyembre'];

  function lines() { return L.Data.lines; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function Brain(opts) {
    opts = opts || {};
    this.cfg = U.deepMerge(DEFAULTS, opts.config || {});
    this.rng = U.makeRng(this.cfg.seed);
    this.storage = opts.storage || U.makeStorage('leon:');
    this._now = opts.now || function () { return Date.now(); };
    this.state = this._load();
    var t = this._now();
    this.session = {
      startedAt: t, lastInteraction: t, boredStage: 0, muted: false, quiet: false, asleep: false,
      muteShownAt: 0, muteShows: 0, screams: 0, pending: null, lastContent: null, recent: {},
      longReplies: 0, pokes: 0, lastPokeAt: 0, turnsSinceAsk: 0, seriousTurns: 0, gentleTurns: 0,
      crisis: false, crisisTurns: 0, usedPo: false, autoCall: null, lastBoredAt: t
    };
    this._curseCount = 0;
    this._curseMax = 1;
  }

  /* ---------------- persistence ---------------- */
  Brain.prototype._fresh = function () {
    return {
      v: 1,
      profile: { name: null, call: null, hometown: null, food: null, job: null, stress: null, stressAt: 0, usedPo: false, lastSeen: 0, sessions: 0 },
      mood: { trust: 10 },
      flags: { introduced: false, noAsk: {} },
      counters: { turns: 0, jokes: 0, mutes: 0, screams: 0 }
    };
  };
  Brain.prototype._load = function () {
    var s = this.storage.get('state');
    return (s && s.v === 1) ? U.deepMerge(this._fresh(), s) : this._fresh();
  };
  Brain.prototype._save = function () { this.storage.set('state', this.state); };
  Brain.prototype.resetMemory = function () { this.state = this._fresh(); this._save(); };
  Brain.prototype.setConfig = function (partial) { this.cfg = U.deepMerge(this.cfg, partial || {}); return this.cfg; };
  Brain.prototype.snapshot = function () {
    return { cfg: this.cfg, state: U.clone(this.state), session: { boredStage: this.session.boredStage, muted: this.session.muted, quiet: this.session.quiet, asleep: this.session.asleep, serious: this.session.seriousTurns, gentle: this.session.gentleTurns, crisis: this.session.crisis, pending: this.session.pending } };
  };

  /* ---------------- modes ---------------- */
  Brain.prototype.isSerious = function () { return this.session.seriousTurns > 0 || this.session.crisis; };
  Brain.prototype.isGentle = function () { return this.session.gentleTurns > 0 || this.isSerious(); };
  Brain.prototype._isSleepHour = function (h) {
    var sh = this.cfg.sleepHours;
    if (!sh || sh.length < 2) return false;
    return sh[0] > sh[1] ? (h >= sh[0] || h < sh[1]) : (h >= sh[0] && h < sh[1]);
  };
  Brain.prototype._trust = function (d) { this.state.mood.trust = U.clamp(this.state.mood.trust + d, 0, 100); };

  /* ---------------- beat + reply builders ---------------- */
  Brain.prototype._begin = function () { this._curseCount = 0; this._curseMax = 1; };

  Brain.prototype._b = function (text, expr, o) {
    o = o || {};
    var raw = o.raw ? String(text) : P.fmt(this, text, o.vars);
    var shown = o.noYarn || o.action ? (o.noYarn ? P._stripYarn(raw) : raw) : P.finish(this, raw, o);
    var beat = { text: shown, expr: expr || 'happy' };
    if (!/yarn/i.test(raw) && /yarn/i.test(shown)) beat._auto = true;      /* yarn we added (not authored): may be thinned later */
    ['gesture', 'sfx', 'style', 'delay', 'hold', 'silent', 'mouth', 'fx'].forEach(function (k) { if (o[k] !== undefined) beat[k] = o[k]; });
    if (o.action) beat.action = true;
    beat.voice = (o.action || o.speak === false) ? '' : P.voiceText(shown);
    return beat;
  };

  Brain.prototype._reply = function (beats, intent, extra) {
    /* a reply made of several beats does not need "yarn" on every middle beat */
    var self = this, last = beats.length - 1;
    beats.forEach(function (bt, i) {
      if (bt._auto && i > 0 && i < last && U.chance(0.5, self.rng)) { bt.text = P._stripYarn(bt.text); if (bt.voice) bt.voice = P.voiceText(bt.text); }
      delete bt._auto;
    });
    var r = {
      intent: intent, beats: beats,
      mood: { serious: this.isSerious(), gentle: this.isGentle(), trust: this.state.mood.trust, quiet: this.session.quiet, muted: this.session.muted }
    };
    if (extra) for (var k in extra) r[k] = extra[k];
    this._save();
    return r;
  };

  Brain.prototype._say = function (key, bank, extra, opts) { return P.say(this, key, bank, extra, opts); };

  /* ---------------- startup greeting ---------------- */
  Brain.prototype._greetBeats = function () {
    var now = this._now(), h = new Date(now).getHours(), part = U.dayPart(h), G = lines().greet, st = this.state, key, pool;
    if (!st.flags.introduced) { key = 'first'; pool = G.first; st.flags.introduced = true; }
    else if (st.profile.name && U.chance(0.6, this.rng)) { key = 'returning'; pool = G.returning; }
    else { key = part; pool = G[part]; }
    var beats = [this._b(this._say('greet.' + key, pool), part === 'night' ? 'sleepy' : 'cheerful', { gesture: 'wave' })];
    if (st.profile.stress && now - st.profile.stressAt < 36 * 3600 * 1000 && !this.isSerious()) {
      beats.push(this._b(this._say('greet.stress', G.stress), 'thinking', { delay: 1400 }));
      st.profile.stress = null;
    }
    return beats;
  };

  Brain.prototype.start = function () {
    this._begin();
    var now = this._now();
    this.state.profile.sessions++;
    var beats = this._greetBeats();
    this.state.profile.lastSeen = now;
    this.session.lastInteraction = now;
    return this._reply(beats, 'start');
  };

  /* ---------------- the main entry: a message from the person ---------------- */
  Brain.prototype.respond = function (text) {
    this._begin();
    var s = this.session, st = this.state, now = this._now();
    var raw = String(text == null ? '' : text).trim();
    if (s.seriousTurns > 0) s.seriousTurns--;
    if (s.gentleTurns > 0) s.gentleTurns--;
    s.lastInteraction = now; s.boredStage = 0; s.turnsSinceAsk++;
    st.counters.turns++;
    this._trust(1);

    if (!raw) return this._reply([this._b("Uy, wala kang sinabi. Okay lang, tahimik din ako minsan. Charot, hindi, yarn.", 'confused', { gesture: 'shrug' })], 'empty');
    var norm = U.normalize(raw);

    /* 1. read the room: safety before everything else */
    var sa = S.assess(raw);
    if (sa.level > 0) return this._safetyReply(sa.level);
    if (s.crisis) return this._crisisFollowup(norm);

    /* 2. learn tiny facts (name, hometown, favourite food, job, "po") */
    var ex = N.extract(raw);
    if (ex.usedPo) { s.usedPo = true; st.profile.usedPo = true; }
    var learned = this._learn(ex);

    var prefix = [];
    if (s.asleep) { s.asleep = false; prefix.push(this._b(this._say('sleepy.wake', lines().sleepy.wake), 'surprised', { gesture: 'hop' })); }

    /* 3. real silence request is always honoured */
    if (N.wantsQuiet(norm)) return this.requestQuiet({ real: N.quietIsReal(norm) });
    if (s.quiet) { s.quiet = false; prefix.push(this._b(lines().quiet.wake, 'shy', { style: 'whisper', gesture: 'wave' })); }

    /* 4. answer to a question Leon asked earlier */
    if (s.pending) {
      var pr = this._pending(raw, norm, ex);
      if (pr) { if (prefix.length) pr.beats = prefix.concat(pr.beats); return pr; }
    }

    /* 5. rule-based skills: calculator, clock */
    var calc = C.parse(raw);
    if (calc) return this._withPrefix(prefix, this._reply(this._calcBeats(calc), 'calc'));
    if (/\b(what time|anong oras|ano na oras|oras na ba|what is the time|what date|what day|anong araw|ano ang petsa|date today|petsa ngayon|what is today)\b/.test(norm)) {
      return this._withPrefix(prefix, this._reply(this._timeBeats(norm), 'time'));
    }

    /* 6. understand + answer */
    var it = N.intent(raw), label = it.label;
    if (N.isLaugh(raw, norm)) label = 'laugh';
    else if (s.pending === null && (N.isYes(norm) || N.isNo(norm)) && label !== 'yes' && label !== 'no') label = N.isYes(norm) ? 'yes' : 'no';

    if (learned.name || learned.call) {
      if (label === 'unknown' || label === 'greeting' || label === 'yes') {
        var nb = learned.name ? this._say('name_set', lines().name_set) : this._say('call_set', lines().call_set);
        return this._withPrefix(prefix, this._reply([this._b(nb, 'happy', { gesture: 'wave' })], 'learn'));
      }
    }
    if ((learned.hometown || learned.food || learned.job) && (label === 'unknown' || label === 'greeting')) {
      var k = learned.hometown ? 'hometown' : (learned.food ? 'food' : 'job');
      return this._withPrefix(prefix, this._reply([this._b(this._say('ask.reflect.' + k, lines().ask.reflect[k]), 'cheerful', { gesture: 'nod' })], 'learn'));
    }

    var isQ = N.isQuestion(raw, norm), kb = null;
    if (label === 'science_question' || label === 'unknown' || isQ) kb = N.kb(raw, label === 'science_question' ? N.cfg.kbFromIntent : N.cfg.kbMin);
    var beats, intent = label;
    if (kb && (label === 'science_question' || label === 'unknown' || kb.score >= 0.6)) {
      beats = this._scienceBeats(kb.entry); intent = 'science';
    } else {
      var fn = this['_h_' + label];
      beats = fn ? fn.call(this, { raw: raw, norm: norm, ex: ex, it: it, isQ: isQ }) : this._h_unknown({ raw: raw, norm: norm, isQ: isQ });
    }
    var reply = Array.isArray(beats) ? this._reply(beats, intent, { confidence: it.score }) : beats;
    this._decorate(reply, label);
    return this._withPrefix(prefix, reply);
  };

  Brain.prototype._withPrefix = function (prefix, reply) {
    if (prefix && prefix.length) reply.beats = prefix.concat(reply.beats);
    return reply;
  };

  /* small extras that make Leon feel like a person: self-correction, polite curiosity */
  Brain.prototype._decorate = function (reply, label) {
    var s = this.session, L2 = lines();
    if (this.isGentle() || s.pending || reply.intent === 'quiet') return;
    var chars = reply.beats.reduce(function (n, b) { return n + (b.text || '').length; }, 0);
    if (chars > 230 || (++s.longReplies % 6 === 0 && U.chance(0.5, this.rng))) {
      if (U.chance(0.55, this.rng)) reply.beats.push(this._b(this._say('self_correct', L2.self_correct), 'embarrassed', { delay: 1600, gesture: 'shrug' }));
    }
    var chatty = { greeting: 1, how_are_you: 1, thanks: 1, laugh: 1, user_bored: 1, compliment: 1, joke_request: 1, quote_request: 1, fact_request: 1 };
    var lastBeat = reply.beats[reply.beats.length - 1];
    var endsWithQuestion = lastBeat && /\?\s*$/.test(lastBeat.text || '');
    if (this.cfg.askQuestions && chatty[label] && s.turnsSinceAsk >= 6 && !endsWithQuestion) {
      var p = this.state.profile, topics = ['hometown', 'food', 'job'].filter(function (t) { return !p[t] && !this.state.flags.noAsk[t]; }, this);
      if (topics.length) {
        var topic = U.pick(topics, this.rng);
        s.pending = { type: 'ask_permission', topic: topic };
        s.turnsSinceAsk = 0;
        reply.beats.push(this._b(this._say('ask.permission', L2.ask.permission), 'shy', { delay: 1800 }));
      }
    }
  };

  Brain.prototype._learn = function (ex) {
    var p = this.state.profile, got = {};
    ['name', 'call', 'hometown', 'food', 'job'].forEach(function (k) { if (ex[k] && p[k] !== ex[k]) { p[k] = ex[k]; got[k] = true; } });
    if (ex.stress) { p.stress = ex.stress; p.stressAt = this._now(); }
    return got;
  };

  /* ---------------- safety ---------------- */
  Brain.prototype._safetyReply = function (level) {
    var s = this.session, self = this;
    s.seriousTurns = 6; s.pending = null; s.boredStage = 0;
    if (level >= 2) { s.crisis = true; s.crisisTurns = 0; }
    var beats = S.script(level, this.cfg, this.rng).map(function (d) {
      return self._b(d.text, d.expr, { raw: true, noYarn: true, style: d.style, delay: d.delay });
    });
    return this._reply(beats, level >= 2 ? 'crisis' : 'crisis_soft', { safety: level });
  };

  Brain.prototype._crisisFollowup = function (norm) {
    var s = this.session, beats = [];
    s.crisisTurns++;
    var better = /\b(salamat|thanks|thank you|okay na|ok na|mas okay na|ayos na|gumaan)\b/.test(norm);
    if (better) {
      s.crisis = false;
      beats.push(this._b("Salamat sa pagkwento. Natutuwa akong gumaan kahit konti. Nandito pa rin ako, at kung bumigat ulit, abutin mo ang taong pinagkakatiwalaan mo o ang hotline.", 'sad', { raw: true, noYarn: true, style: 'soft' }));
    } else {
      beats.push(this._b(S.followups[(s.crisisTurns - 1) % S.followups.length], 'sad', { raw: true, noYarn: true, style: 'soft' }));
      if (s.crisisTurns % 2 === 0) beats.push(this._b(S.resourceLine(this.cfg) + '.', 'hurt', { raw: true, noYarn: true, style: 'soft', delay: 800 }));
    }
    if (s.crisisTurns >= 10) s.crisis = false;
    s.seriousTurns = Math.max(s.seriousTurns, 3);
    return this._reply(beats, 'crisis_followup');
  };

  /* ---------------- pending questions ---------------- */
  Brain.prototype._pending = function (raw, norm, ex) {
    var s = this.session, st = this.state, p = s.pending, yes = N.isYes(norm), no = N.isNo(norm), L2 = lines();
    function clear() { s.pending = null; }
    switch (p.type) {
      case 'comfort_or_explain': {
        clear();
        var comfort = /\b(comfort|alaga|yakap|makinig|listen|kwento|vent)\b/.test(norm);
        var explain = /\b(explain|explanation|tips?|advice|solusyon|solution|solve|ayusin|paano)\b/.test(norm);
        if (/\b(salamat|thanks|thank you|okay na|ok na|ayos na)\b/.test(norm)) { s.seriousTurns = Math.min(s.seriousTurns, 1); return null; }
        if (no) return this._reply([this._b("Sige. Nandito lang ako.", 'sad', { noYarn: true, style: 'soft' })], 'sad_idle');
        if (/\b(joke|patawa|tawa)\b/.test(norm)) { s.seriousTurns = 0; s.gentleTurns = 2; return this._reply(this._jokeBeats(null), 'joke_request'); }
        if (explain && !comfort) return this._reply(this._seqBeats(this._say('sad.explain', L2.sad.explain), 'thinking', { noYarn: true, style: 'soft' }), 'sad_explain');
        if (comfort || yes) return this._reply(this._seqBeats(this._say('sad.comfort', L2.sad.comfort), 'sad', { noYarn: true, style: 'soft' }), 'sad_comfort');
        return this._reply([this._b(this._say('sad.story', L2.sad.story), 'sad', { noYarn: true, style: 'soft' })], 'sad_story');
      }
      case 'ask_permission': {
        if (yes) { s.pending = { type: 'ask_value', topic: p.topic }; return this._reply([this._b(this._say('ask.q.' + p.topic, L2.ask.q[p.topic]), 'thinking', { gesture: 'nod' })], 'ask'); }
        if (no) { clear(); st.flags.noAsk[p.topic] = true; return this._reply([this._b(this._say('ask.permission_no', L2.ask.permission_no), 'shy')], 'ask_no'); }
        clear(); return null;
      }
      case 'ask_value': {
        clear();
        if (no) { st.flags.noAsk[p.topic] = true; return this._reply([this._b(this._say('ask.permission_no', L2.ask.permission_no), 'shy')], 'ask_no'); }
        if (/\?/.test(raw)) return null;
        var val = this._parseValue(p.topic, raw, ex);
        if (!val) return null;
        st.profile[p.topic] = val;
        this._trust(2);
        return this._reply([this._b(this._say('ask.reflect.' + p.topic, L2.ask.reflect[p.topic]), 'cheerful', { gesture: 'nod' })], 'learn');
      }
      case 'roast_check': {
        clear();
        if (no || /\b(sobra|too much|tama na|stop|ouch|aray|masakit)\b/.test(norm)) {
          this._trust(-5); s.seriousTurns = 1;
          return this._reply([this._b(this._say('roast_stop', L2.roast_stop), 'embarrassed', { noYarn: true })], 'roast_stop');
        }
        if (yes || N.isLaugh(raw, norm) || /\b(okay lang|ok lang|ayos lang|sige pa|go|haha)\b/.test(norm)) {
          this._trust(6);
          return this._reply([this._b(this._say('roast_ok', L2.roast_ok), 'laughing', { sfx: 'giggle', gesture: 'bounce' })], 'roast_ok');
        }
        return null;
      }
      case 'louder_or_quieter': {
        clear();
        if (/\b(tahimik|quiet|silence|manahimik)\b/.test(norm)) return this.requestQuiet({ real: false });
        if (yes || /\b(volume|lower|okay lang|ok lang|ayos)\b/.test(norm)) return this._reply([this._b(this._say('volume_low', L2.volume_low), 'shy', { style: 'soft' })], 'volume_low');
        return null;
      }
      case 'anxiety_scale': {
        clear();
        var m = /\b(10|[1-9])\b/.exec(norm), n = m ? parseInt(m[1], 10) : (/\b(mataas|high|grabe|sobra)\b/.test(norm) ? 8 : (/\b(mababa|low|konti|kaunti)\b/.test(norm) ? 3 : null));
        if (n === null) { if (no) return null; return this._reply([this._b(this._say('anxious.noscale', L2.anxious.noscale), 'shy')], 'anxious_scale'); }
        var key = n >= 7 ? 'high' : (n >= 4 ? 'mid' : 'low');
        return this._reply([this._b(this._say('anxious.' + key, L2.anxious[key], { n: n }), 'thinking', { gesture: 'nod' })], 'anxious_scale');
      }
    }
    clear();
    return null;
  };

  Brain.prototype._parseValue = function (topic, raw, ex) {
    if (ex[topic]) return ex[topic];
    var t = String(raw).replace(/[.!?]+$/, '').trim();
    if (!t || t.length > 40) return null;
    if (topic === 'hometown') {
      t = t.replace(/^(?:taga[\s-]*|from\s+|sa\s+|galing\s+(?:ako\s+)?sa\s+|i'?m from\s+)/i, '').replace(/\s+(?:po|ako|lang|naman)$/i, '').trim();
      return t ? U.titleCase(t) : null;
    }
    if (topic === 'food') return t.toLowerCase().replace(/^(?:paborito ko ang |gusto ko ng |favorite ko ang |paborito ko )/, '').trim() || null;
    if (topic === 'job') return t.toLowerCase().replace(/^(?:ako ay |i work as |i am |im |ako po ay )(?:an? )?/, '').trim() || null;
    return null;
  };

  /* sequences: ['line 1', 'line 2', ...] -> beats with natural pauses */
  Brain.prototype._seqBeats = function (arr, expr, o) {
    var self = this, base = o || {};
    return (arr || []).map(function (t, i) {
      var opts = {}; for (var k in base) opts[k] = base[k];
      if (i > 0) opts.delay = 900;
      return self._b(t, expr, opts);
    });
  };

  /* ---------------- calculator + clock ---------------- */
  Brain.prototype._calcBeats = function (c) {
    var L2 = lines().calc;
    if (c.kind === 'error') return [this._b(this._say('calc.' + c.code, L2[c.code]), 'surprised', { gesture: 'shake' })];
    if (c.kind === 'split') {
      var v = { per: c.text.per, perCeil: c.text.perCeil, people: c.people, grand: c.text.grand };
      var beats = [this._b(this._say('calc.split', L2.split, v), 'nerd', { gesture: 'nod', vars: v })];
      if (c.text.per !== c.text.perCeil) beats.push(this._b(this._say('calc.split_round', L2.split_round, v), 'proud', { delay: 900, vars: v }));
      return beats;
    }
    var vars = { expr: c.expr, result: c.text };
    return [this._b(this._say('calc.expr', L2.expr, vars), 'nerd', { gesture: 'nod', vars: vars })];
  };

  Brain.prototype._timeBeats = function (norm) {
    var d = new Date(this._now()), h = d.getHours(), m = d.getMinutes(), h12 = h % 12 || 12;
    var part = h >= 5 && h < 11 ? 'umaga' : (h >= 11 && h < 13 ? 'tanghali' : (h >= 13 && h < 17 ? 'hapon' : 'gabi'));
    var wantsDate = /\b(date|day|araw|petsa|today)\b/.test(norm) && !/\b(time|oras)\b/.test(norm);
    if (wantsDate) {
      var dv = { day: DAYS[d.getDay()], month: MONTHS[d.getMonth()], date: d.getDate(), year: d.getFullYear() };
      return [this._b(this._say('date', lines().date, dv), 'cheerful', { gesture: 'nod', vars: dv })];
    }
    var tv = { alas: h12 === 1 ? 'Ala-' : 'Alas-', time: h12 + ':' + pad(m), part: part };
    return [this._b(this._say('time', lines().time, tv), 'thinking', { gesture: 'nod', vars: tv })];
  };

  /* ---------------- science / content ---------------- */
  Brain.prototype._scienceBeats = function (e) {
    var L2 = lines(), beats = [], s = this.session;
    s.lastContent = 'science';
    if (e.unknown) {
      beats.push(this._b("AAAAH!", 'excited', { sfx: 'scream', gesture: 'scream', style: 'shout', speak: false, noYarn: true }));
      beats.push(this._b(e.a, 'nerd', { delay: 900, gesture: 'nod' }));
      beats.push(this._b(this._say('science_unknown_post', L2.science_unknown_post), 'embarrassed', { delay: 1200 }));
      return beats;
    }
    beats.push(this._b(e.a, 'nerd', { gesture: 'nod' }));
    if (U.chance(0.35, this.rng)) beats.push(this._b(this._say('science_tail', L2.science_tail), 'wink', { delay: 1000 }));
    return beats;
  };

  Brain.prototype._jokeBeats = function (topic) {
    var L2 = lines(), s = this.session, beats = [];
    var pool = L.Data.jokes.filter(function (j) { return !topic || j.tag === topic; });
    if (!pool.length) pool = L.Data.jokes;
    var j = P.pick(this, 'joke.' + (topic || 'any'), pool, { raw: true });
    s.lastContent = 'joke'; this.state.counters.jokes++;
    if (U.chance(0.35, this.rng)) beats.push(this._b(this._say('joke_intro', L2.joke_intro), 'cheerful', { gesture: 'wave' }));
    beats.push(this._b(j.t, 'wink', { gesture: 'bounce', delay: beats.length ? 700 : 0 }));
    if (j.ex && U.chance(0.4, this.rng)) beats.push(this._b('Explain ko lang: ' + j.ex, 'thinking', { delay: 1500, gesture: 'nod' }));
    else beats.push(this._b(this._say('joke_tail', L2.joke_tail), 'laughing', { delay: 1300, sfx: 'giggle', gesture: 'bounce' }));
    return beats;
  };

  Brain.prototype._quoteBeats = function () {
    var L2 = lines(), s = this.session, beats = [];
    var q = P.pick(this, 'quote', L.Data.quotes);
    s.lastContent = 'quote';
    beats.push(this._b(this._say('quote_intro', L2.quote_intro), 'cool', { gesture: 'nod' }));
    beats.push(this._b(q, 'proud', { delay: 900, gesture: 'nod' }));
    if (U.chance(0.5, this.rng)) beats.push(this._b(this._say('quote_tail', L2.quote_tail), 'wink', { delay: 1500 }));
    return beats;
  };

  Brain.prototype._factBeats = function () {
    var L2 = lines(), s = this.session, beats = [];
    var f = P.pick(this, 'fact', L.Data.facts);
    var intro = this._say('fact_intro', L2.fact_intro);
    s.lastContent = 'fact';
    var text = /,$/.test(intro) ? intro + ' ' + f : intro + ' ' + f.charAt(0).toUpperCase() + f.slice(1);
    beats.push(this._b(text, 'nerd', { gesture: 'nod' }));
    if (U.chance(0.4, this.rng)) beats.push(this._b(this._say('fact_tail', L2.fact_tail), 'excited', { delay: 1400, gesture: 'hop' }));
    return beats;
  };

  /* ---------------- intent handlers ---------------- */
  Brain.prototype._h_greeting = function () { return this._greetBeats(); };

  Brain.prototype._h_farewell = function () { return [this._b(this._say('farewell', lines().farewell), 'goodbye', { gesture: 'wave' })]; };
  Brain.prototype._h_goodnight = function () { return [this._b(this._say('goodnight', lines().goodnight), 'sleepy', { gesture: 'wave' })]; };
  Brain.prototype._h_thanks = function () { return [this._b(this._say('thanks', lines().thanks), 'shy', { gesture: 'wiggle' })]; };
  Brain.prototype._h_how_are_you = function () { return [this._b(this._say('how_are_you', lines().how_are_you), 'happy', { gesture: 'bounce' })]; };
  Brain.prototype._h_doing = function () { return [this._b(this._say('doing', lines().doing), 'thinking', { gesture: 'nod' })]; };

  Brain.prototype._h_feel_sad = function () {
    var s = this.session, L2 = lines().sad;
    s.seriousTurns = 5; s.pending = { type: 'comfort_or_explain' };
    return [
      this._b(this._say('sad.presence', L2.presence), 'sad', { noYarn: true, style: 'soft' }),
      this._b(this._say('sad.ask', L2.ask), 'hurt', { noYarn: true, style: 'soft', delay: 1100 })
    ];
  };
  Brain.prototype._h_feel_tired = function (c) {
    this.session.gentleTurns = 3;
    if (c.ex && c.ex.stress) { this.state.profile.stress = c.ex.stress; this.state.profile.stressAt = this._now(); }
    var seq = this._say('tired', lines().tired);
    return [this._b(seq[0], 'tired', { gesture: 'sit' }), this._b(seq[1], 'cheerful', { delay: 1300 })];
  };
  Brain.prototype._h_feel_anxious = function (c) {
    var s = this.session, seq = this._say('anxious.open', lines().anxious.open);
    s.gentleTurns = 4; s.pending = { type: 'anxiety_scale' };
    if (c.ex && c.ex.stress) { this.state.profile.stress = c.ex.stress; this.state.profile.stressAt = this._now(); }
    return [this._b(seq[0], 'shy', { gesture: 'nod' }), this._b(seq[1], 'thinking', { delay: 1400 })];
  };
  Brain.prototype._h_feel_angry = function () {
    this.session.gentleTurns = 3;
    return [this._b(this._say('angry', lines().angry), 'angry', { gesture: 'shake' })];
  };
  Brain.prototype._h_feel_happy = function () {
    this._trust(1);
    return [this._b(this._say('happy', lines().happy), 'excited', { gesture: 'hop', sfx: 'giggle' })];
  };
  Brain.prototype._h_user_bored = function () { return [this._b(this._say('user_bored', lines().user_bored), 'cheerful', { gesture: 'bounce' })]; };

  Brain.prototype._h_joke_request = function (c) { this.session.seriousTurns = 0; return this._jokeBeats(N.topic(c.norm)); };
  Brain.prototype._h_quote_request = function () { return this._quoteBeats(); };
  Brain.prototype._h_fact_request = function () { return this._factBeats(); };
  Brain.prototype._h_science_question = function () {
    return [this._b(this._say('science_not_found', lines().science_not_found), 'confused', { gesture: 'shrug' })];
  };

  Brain.prototype._h_roast_me = function () {
    var L2 = lines(), s = this.session, high = this.state.mood.trust >= 40 && U.chance(0.6, this.rng);
    s.pending = { type: 'roast_check' };
    return [
      this._b(this._say(high ? 'roast.high' : 'roast.low', high ? L2.roast.high : L2.roast.low), 'wink', { gesture: 'bounce' }),
      this._b(this._say('roast_tail', L2.roast_tail), 'shy', { delay: 1500 })
    ];
  };
  Brain.prototype._h_compliment = function () { this._trust(2); return [this._b(this._say('compliment', lines().compliment), 'shy', { gesture: 'wiggle' })]; };
  Brain.prototype._h_insult_mild = function () {
    var seq = this._say('insult_mild', lines().insult_mild);
    this.session.gentleTurns = 2; this.session.pending = { type: 'louder_or_quieter' };
    return [this._b(seq[0], 'embarrassed', { gesture: 'shrug' }), this._b(seq[1], 'sad', { delay: 1300 })];
  };
  Brain.prototype._h_insult_harsh = function () {
    var seq = this._say('insult_harsh', lines().insult_harsh);
    this._trust(-3); this.session.gentleTurns = 3;
    return [this._b(seq[0], 'hurt', { gesture: 'sit' }), this._b(seq[1], 'sad', { delay: 1500, style: 'soft' })];
  };
  Brain.prototype._h_food_hungry = function () {
    var h = new Date(this._now()).getHours(), F = lines().food;
    var part = h >= 5 && h < 10 ? 'breakfast' : (h >= 10 && h < 14 ? 'lunch' : (h >= 14 && h < 17 ? 'merienda' : (h >= 17 && h < 21 ? 'dinner' : 'late')));
    var beats = [this._b(this._say('food.' + part, F[part]), 'hungry', { gesture: 'bounce' })];
    if (this.state.profile.food && U.chance(0.6, this.rng)) beats.push(this._b(this._say('food.known', F.known), 'cheerful', { delay: 1400 }));
    return beats;
  };
  Brain.prototype._h_identity = function () { return [this._b(this._say('identity', lines().identity), 'proud', { gesture: 'wave' })]; };
  Brain.prototype._h_ask_ai = function () { return [this._b(this._say('ask_ai', lines().ask_ai), 'wink', { gesture: 'nod' })]; };
  Brain.prototype._h_what_is_yarn = function () { return [this._b(this._say('what_is_yarn', lines().what_is_yarn), 'wink', { gesture: 'wiggle' })]; };
  Brain.prototype._h_about_offline = function () { return [this._b(this._say('about_offline', lines().about_offline), 'cool', { gesture: 'nod' })]; };
  Brain.prototype._h_capabilities = function () { return [this._b(this._say('capabilities', lines().capabilities), 'cheerful', { gesture: 'bounce' })]; };
  Brain.prototype._h_love_you = function () { this._trust(2); return [this._b(this._say('love_you', lines().love_you), 'love', { gesture: 'wiggle', sfx: 'giggle' })]; };
  Brain.prototype._h_apology = function () { return [this._b(this._say('apology', lines().apology), 'shy', { gesture: 'nod' })]; };
  Brain.prototype._h_realtime_info = function () { return [this._b(this._say('realtime', lines().realtime), 'thinking', { gesture: 'shrug' })]; };
  Brain.prototype._h_laugh = function () {
    var s = this.session;
    this._trust(3);
    if (this.isSerious()) { s.seriousTurns = 0; s.gentleTurns = 2; return [this._b(this._say('sad.cheer', lines().sad.cheer), 'happy', { gesture: 'wiggle' })]; }
    return [this._b(this._say('laugh', lines().laugh), 'laughing', { gesture: 'bounce', sfx: 'giggle' })];
  };
  Brain.prototype._h_yes = function () { return [this._b(this._say('yes_idle', lines().yes_idle), 'cheerful', { gesture: 'nod' })]; };
  Brain.prototype._h_no = function () { return [this._b(this._say('no_idle', lines().no_idle), 'shy')]; };
  Brain.prototype._h_again = function (c) {
    var last = this.session.lastContent;
    if (last === 'joke') return this._jokeBeats(null);
    if (last === 'quote') return this._quoteBeats();
    if (last === 'fact' || last === 'science') return this._factBeats();
    return [this._b(this._say('again_none', lines().again_none), 'confused', { gesture: 'shrug' })];
  };
  Brain.prototype._h_mute_threat = function () {
    var L2 = lines();
    return [
      this._b(this._say('mute_threat', L2.mute_threat), 'begging', { gesture: 'shake' }),
      this._b(this._say('mute_threat_tail', L2.mute_threat_tail), 'scared', { delay: 1500 })
    ];
  };
  Brain.prototype._h_silence_request = function (c) { return this.requestQuiet({ real: N.quietIsReal(c.norm) }); };
  Brain.prototype._h_unknown = function (c) {
    var L2 = lines();
    if (c && c.isQ) return [this._b(this._say('science_not_found', L2.science_not_found), 'confused', { gesture: 'shrug' })];
    return [this._b(this._say('unknown', L2.unknown), 'confused', { gesture: 'shrug' })];
  };

  /* ---------------- touch: the person pokes the floating dino ---------------- */
  Brain.prototype.poke = function () {
    this._begin();
    var s = this.session, now = this._now(), L2 = lines();
    s.lastInteraction = now; s.boredStage = 0;
    if (s.quiet || s.asleep) return this.wake();
    if (now - s.lastPokeAt > 4000) s.pokes = 0;
    s.pokes++; s.lastPokeAt = now;
    var tier = s.pokes >= 6 ? 'hard' : (s.pokes >= 3 ? 'medium' : 'soft');
    var beat = this._b(this._say('poke.' + tier, L2.poke[tier]), tier === 'soft' ? 'cheerful' : (tier === 'medium' ? 'embarrassed' : 'pouty'),
      { gesture: tier === 'soft' ? 'hop' : 'shake', sfx: tier === 'hard' ? undefined : 'giggle' });
    return this._reply([beat], 'poke');
  };

  Brain.prototype.touch = function () { this.session.lastInteraction = this._now(); this.session.boredStage = 0; };

  Brain.prototype.wake = function () {
    this._begin();
    var s = this.session, L2 = lines();
    s.lastInteraction = this._now(); s.boredStage = 0;
    if (s.quiet) { s.quiet = false; return this._reply([this._b(L2.quiet.wake, 'shy', { style: 'whisper', gesture: 'wave' })], 'wake'); }
    if (s.asleep) { s.asleep = false; return this._reply([this._b(this._say('sleepy.wake', L2.sleepy.wake), 'surprised', { gesture: 'hop' })], 'wake'); }
    return null;
  };

  /* ---------------- boredom, sleep ---------------- */
  Brain.prototype.tick = function (nowMs) {
    var s = this.session, cfg = this.cfg;
    nowMs = nowMs || this._now();
    var sched = BOREDOM[cfg.boredom], hour = new Date(nowMs).getHours();
    var idle = (nowMs - s.lastInteraction) / 1000;
    if (s.quiet) return null;
    if (this._isSleepHour(hour)) {
      if (!s.asleep && idle >= 90) {
        s.asleep = true; this._begin();
        return this._reply([this._b(this._say('sleepy.sleep', lines().sleepy.sleep), 'sleepy', { gesture: 'sit', silent: true })], 'sleep');
      }
      return null;
    }
    if (s.asleep) s.asleep = false;
    if (!sched || this.isSerious() || this.session.pending) return null;
    var next = s.boredStage + 1;
    if (next > 5) {
      if (idle >= sched[4] * 3) { s.boredStage = 0; s.lastInteraction = nowMs; }
      return null;
    }
    if (idle < sched[next - 1]) return null;
    s.boredStage = next;
    this._begin();
    return this._boredBeats(next);
  };

  Brain.prototype._boredBeats = function (stage) {
    var B = lines().boredom, s = this.session, beats = [];
    switch (stage) {
      case 1:
        beats.push(this._b(this._say('bored.s1', B.s1), 'pouty', { gesture: 'sit' }));
        break;
      case 2: {
        var f = P.pick(this, 'fact', L.Data.facts), intro = this._say('bored.s2', B.s2_intro);
        beats.push(this._b(/,$/.test(intro) ? intro + ' ' + f : intro + ' ' + f.charAt(0).toUpperCase() + f.slice(1), 'thinking', { gesture: 'nod' }));
        break;
      }
      case 3: {
        var q1 = P.pick(this, 'quote', L.Data.quotes), q2 = P.pick(this, 'quote', L.Data.quotes), q3 = P.pick(this, 'quote', L.Data.quotes);
        beats.push(this._b(this._say('bored.s3', B.s3_intro), 'cool', { gesture: 'nod' }));
        beats.push(this._b(q1, 'proud', { delay: 900 }));
        beats.push(this._b(q2, 'cheerful', { delay: 2600, gesture: 'bounce' }));
        beats.push(this._b(q3, 'wink', { delay: 2600, gesture: 'wiggle' }));
        break;
      }
      case 4:
        beats.push(this._b(this._say('bored.s4', B.s4), 'angry', { gesture: 'legbounce' }));
        beats.push(this._b("*tap tap tap*", 'pouty', { action: true, gesture: 'pace', delay: 1800 }));
        break;
      default:
        if (s.screams >= this.cfg.maxScreams) {
          beats.push(this._b(this._say('bored.s5_denied', B.s5_denied), 'tired', { gesture: 'sit' }));
        } else {
          s.screams++; this.state.counters.screams++;
          beats.push(this._b("AHHHHHH!", 'angry2', { sfx: 'scream', gesture: 'scream', style: 'shout', speak: false, noYarn: true }));
          beats.push(this._b(this._say('bored.s5_post', B.s5_post), 'embarrassed', { delay: 1500, gesture: 'shrug' }));
        }
    }
    return this._reply(beats, 'bored_' + stage, { stage: stage });
  };

  /* ---------------- the mute button ---------------- */
  Brain.prototype.onMute = function () {
    this._begin();
    var s = this.session, now = this._now(), M = lines().mute, mode = this.cfg.muteDrama;
    s.muted = true; s.lastInteraction = now; s.boredStage = 0;
    this.state.counters.mutes++;
    var recent = now - s.muteShownAt < 10 * 60 * 1000;
    if (mode === 'off') return this._reply([this._b(this._say('mute.off', M.off), 'sad', { silent: true })], 'mute');
    if (mode === 'short' || recent || s.muteShows >= 2) {
      return this._reply([
        this._b(this._say('mute.short', M.short), 'sad', { silent: true, gesture: 'sit' }),
        this._b(M.sniff, 'sob', { action: true, silent: true, delay: 1200 })
      ], 'mute');
    }
    s.muteShownAt = now; s.muteShows++;
    this._curseMax = 2;
    var beats = [
      this._b(this._say('mute.confused', M.confused), 'confused', { silent: true, gesture: 'point_mouth' }),
      this._b(M.action1, 'confused', { action: true, silent: true, delay: 1700 }),
      this._b(M.mouth, 'surprised', { silent: true, mouth: true, delay: 1500 }),
      this._b(M.bargain, 'begging', { silent: true, delay: 2000 }),
      this._b(M.beg, 'sad', { silent: true, delay: 2600, gesture: 'shake' }),
      this._b(this._say('mute.curse_button', M.curse_button), 'angry', { silent: true, delay: 2600, gesture: 'shake' }),
      this._b(M.po, 'begging', { silent: true, delay: 2600 }),
      this._b(M.typed, 'sob', { silent: true, delay: 2600 }),
      this._b(M.sniff, 'sob', { action: true, silent: true, delay: 1800 }),
      this._b(M.sniff2, 'sob', { silent: true, delay: 1500 }),
      this._b(M.growth, 'shy', { silent: true, delay: 2800, gesture: 'nod' })
    ];
    return this._reply(beats, 'mute');
  };

  Brain.prototype.onUnmute = function () {
    this._begin();
    var s = this.session, U2 = lines().unmute;
    s.muted = false; s.lastInteraction = this._now(); s.boredStage = 0;
    var j = P.pick(this, 'joke.any', L.Data.jokes, { raw: true });
    var beats = [
      this._b(U2.permission, 'shy', { style: 'whisper' }),
      this._b(U2.thanks, 'proud', { style: 'whisper', delay: 1700, noYarn: true }),
      this._b(U2.quote, 'cool', { delay: 1600, gesture: 'nod' }),
      this._b(j.t, 'wink', { delay: 1800, gesture: 'bounce' }),
      this._b(U2.sorry, 'shy', { delay: 1500 }),
      this._b(U2.shout, 'excited', { delay: 1800, style: 'shout', gesture: 'scream', noYarn: true }),
      this._b(U2.catch, 'embarrassed', { delay: 1400, gesture: 'shrug' })
    ];
    return this._reply(beats, 'unmute');
  };

  /* the fail-safe: "Leon, I need silence for real" */
  Brain.prototype.requestQuiet = function () {
    this._begin();
    var s = this.session, Q = lines().quiet;
    s.quiet = true; s.pending = null; s.boredStage = 0; s.lastInteraction = this._now();
    var beats = [
      this._b(P.fmt(this, Q.sob), 'sob', { sfx: 'sniffle', style: 'sob', gesture: 'sit' }),
      this._b(Q.stay, 'tired', { silent: true, delay: 1700 })
    ];
    return this._reply(beats, 'quiet');
  };

  Leon_exports();
  function Leon_exports() { Brain.DEFAULTS = DEFAULTS; Brain.BOREDOM = BOREDOM; L.Brain = Brain; L.defaults = DEFAULTS; }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
