'use strict';
/* Stage + Companion tests (no DOM: stub avatar, mock audio). */
var H = require('./helpers.js'), ok = H.ok, eq = H.eq;
var loadAll = require('./load_all.js');
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function stubAvatar() {
  var log = [], a = {
    log: log, mouth: 'X', speaking: 0,
    setExpression: function (n) { log.push('expr:' + n); return n; }, gesture: function (n) { log.push('gest:' + n); return 500; },
    setMouth: function (v, o) { a.mouth = v; a.open = o; log.push('mouth:' + v); }, setSpeaking: function (x) { a.speaking = x; }, destroy: function () { log.push('destroy'); }
  };
  return a;
}
function fakeVoice(opts) {
  opts = opts || {};
  var v = { calls: [], sfxCalls: [], stops: 0, muted: false, shape: { v: 'X', open: 0, active: false },
    speak: function (b) { v.calls.push(b); return new Promise(function (res) { setTimeout(function () { res({ ok: true, engine: b.silent ? 'none' : 'leon' }); }, opts.speakMs === undefined ? 20 : opts.speakMs); }); },
    sfx: function (n) { v.sfxCalls.push(n); return new Promise(function (res) { setTimeout(function () { res({ ok: true }); }, opts.sfxMs === undefined ? 30 : opts.sfxMs); }); },
    stop: function () { v.stops++; }, mouth: function () { return v.shape; }, isMuted: function () { return v.muted; },
    setMuted: function (m) { v.muted = m; }, unlock: function () { return true; }, setOptions: function () {}, info: function () { return { active: 'fake' }; } };
  return v;
}

