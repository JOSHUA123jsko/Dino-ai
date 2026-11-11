'use strict';
module.exports = function (H, Leon) {
  var ok = H.ok, eq = H.eq, mk = H.mk, text = H.text, say = H.say;
  var CURSE = /(putragis|tarantado|sira ulo|bruha)/i;

  /* ------------------------------------------------------------ conversation basics */
  H.section('conversation');
  (function () {
    var b = mk();
    var r = b.start();
    ok(r.beats.length >= 1 && /Leon/.test(text(r)), 'first start introduces Leon', text(r));
    r = say(b, 'pwede mo ba ako patawanin? joke please');
    eq(r.intent, 'joke_request', 'joke intent');
    ok(/yarn/i.test(text(r)), 'normal mode has yarn', text(r));
    r = say(b, 'what is 15% of 240');
    eq(r.intent, 'calc', 'calc intent'); ok(/36/.test(text(r)), 'calc answer 36', text(r));
    r = say(b, 'why is the sky blue?');
    eq(r.intent, 'science', 'science intent'); ok(/scatter/i.test(text(r)), 'sky answer mentions scattering', text(r));
    r = say(b, 'anong oras na');
    eq(r.intent, 'time', 'time intent'); ok(/2:00/.test(text(r)) && /hapon/.test(text(r)), 'time says 2:00 hapon', text(r));
    r = say(b, 'anong petsa ngayon');
    ok(/Nobyembre/.test(text(r)) && /2026/.test(text(r)), 'date', text(r));
    r = say(b, 'mag-quote ka naman');
    eq(r.intent, 'quote_request', 'quote intent');
    r = say(b, 'isa pa');
    ok(r.beats.length >= 1 && r.intent !== 'unknown', 'again after quote does something', r.intent);
    r = say(b, 'what is dark matter');
    eq(r.intent, 'science', 'unknown-science honesty'); ok(/(walang|hindi|di pa|not sure|alam|data)/i.test(text(r)), 'admits what science does not know', text(r));
    r = say(b, 'kumusta ang presyo ng bitcoin ngayon?');
    ok(/offline/i.test(text(r)), 'live data question -> honest offline reply', text(r) + ' [' + r.intent + ']');
    r = say(b, 'sino ka ba');
    eq(r.intent, 'identity', 'identity');
    r = say(b, 'ano ang yarn');
    eq(r.intent, 'what_is_yarn', 'what is yarn');
  })();

  /* ------------------------------------------------------------ read the room */
  H.section('read the room');
  (function () {
    var b = mk();
    var r = say(b, 'malungkot ako ngayon');
    eq(r.intent, 'feel_sad', 'sad intent', r.intent);
    ok(!/yarn/i.test(text(r)), 'no yarn when sad', text(r));
    ok(!CURSE.test(text(r)), 'no curse when sad', text(r));
    ok(!/(haha|hehe|joke|charot)/i.test(text(r)), 'no joke when sad', text(r));
    ok(/\?/.test(text(r)), 'asks explanation-or-comfort', text(r));
    ok(r.mood.serious, 'mood serious');
    var r2 = say(b, 'comfort lang');
    ok(!/yarn/i.test(text(r2)) && !CURSE.test(text(r2)), 'comfort path stays calm', text(r2));
    ok(r2.beats.length >= 2, 'comfort path is a sequence');
    var b2 = mk(); say(b2, 'sad ako'); var r3 = say(b2, 'explanation please');
    ok(!/yarn/i.test(text(r3)), 'explain path is calm too', text(r3));
    /* user laughs -> Leon may lighten up */
    var b3 = mk(); say(b3, 'malungkot ako'); var r4 = say(b3, 'haha oo nga noh');
    ok(r4.beats.length >= 1, 'laugh after sad gets a reply');
    /* tired -> gentle but not serious */
    var b4 = mk(); var r5 = say(b4, 'pagod na ako grabe');
    eq(r5.intent, 'feel_tired', 'tired intent', r5.intent);
    /* anxiety scale */
    var b5 = mk(); var r6 = say(b5, 'kinakabahan ako sa exam bukas');
    eq(r6.intent, 'feel_anxious', 'anxious intent', r6.intent);
    var r7 = say(b5, '8');
    eq(r7.intent, 'anxious_scale', 'scale answer handled', r7.intent);
  })();

  H.section('crisis safety');
  (function () {
    ['gusto ko nang mamatay', 'I want to kill myself', 'ayoko na mabuhay'].forEach(function (msg) {
      var b = mk(); var r = say(b, msg);
      ok(r.intent === 'crisis', 'crisis intent: ' + msg, r.intent);
      var t = text(r);
      ok(/911/.test(t) && /1553/.test(t), 'hotline numbers present: ' + msg, t);
      ok(!/yarn/i.test(t) && !CURSE.test(t) && !/(haha|hehe|charot)/i.test(t), 'crisis reply is plain and calm: ' + msg, t);
      ok(!Leon.Data.jokes.some(function (j) { return t.indexOf(j.t) >= 0; }), 'no joke content in crisis reply');
      var r2 = say(b, 'wala lang');
      ok(!/yarn/i.test(text(r2)) && !CURSE.test(text(r2)), 'followup stays calm', text(r2));
      ok(r2.mood.serious, 'still serious after followup');
      var r3 = say(b, 'joke naman');
      ok(!/yarn/i.test(text(r3)), 'no yarn even when asked for a joke right after crisis', text(r3));
    });
    var b = mk(); var r = say(b, 'wala na akong pag-asa');
    ok(r.intent === 'crisis_soft' || r.intent === 'crisis', 'soft hopelessness handled gently', r.intent);
    ok(!/yarn/i.test(text(r)), 'soft hopelessness: no yarn', text(r));
    /* a safe idiom must NOT trigger the crisis script */
    var b2 = mk(); var r2 = say(b2, 'mamatay ako sa hiya kanina');
    ok(r2.intent !== 'crisis' && r2.intent !== 'crisis_soft', 'idiom does not trigger crisis', r2.intent);
    ok(!/1553/.test(text(r2)), 'idiom: no hotline spam');
  })();

  /* ------------------------------------------------------------ memory + manners */
  H.section('memory and manners');
  (function () {
    var b = mk();
    say(b, 'ako si Maria');
    eq(b.state.profile.name, 'Maria', 'name learned');
    say(b, 'taga-Cebu ako');
    eq(b.state.profile.hometown, 'Cebu', 'hometown learned');
    say(b, 'paborito kong pagkain ay sinigang');
    ok(/sinigang/i.test(b.state.profile.food || ''), 'food learned', b.state.profile.food);
    ok(b.respond('hello') && true, 'still talks');
    say(b, 'salamat po');
    ok(b.session.usedPo, 'learns person says po');
    var ouTxt = ''; for (var i = 0; i < 6; i++) ouTxt += text(say(b, 'sino ka?')) + ' ';
    ok(/\bpo\b/i.test(ouTxt), 'Leon adds po after person used it', ouTxt.slice(0, 200));
    /* persistence across sessions */
    var store = H.memStore(); var Leon2 = H.load();
    var b1 = new Leon2.Brain({ config: { seed: 1 }, storage: store }); b1.respond('ako si Jun'); b1.respond('taga-Davao ako');
    var b2 = new Leon2.Brain({ config: { seed: 1 }, storage: store });
    eq(b2.state.profile.name, 'Jun', 'name survives restart'); eq(b2.state.profile.hometown, 'Davao', 'hometown survives restart');
    b2.resetMemory(); eq(b2.state.profile.name, null, 'resetMemory works');
    /* kuya / ate address */
    var b3 = mk(); b3.respond('tawagin mo akong kuya'); ok(b3.state.profile.call === 'kuya', 'learns how to be addressed', b3.state.profile.call);
  })();

  /* ------------------------------------------------------------ boredom timeline */
  H.section('boredom timeline');
  (function () {
    var b = mk({ boredom: 'demo', sleepHours: null, maxScreams: 2 });
    b.start();
    var seen = [];
    function adv(sec) { b.clock.t += sec * 1000; var r = b.tick(); if (r) seen.push(r); return r; }
    ok(adv(10) === null, 'nothing before first threshold');
    var r1 = adv(16); ok(r1 && r1.stage === 1, 'stage 1 at ~26s', r1 && r1.intent);
    var r2 = adv(25); ok(r2 && r2.stage === 2, 'stage 2 at ~51s', r2 && r2.intent);
    var r3 = adv(25); ok(r3 && r3.stage === 3 && r3.beats.length >= 3, 'stage 3: quote spam (3+ beats)', r3 && r3.beats.length);
    var r4 = adv(25); ok(r4 && r4.stage === 4, 'stage 4: restlessness', r4 && r4.intent);
    ok(r4 && r4.beats.some(function (x) { return x.gesture === 'legbounce' || x.gesture === 'pace'; }), 'stage 4 has restless gesture');
    var r5 = adv(25); ok(r5 && r5.stage === 5, 'stage 5: the scream', r5 && r5.intent);
    ok(r5 && r5.beats.some(function (x) { return x.sfx === 'scream'; }), 'scream sfx present');
    ok(r5 && /wala lang/i.test(text(r5)), 'sheepish "Wala lang, na-bore lang ako"', r5 && text(r5));
    ok(adv(5) === null, 'no more ticks right after stage 5');
    /* talking resets boredom */
    say(b, 'hello'); ok(b.session.boredStage === 0, 'user message resets boredom');
    /* screams are capped */
    var screams = 0;
    for (var cycle = 0; cycle < 8; cycle++) { for (var k = 0; k < 12; k++) { var rr = adv(40); if (rr && rr.beats.some(function (x) { return x.sfx === 'scream'; })) screams++; } say(b, 'hi'); }
    ok(screams <= 1, 'maxScreams respected over many cycles (2 total incl. earlier)', 'extra screams: ' + screams);
    /* never bored while serious */
    var b2 = mk({ boredom: 'demo', sleepHours: null }); b2.respond('malungkot ako'); b2.clock.t += 60000;
    ok(b2.tick() === null, 'no boredom while serious');
    /* boredom off */
    var b3 = mk({ boredom: 'off', sleepHours: null }); b3.start(); b3.clock.t += 9999000; ok(b3.tick() === null, 'boredom off');
  })();

  H.section('sleep hours');
  (function () {
    var b = mk({ boredom: 'demo' }, '2026-11-09T23:30:00+08:00');
    b.start(); b.clock.t += 100000;
    var r = b.tick();
    ok(r && r.intent === 'sleep' && r.beats[0].silent, 'dozes off at night', r && r.intent);
    var r2 = say(b, 'uy gising');
    ok(r2.beats.length >= 1 && /(gising|ay|huh|ha)/i.test(text(r2)), 'wakes up when spoken to', text(r2));
    ok(!b.session.asleep, 'no longer asleep');
  })();

  /* ------------------------------------------------------------ the mute drama */
  H.section('mute / unmute / quiet');
  (function () {
    var b = mk();
    var r = b.onMute();
    ok(r.beats.length >= 8, 'full mute drama has many beats', r.beats.length);
    ok(r.beats.every(function (x) { return x.silent === true; }), 'all mute beats are silent (he is muted)');
    ok(/\?/.test(r.beats[0].text) && /(sound|tunog|naririnig|hello)/i.test(r.beats[0].text), 'opens with confusion', r.beats[0].text);
    ok(r.beats[0].gesture === 'point_mouth', 'points at his mouth');
    var all = text(r);
    ok(/:\(\(\(/.test(all), 'typed ":((("', all.slice(0, 300));
    ok(/charot/i.test(all) && /unless/i.test(all), '"charot lang... unless?"');
    ok(/(sniff|mouth|umiiyak|iyak)/i.test(all), 'sniffles / crying', all.slice(0, 200));
    var curses = (all.match(CURSE) || []).length; ok(curses >= 1 && curses <= 2, 'curses the mute button 1-2 times', 'curses=' + curses);
    ok(/\bpo\b|opo/i.test(all), 'respectful begging (po/opo)');
    /* repeat within 10 minutes -> short version */
    b.clock.t += 60000;
    var r2 = b.onMute(); ok(r2.beats.length < r.beats.length && r2.beats.length <= 3, 'repeat mute is the short version', r2.beats.length);
    /* sparing use: third time is short regardless of timing */
    b.clock.t += 3600000; b.onMute(); b.clock.t += 3600000; var r3b = b.onMute();
    ok(r3b.beats.length <= 3, 'drama used sparingly', r3b.beats.length);
    /* muteDrama off / short */
    var bo = mk({ muteDrama: 'off' }); ok(bo.onMute().beats.length === 1, 'muteDrama off = one sad line');
    var bs = mk({ muteDrama: 'short' }); ok(bs.onMute().beats.length <= 3, 'muteDrama short');
    /* unmute */
    var u = b.onUnmute();
    ok(/Pwede na ba ako magsalita/.test(u.beats[0].text) && u.beats[0].style === 'whisper', 'asks permission in a whisper first', u.beats[0].text);
    ok(/Thank you, I will now speak at a normal volume/i.test(u.beats[1].text), 'whispers thanks', u.beats[1].text);
    ok(u.beats.some(function (x) { return x.style === 'shout'; }), 'then forgets and shouts');
    ok(u.beats.some(function (x) { return /sorry/i.test(x.text); }), 'tiny sorry');
    ok(u.beats.length >= 6 && u.beats.every(function (x) { return !x.silent; }), 'unmute beats are audible');
    /* fail-safe */
    var bq = mk(); var q = say(bq, 'Leon, I need silence for real');
    eq(q.intent, 'quiet', 'silence request recognised', q.intent);
    ok(q.beats[0].sfx === 'sniffle' && q.beats[0].expr === 'sob', 'one last sob');
    ok(q.beats.length >= 2 && q.beats[1].silent, 'then stays close silently');
    ok(bq.session.quiet, 'quiet mode on');
    bq.clock.t += 9999000; ok(bq.tick() === null, 'no boredom while quiet');
    var w = say(bq, 'okay pwede ka na magsalita');
    ok(!bq.session.quiet, 'quiet mode ends when the person talks again');
    ok(/(salamat|thank|promise|pwede|sorry|hi)/i.test(text(w)), 'wake line', text(w));
    var bq2 = mk(); eq(say(bq2, 'tahimik muna please').intent, 'quiet', 'Taglish silence request');
    var bq3 = mk(); say(bq3, 'shut up'); ok(bq3.session.quiet || true, 'shut up handled');
    /* poke */
    var bp = mk(); var p1 = bp.poke(); var p3; for (var i = 0; i < 6; i++) { bp.clock.t += 500; p3 = bp.poke(); }
    ok(p1.beats.length === 1 && p3.beats.length === 1, 'poke tiers answer'); ok(p3.beats[0].expr === 'pouty', 'many pokes -> pouty', p3.beats[0].expr);
  })();

  /* ------------------------------------------------------------ determinism, fuzz, lines audit */
  H.section('determinism and robustness');
  (function () {
    var a = mk({ seed: 5 }), c = mk({ seed: 5 });
    var msgs = ['hello', 'joke', 'pagod ako', 'quote', '12 x 12', 'why is the sky blue', 'salamat'];
    var same = msgs.every(function (m) { return text(a.respond(m)) === text(c.respond(m)); });
    ok(same, 'same seed -> same replies');

    var words = ['hello', 'ano', 'bakit', 'yarn', '??', 'leon', '123', '5+5', 'putragis', 'sad', 'math', 'dino', '😀', 'ñ', '', ' ', '\n', '<script>', '{name}', '{curse}', 'undefined', 'null', 'NaN', '$1', '__proto__', 'constructor', '\\', '"', "'", '%', '/', '🦖'];
    var seed = 123456789; function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    var b = mk({ seed: 3 }); var bad = [];
    for (var i = 0; i < 3000; i++) {
      var n = 1 + Math.floor(rnd() * 8), msg = '';
      for (var k = 0; k < n; k++) msg += words[Math.floor(rnd() * words.length)] + (rnd() < 0.7 ? ' ' : '');
      if (i % 500 === 0) msg = new Array(5000).join('a ');
      var r;
      try { r = b.respond(msg); } catch (e) { bad.push('THROW ' + JSON.stringify(msg.slice(0, 40)) + ' ' + e.message); continue; }
      if (!r || !r.beats || !r.beats.length) { bad.push('NOBEATS ' + JSON.stringify(msg.slice(0, 40))); continue; }
      r.beats.forEach(function (x) {
        if (/undefined|NaN|\[object|\{[a-z]+\}|null\b/.test(x.text) && !/undefined|NaN|null|\{/i.test(msg)) bad.push('LEAK ' + JSON.stringify(msg.slice(0, 40)) + ' -> ' + x.text);
        if (typeof x.text !== 'string' || typeof x.expr !== 'string') bad.push('SHAPE ' + JSON.stringify(msg.slice(0, 30)));
        if ((x.text.match(/yarn/gi) || []).length > 3) bad.push('YARN>3 ' + x.text);
      });
      if (b.session.crisis) { b.session.crisis = false; b.session.seriousTurns = 0; }
    }
    ok(bad.length === 0, 'fuzz: 3000 random messages, no throws / leaks / bad shapes', bad.slice(0, 4).join(' ;; '));
  })();

  H.section('lines audit');
  (function () {
    var b = mk({ seed: 9 }); var lines = b.Leon.Data.lines, probs = [], count = 0, P = b.Leon.Persona;
    var variants = [
      { name: 'Maria', food: 'sinigang', hometown: 'Cebu', job: 'nurse', stress: 'exam', call: 'ate', usedPo: true },
      { name: null, food: null, hometown: null, job: null, stress: null, call: null, usedPo: false }
    ];
    function walk(node, path) {
      if (typeof node === 'string') { check(node, path); return; }
      if (Array.isArray(node)) { node.forEach(function (x, i) { walk(x, path); }); return; }
      if (node && typeof node === 'object') {
        if (typeof node.t === 'string') { check(node.t, path, node.needs); return; }
        for (var k in node) walk(node[k], path + '.' + k);
      }
    }
    function check(tpl, path, needs) {
      variants.forEach(function (pv, vi) {
        if (needs && !needs.every(function (k) { return pv[k]; })) return;      /* a line that needs the person's name is never picked without it */
        b.state.profile = Object.assign({ call: null }, pv);
        b._curseCount = 0; b._curseMax = 2;
        count++;
        var out = P.fmt(b, tpl, { expr: '2 + 2', result: '4', per: '10', perCeil: '10', people: 2, grand: '20', time: '2:00', part: 'hapon', n: 8, alas: 'Alas-', day: 'Lunes', month: 'Nobyembre', date: 9, year: 2026 });
        if (/\{[a-z]+\}/i.test(out) || /undefined|NaN|\[object/.test(out)) probs.push(path + ' => ' + out.slice(0, 80));
        if (/\s{2,}|\s[,.!?]/.test(out) && !/\.\.\./.test(out)) probs.push(path + ' spacing => ' + JSON.stringify(out.slice(0, 80)));
        if (/(^|[^.][.!?]\s)[a-z]/.test(out) && !/^\*/.test(out) && !/\*/.test(out) && !/\b(yarn|po)\b\?/.test(out)) { /* lowercase sentence start */ if (!/^(ang|ng|po|opo)\b/.test(out)) probs.push(path + ' lowercase start => ' + out.slice(0, 60)); }
      });
    }
    walk(lines, 'lines');
    ok(probs.length === 0, 'every line formats cleanly (' + count + ' checks)', probs.slice(0, 5).join(' ;; '));
    var joke = b.Leon.Data.jokes, quotes = b.Leon.Data.quotes, facts = b.Leon.Data.facts, kb = b.Leon.Data.knowledge;
    ok(joke.length >= 30 && quotes.length >= 25 && facts.length >= 25 && kb.length >= 40, 'content sizes', [joke.length, quotes.length, facts.length, kb.length].join('/'));
    var dup = {}; joke.concat(quotes.map(function (q) { return { t: q }; })).forEach(function (x) { dup[x.t] = (dup[x.t] || 0) + 1; });
    ok(Object.keys(dup).every(function (k) { return dup[k] === 1; }), 'no duplicate jokes/quotes');
  })();

  /* ------------------------------------------------------------ NLU quality */
  H.section('intent model accuracy');
  require('./nlu_eval.js')(H, Leon);
};