async function main() {
  H.section('Stage: playing beats');
  await (async function () {
    var Leon = loadAll(), av = stubAvatar(), vo = fakeVoice(), st = new Leon.Stage({ avatar: av, voice: vo, readMsPerChar: 0, readMinMs: 10, gapMs: 5 });
    var ev = [];
    st.on('start', function () { ev.push('start'); }).on('beat', function (b, i) { ev.push('beat:' + b.text + ':' + i.index + '/' + i.count); }).on('beatEnd', function (b) { ev.push('end:' + b.text); }).on('idle', function () { ev.push('idle'); });
    var t0 = Date.now();
    var res = await st.play({ beats: [{ text: 'A', voice: 'A', expr: 'happy', gesture: 'wave' }, { text: 'B', voice: 'B', expr: 'sad', delay: 60 }] });
    ok(res.completed && res.played === 2, 'plays all beats', JSON.stringify(res));
    eq(ev.join(' '), 'start beat:A:0/2 end:A beat:B:1/2 end:B idle', 'events fire in order');
    eq(av.log.filter(function (x) { return /^(expr|gest)/.test(x); }).join(' '), 'expr:happy gest:wave expr:sad', 'face then gesture per beat');
    ok(Date.now() - t0 >= 60, 'beat.delay is honoured', Date.now() - t0);
    eq(vo.calls.length, 2, 'voice.speak called per beat');
    ok(!st.busy(), 'not busy afterwards');
    var empty = await st.play({ beats: [] }); ok(empty.empty, 'empty reply is harmless');
  })();

  await (async function () {
    var Leon = loadAll(), av = stubAvatar(), vo = fakeVoice({ speakMs: 200 }), st = new Leon.Stage({ avatar: av, voice: vo, readMsPerChar: 0, readMinMs: 10, gapMs: 5 });
    var first = st.play([{ text: 'one', voice: 'one' }, { text: 'two', voice: 'two' }]);
    await sleep(40);
    ok(st.busy(), 'busy while speaking');
    var dropped = await st.play([{ text: 'idle chatter', voice: 'x' }], { interrupt: false });
    ok(dropped.dropped, 'interrupt:false is dropped while busy');
    var second = st.play([{ text: 'three', voice: 'three' }]);
    var r1 = await first; ok(r1.cancelled && !r1.completed, 'a new play() cancels the old one', JSON.stringify(r1));
    ok(vo.stops >= 1, 'voice was stopped');
    var r2 = await second; ok(r2.completed, 'the new reply completes');
    ok(vo.calls.map(function (c) { return c.text; }).join() === 'one,three', 'cancelled beat two never spoken', vo.calls.map(function (c) { return c.text; }).join());
    var p = st.play([{ text: 'x', voice: 'x', delay: 500 }]); await sleep(30); st.cancel(); var r3 = await p; ok(r3.cancelled, 'cancel() during a delay works');
    eq(av.mouth, 'X', 'mouth reset on cancel');
  })();

  await (async function () {
    var Leon = loadAll(), av = stubAvatar(), vo = fakeVoice({ sfxMs: 150, speakMs: 10 }), st = new Leon.Stage({ avatar: av, voice: vo, readMsPerChar: 0, readMinMs: 10, gapMs: 5 });
    var t0 = Date.now();
    await st.play([{ text: 'AAAAH!', voice: '', speak: false, sfx: 'scream', gesture: 'scream', expr: 'excited' }]);
    ok(Date.now() - t0 >= 140, 'a sound-effect-only beat lasts as long as the effect', Date.now() - t0);
    eq(vo.sfxCalls[0], 'scream', 'sfx started');
    eq(vo.calls.length, 1, 'speak() still called (it resolves at once for speak:false)');
    t0 = Date.now(); await st.play([{ text: 'Hehe', voice: 'Hehe', sfx: 'giggle' }]);
    eq(vo.sfxCalls[1], 'giggle', 'giggle played with speech'); 
    var read = loadAll(), st2 = new read.Stage({ avatar: stubAvatar(), voice: Object.assign(fakeVoice(), { speak: function () { return Promise.resolve({ ok: true, engine: 'none' }); } }), readMsPerChar: 4, readMinMs: 50, gapMs: 5 });
    t0 = Date.now(); await st2.play([{ text: new Array(31).join('x'), voice: '', action: true }]);
    ok(Date.now() - t0 >= 110, 'unspoken lines stay up long enough to read', Date.now() - t0);
    var errs = 0, st3 = new Leon.Stage({ avatar: av, voice: Object.assign(fakeVoice(), { speak: function () { throw new Error('boom'); } }), readMinMs: 5, readMsPerChar: 0 });
    st3.on('error', function () { errs++; });
    var r = await st3.play([{ text: 'a', voice: 'a' }, { text: 'b', voice: 'b' }]);
    ok(r.completed && errs === 2, 'an error in one beat does not stop the show', errs);
  })();

  await (async function () {
    var Leon = loadAll(), av = stubAvatar(), vo = fakeVoice(), st = new Leon.Stage({ avatar: av, voice: vo });
    vo.shape = { v: 'A', open: 1.0, active: true }; st.frame();
    eq(av.mouth, 'A', 'frame() copies the voice mouth shape to the avatar'); ok(av.speaking > 0.5, 'and drives the talking bob');
    vo.shape = { v: 'X', open: 0, active: false }; st.frame();
    eq(av.mouth, 'X', 'mouth returns to rest');
  })();

  H.section('Companion: brain + stage + voice');
  await (async function () {
    var Leon = loadAll(), av = stubAvatar(), vo = fakeVoice({ speakMs: 5 });
    var c = Leon.Companion.create({ avatarInstance: av, voiceInstance: vo, config: { seed: 7, boredom: 'off' }, storage: H.memStore(), idle: false, readMinMs: 5, readMsPerChar: 0, gapMs: 2 });
    var ev = []; c.on('user', function (t) { ev.push('user:' + t); }).on('reply', function (r) { ev.push('reply:' + r.intent); }).on('beat', function () { ev.push('beat'); });
    var r = await c.say('kumusta');
    ok(r && r.beats.length >= 1, 'say() returns the brain reply');
    ok(ev[0] === 'user:kumusta' && /^reply:/.test(ev[1]), 'user then reply events', ev.slice(0, 3).join());
    ok(vo.calls.length >= 1 && vo.calls[0].voice, 'the reply was spoken');
    eq(await c.say('   '), null, 'blank input is ignored');
    var calc = await c.say('15% of 240'); ok(/36/.test(calc.beats.map(function (b) { return b.text; }).join(' ')), 'math works through the whole stack');
    ok(Leon.host && typeof Leon.host.say === 'function', 'Leon.host is exposed for native shells');
    var po = await c.poke(); ok(po && po.beats.length === 1, 'poke gives one beat');
    c.destroy(); ok(Leon.host === null, 'destroy removes Leon.host'); ok(av.log.indexOf('destroy') < 0, 'a borrowed avatar is not destroyed');
  })();

  await (async function () {
    var Leon = loadAll(), av = stubAvatar(), vo = fakeVoice({ speakMs: 5 });
    var c = Leon.Companion.create({ avatarInstance: av, voiceInstance: vo, config: { seed: 7, boredom: 'off', muteDrama: 'short' }, storage: H.memStore(), idle: false, readMinMs: 5, readMsPerChar: 0, gapMs: 2, host: false });
    var beats = []; c.on('beat', function (b) { beats.push(b); });
    c.mute(); await sleep(30);
    ok(vo.muted && c.isMuted(), 'mute() mutes the voice');
    ok(beats.length >= 1 && beats[0].silent === true, 'mute beats are silent (no sound, he can only talk with his face)', JSON.stringify(beats[0]));
    ok(/(^| )(sad|sob|confused)/.test(av.log.filter(function (x) { return /^expr/.test(x); }).join(' ').replace(/expr:/g, ' ')), 'face reacts to the mute');
    await sleep(1500);
    c.unmute(); await sleep(30);
    ok(!vo.muted, 'unmute() restores sound');
    ok(beats.some(function (b) { return b.style === 'whisper'; }), 'he whispers first after unmute');
    c.stopTalking();
    var q = await c.say('Leon, i need silence for real'); ok(q.intent === 'quiet', 'quiet request is honoured', q.intent);
    ok(q.beats.some(function (b) { return b.silent; }), 'then he stays quiet (silent beat)');
    c.destroy();
  })();

  await (async function () {
    /* idle life with a fake clock: boredom fires from the 1-second tick */
    var Leon = loadAll(), av = stubAvatar(), vo = fakeVoice({ speakMs: 5 }), clock = { t: new Date('2026-11-09T14:00:00+08:00').getTime() };
    var c = Leon.Companion.create({ avatarInstance: av, voiceInstance: vo, config: { seed: 3, boredom: 'demo', sleepHours: null }, storage: H.memStore(), now: function () { return clock.t; }, tickMs: 15, readMinMs: 5, readMsPerChar: 0, gapMs: 2, host: false });
    var got = []; c.on('reply', function (r) { got.push(r.intent); });
    await sleep(60); eq(got.length, 0, 'nothing happens while he is not bored yet');
    clock.t += 30000; await sleep(80);
    ok(got.indexOf('bored_1') >= 0, 'after 30 s idle he gets bored (stage 1)', got.join());
    c.destroy();
    var n = got.length; clock.t += 600000; await sleep(80); eq(got.length, n, 'destroyed companions stop ticking');
  })();

  await (async function () {
    /* bubble element */
    var Leon = loadAll(), av = stubAvatar(), vo = fakeVoice({ speakMs: 5 }), cls = {}, el = { textContent: '', attrs: {}, classList: { toggle: function (k, on) { cls[k] = !!on; }, add: function (k) { cls[k] = true; }, remove: function (k) { cls[k] = false; } }, setAttribute: function (k, v) { el.attrs[k] = v; } };
    var c = Leon.Companion.create({ avatarInstance: av, voiceInstance: vo, bubble: el, config: { seed: 7, boredom: 'off' }, storage: H.memStore(), idle: false, readMinMs: 5, readMsPerChar: 0, gapMs: 2, host: false, typeCps: 400 });
    await c.speak('Hello po!', { expr: 'cheerful' });
    await sleep(120);
    eq(el.textContent, 'Hello po!', 'bubble shows the text (typewriter finished)');
    ok(cls.show === true, 'bubble is visible'); eq(el.attrs['data-expr'], 'cheerful', 'bubble knows the expression');
    await c.stage.play([{ text: '*sniff*', voice: '', action: true }]); ok(cls.action === true, 'action lines get the .action class');
    c.destroy();
  })();

  return H.summary();
}
main().then(function (failed) { process.exit(failed ? 1 : 0); }, function (e) { console.error(e); process.exit(2); });
