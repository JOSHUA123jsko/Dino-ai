'use strict';
/* Voice stack tests: G2P, LeonSynth, lip-sync, sound effects, and the voice manager (with mocked audio / speech / Android bridge). */
var H = require('./helpers.js'), ok = H.ok, eq = H.eq;
var loadVoice = require('./load_voice.js');

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function finite(pcm) { for (var i = 0; i < pcm.length; i++) if (!isFinite(pcm[i]) || Math.abs(pcm[i]) > 1.0001) return false; return true; }
function acPeak(x, a, b, lo, hi) { var seg = x.slice(a, b), m = 0, i; for (i = 0; i < seg.length; i++) m += seg[i]; m /= seg.length; for (i = 0; i < seg.length; i++) seg[i] -= m; var r0 = 0, best = 0, k; for (i = 0; i < seg.length; i++) r0 += seg[i] * seg[i]; for (k = lo; k < hi; k++) { var s = 0; for (i = 0; i + k < seg.length; i++) s += seg[i] * seg[i + k]; if (s > best) best = s; } return r0 > 0 ? best / r0 : 0; }

async function main() {
  /* ------------------------------------------------------------ G2P */
  H.section('G2P (text -> phones)');
  (function () {
    var Leon = loadVoice({ leon: true }), G = Leon.G2P;
    function ph(t) { return G.phonemize(t).tokens.filter(function (k) { return k.p !== '_'; }).map(function (k) { return k.p; }).join(' '); }
    ok(G.LEXICON_SIZE > 250, 'lexicon loaded', G.LEXICON_SIZE);
    eq(ph('yarn'), 'y a r n', 'yarn is spelled like the English word');
    eq(ph('po'), 'p o', 'po');
    eq(ph('ngayon'), 'N a y o n', 'ngayon starts with ng');
    eq(ph('911'), 'n a y n w a n w a n', '911 is read digit by digit');
    ok(/p e r s e n t/.test(ph('15%')), '% is read as percent');
    ok(/f i f t i n/.test(ph('15')), '15 is read as fifteen');
    eq(ph('2:05'), 't u o w f a y v', 'clock time reads as two oh five');
    ok(ph('0917 899 8727').split(' ').length > 30, 'phone numbers read digit by digit');
    var r = G.phonemize('Hello po, yarn!');
    ok(r.tokens.some(function (k) { return k.p === '_'; }), 'comma and ! make pauses');
    ok(r.tokens.some(function (k) { return k.end === '!'; }), 'sentence end is marked');
    eq(r.words.length, 3, 'three words');
    var long = G.phonemize('AAAAH!').tokens[0];
    ok(long.lng > 1.5, 'AAAAH keeps one long vowel', JSON.stringify(long));
    ok(G.phonemize('SCIENCE').words[0].caps, 'ALL CAPS word is flagged');
    eq(G.phonemize('maaga').tokens.filter(function (k) { return k.p === 'a'; }).length, 3, 'maaga keeps three a syllables');
    eq(G.phonemize('').tokens.length, 0, 'empty text -> no tokens');
    ok(G.phonemize('😀😀 ???').tokens.length >= 0, 'emoji do not crash');
    var ncmh = G.phonemize('NCMH').tokens.length;
    ok(ncmh >= 8, 'acronyms are spelled out', ncmh);
  })();

  /* ------------------------------------------------------------ LeonSynth */
  H.section('LeonSynth (own voice)');
  (function () {
    var Leon = loadVoice({}), S = Leon.LeonSynth;
    var r = S.synth('Kumusta ka na, bes? Ako si Leon, ang dino na mahilig sa science.');
    ok(r.pcm.length > 22050 * 3, 'a sentence is several seconds long', r.duration);
    ok(finite(r.pcm), 'samples are finite and never clip');
    var mono = r.timeline.every(function (t, i) { return i === 0 || t.t0 >= r.timeline[i - 1].t0 - 1e-9; });
    ok(mono, 'timeline is in order');
    eq(r.words.length, 13, 'one timing entry per word');
    ok(r.words.every(function (w) { return w.t1 > w.t0; }), 'every word has a positive duration');
    var r2 = S.synth('Kumusta ka na, bes? Ako si Leon, ang dino na mahilig sa science.'), same = r.pcm.length === r2.pcm.length;
    for (var i = 0; same && i < r.pcm.length; i++) if (r.pcm[i] !== r2.pcm[i]) same = false;
    ok(same, 'same input gives the same samples (deterministic)');
    var fast = S.synth('Kumusta ka na', { rate: 2 }).duration, slow = S.synth('Kumusta ka na', { rate: 1 }).duration;
    ok(fast < slow * 0.8 && fast > slow * 0.4, 'rate 2 is roughly twice as fast', fast + ' vs ' + slow);
    ok(S.synth('aaaah!').duration > S.synth('ah!').duration, 'AAAH is longer than ah');
    /* pitch contour: a question rises on its last vowel, a statement falls */
    var q = S.plan('Gusto mo ba ng joke?').f0track, st = S.plan('Gusto mo ba ng joke.').f0track;
    ok(q[q.length - 1].f0 > q[q.length - 2].f0, 'question ends with a rise');
    ok(st[st.length - 1].f0 < st[st.length - 2].f0, 'statement ends with a fall');
    /* whisper has no pitch: strong periodicity only for normal voice */
    var vowelAt = function (res) { var seg = res.plan.segs.filter(function (s) { return s.k === 'V'; })[0]; return [Math.round((seg.t0 + (seg.t1 - seg.t0) * 0.3) / 1000 * 22050), Math.round((seg.t0 + (seg.t1 - seg.t0) * 0.8) / 1000 * 22050)]; };   /* seg times are in ms */
    var n = S.synth('aahhhh', { style: 'normal' }), w = S.synth('aahhhh', { style: 'whisper' });
    var pn = acPeak(n.pcm, vowelAt(n)[0], vowelAt(n)[1], 30, 220), pw = acPeak(w.pcm, vowelAt(w)[0], vowelAt(w)[1], 30, 220);
    ok(pn > 0.5, 'normal voice is periodic (voiced)', pn);
    ok(pw < pn * 0.7, 'whisper is much less periodic', pw + ' vs ' + pn);
    Object.keys(S.STYLES).forEach(function (s) { ok(finite(S.synth('Ang saya, yarn!', { style: s }).pcm), 'style ' + s + ' renders cleanly'); });
    ok(finite(S.synth('').pcm) && finite(S.synth('...').pcm) && finite(S.synth('😀').pcm), 'empty / punctuation / emoji do not break it');
    var pl = S.plan('mama papa'), tl = pl.timeline.map(function (t) { return t.ph; }).join('');
    eq(tl, 'mamapapa', 'timeline lists the phones');
    ok(S.custom && S.renderCustom({ duration: 0.2, f0: [[0, 300]], F: [[0, 700, 1300, 2600]], A: [[0, 0], [0.01, 1], [0.15, 1], [0.19, 0]] }).length > 4000, 'custom plans render (used by sound effects)');
  })();

  /* ------------------------------------------------------------ Lipsync */
  H.section('Lip-sync');
  (function () {
    var Leon = loadVoice({}), LP = Leon.Lipsync, S = Leon.LeonSynth;
    var keys = LP.fromTimeline(S.plan('mama po, ata.').timeline);
    ok(keys.some(function (k) { return k.v === 'M'; }), 'm / p / b close the lips (M)');
    ok(keys.some(function (k) { return k.v === 'A'; }), 'a opens wide (A)');
    ok(keys.some(function (k) { return k.v === 'O'; }), 'o is rounded (O)');
    ok(keys.some(function (k) { return k.v === 'X'; }), 'pauses rest the mouth (X)');
    ok(keys.every(function (k) { return k.open >= 0 && k.open <= 1.45; }), 'openness stays inside the avatar range');
    eq(LP.keyAt(keys, -1), null, 'no key before the start');
    ok(LP.keyAt(keys, keys[2].t0 + 0.001) !== null, 'keyAt finds a key');
    var est = LP.estimate('Kumusta ka na?', {});
    ok(est.duration > 0.8 && est.keys.length > 5 && est.words.length === 3, 'estimate gives keys, words and a duration', est.duration);
    var pl = new LP.Player(); pl.start(est.keys, 100, { words: est.words });
    var seen = {}, t, m;
    for (t = 100; t < 100 + est.duration + 0.3; t += 1 / 60) { m = pl.mouth(t); seen[m.v] = true; }
    ok(seen.A && seen.X, 'player walks through shapes and ends at rest', Object.keys(seen).join(''));
    ok(pl.out.active === false, 'player reports that it finished');
    var p2 = new LP.Player(); p2.start(est.keys, 0, { scale: 1.5, endless: true, words: est.words });
    p2.anchorWord(1, 0.9); ok(Math.abs(p2.speechTime(0.9) - est.words[1].t0) < 1e-6, 'anchoring re-aligns to a word boundary');
    p2.anchorWord(2, 1.5); ok(p2.scale > 0.4 && p2.scale < 2.5, 'playback speed adapts but stays sane', p2.scale);
    m = p2.mouth(60); ok(m.v !== undefined && m.open >= 0, 'endless mode keeps flapping after the estimate runs out');
    /* without the synthesizer (device-only builds) the estimate still works */
    var bare = loadVoice({ leon: false }).Lipsync.estimate('Kumusta po', {});
    ok(bare.keys.length > 2 && bare.duration > 0.3, 'fallback estimate works without LeonSynth');
    ok(LP.expectedSeconds('Kumusta ka na, bes?', 1) > 1 && LP.expectedSeconds('Kumusta ka na, bes?', 2) < LP.expectedSeconds('Kumusta ka na, bes?', 1), 'expected speaking time scales with rate');
  })();

  /* ------------------------------------------------------------ Sfx */
  H.section('Sound effects');
  (function () {
    var Leon = loadVoice({}), X = Leon.Sfx;
    ok(X.names.length >= 15, 'plenty of effects', X.names.length);
    ['giggle', 'scream', 'sniffle', 'sob', 'pop', 'boing', 'whoosh', 'gasp'].forEach(function (n) { ok(X.names.indexOf(n) >= 0, 'has ' + n); });
    X.names.forEach(function (n) { var s = X.make(n); ok(s && s.duration > 0.05 && s.duration < 3 && finite(s.pcm), n + ' renders (' + (s ? s.duration.toFixed(2) : '-') + ' s)'); });
    ok(X.make('nope') === null, 'unknown effect -> null');
    ok(X.make('giggle').keys.length >= 6, 'giggle has mouth keys');
    eq(X.forGesture('spin'), 'whoosh', 'spin -> whoosh');
    eq(X.forGesture('wiggle'), null, 'wiggle has no sound');
  })();

  /* ------------------------------------------------------------ Voice manager */
  H.section('Voice manager: engine choice');
  (function () {
    eq(loadVoice({ audio: true }).Voice.create({}).engineName(), 'leon', 'no phone voice -> Leon own voice');
    eq(loadVoice({ audio: true, webSpeech: true }).Voice.create({}).engineName(), 'device', 'phone voice available -> device');
    eq(loadVoice({ audio: true, native: true }).Voice.create({}).engineName(), 'device', 'Android bridge -> device');
    eq(loadVoice({ audio: true, webSpeech: true }).Voice.create({ engine: 'leon' }).engineName(), 'leon', 'forced own voice');
    eq(loadVoice({ audio: true }).Voice.create({ engine: 'device' }).engineName(), 'leon', 'device asked but missing -> own voice');
    eq(loadVoice({ audio: true }).Voice.create({ engine: 'off' }).engineName(), 'off', 'off');
    eq(loadVoice({ audio: true, leon: false }).Voice.create({}).engineName(), 'off', 'nothing at all -> off');
    var v = loadVoice({ audio: true, webSpeech: true }).Voice.create({}), vs = v.listVoices();
    ok(/fil|tl/i.test(vs[0].lang), 'Filipino voices are listed first', vs[0].lang);
    eq(v._pickVoice().lang, 'fil-PH', 'picks the Filipino voice');
    eq(loadVoice({ audio: true, webSpeech: true }).Voice.create({ voiceName: 'Google US English' })._pickVoice().name, 'Google US English', 'voice name preference wins');
  })();

  H.section('Voice manager: Leon\'s own voice');
  await (async function () {
    var Leon = loadVoice({ audio: true }), reg = Leon.__reg, v = Leon.Voice.create({ engine: 'leon' });
    ok(v.unlock(), 'unlock creates the audio context');
    var done = null, p = v.speak({ voice: 'Hello po, yarn!', style: 'excited' }).then(function (r) { done = r; });
    await sleep(5);
    eq(reg.sources.length > 0, true, 'an audio source was started');
    var src = reg.sources[reg.sources.length - 1];
    ok(src.buffer.duration > 0.8, 'buffer holds the synthesized speech', src.buffer.duration);
    ok(v.speaking(), 'speaking() is true while it plays');
    reg.ctx.currentTime = 0.04 + 0.35;                                         /* a third of the way in */
    var m = v.mouth(); ok(m.v !== 'X' || m.open >= 0, 'mouth follows the audio clock', m.v);
    var shapes = {}, tt;
    for (tt = 0.05; tt < src.buffer.duration + 0.1; tt += 0.02) { reg.ctx.currentTime = tt; shapes[v.mouth().v] = 1; }
    ok(Object.keys(shapes).length >= 3, 'several mouth shapes were used', Object.keys(shapes).join(''));
    src.onended(); await p;
    ok(done && done.ok && done.engine === 'leon', 'promise resolves when the audio ends', JSON.stringify(done));
    ok(!v.speaking(), 'not speaking afterwards');
    eq(v.mouth().v, 'X', 'mouth rests afterwards');
    /* interruption */
    var first = null; v.speak({ voice: 'Una ito' }).then(function (r) { first = r; });
    await sleep(2); v.speak({ voice: 'Pangalawa ito' }); await sleep(2);
    ok(first && first.cancelled === true, 'a new line cancels the old one');
    ok(reg.sources.filter(function (s) { return s.stopped; }).length >= 1, 'old audio was stopped');
    v.stop(); await sleep(2); ok(!v.speaking(), 'stop() silences everything');
  })();

  H.section('Voice manager: mute semantics');
  await (async function () {
    var Leon = loadVoice({ audio: true }), reg = Leon.__reg, v = Leon.Voice.create({ engine: 'leon' });
    v.setMuted(true);
    var r1 = await v.speak({ voice: 'Hello?' });
    eq(r1.engine, 'none', 'muted + normal line -> nothing happens');
    eq(reg.sources.length, 0, 'muted: no audio source');
    var t0 = Date.now(), r2 = await v.speak({ voice: 'Hello? Bakit walang sound?', mouth: true, silent: true, style: 'normal' });
    ok(r2.engine === 'mouth' && Date.now() - t0 > 300, 'muted + mouth:true -> lips move without sound for a while', r2.engine + ' ' + (Date.now() - t0) + 'ms');
    eq(reg.sources.length, 0, 'mouthing makes no sound');
    var r3 = await v.speak({ voice: 'hindi ito maririnig', silent: true });
    eq(r3.engine, 'none', 'silent line does nothing');
    var r4 = await v.speak({ voice: 'AAAAH!', speak: false });
    eq(r4.engine, 'none', 'speak:false skips the words');
    var s1 = await v.sfx('giggle'); ok(s1.skipped, 'muted: no sound effects');
    v.setMuted(false);
    ok(v.isMuted() === false, 'unmuted');
    var pr = v.speak({ voice: 'Salamat po' }); await sleep(3);
    ok(reg.sources.length >= 1, 'after unmute he makes sound again');
    v.setMuted(true); var cancelled = await pr; ok(cancelled.cancelled === true, 'muting mid-sentence cuts the sound');
    var off = Leon.Voice.create({ engine: 'off' }), t1 = Date.now(), r5 = await off.speak({ voice: 'Kumusta' });
    ok(r5.engine === 'mouth' && Date.now() - t1 > 200, 'engine off still moves the mouth');
  })();

  H.section('Voice manager: device voice');
  await (async function () {
    var Leon = loadVoice({ audio: true, webSpeech: true }), reg = Leon.__reg, v = Leon.Voice.create({ engine: 'device', rate: 1, pitch: 1 });
    var res = null, p = v.speak({ voice: 'Kumusta ka na, bes?', style: 'excited' }).then(function (r) { res = r; });
    await sleep(3);
    eq(reg.spoken.length, 1, 'one utterance was queued');
    var u = reg.spoken[0];
    eq(u.text, 'Kumusta ka na, bes?', 'text is passed unchanged');
    eq(u.lang, 'fil-PH', 'Filipino voice preferred');
    ok(u.rate > 1.0 && u.pitch > 1.3, 'excited speaks faster and higher', u.rate + '/' + u.pitch);
    ok(reg.cancelled >= 1, 'queue cleared before speaking');
    var m1 = v.mouth(); ok(m1.active, 'lips move while the phone speaks');
    u.onboundary({ name: 'word', charIndex: 9 });                              /* "ka" */
    var st = v.player.speechTime(performance.now() / 1000), ka = v.cur.est.words[1];
    ok(Math.abs(st - ka.t0) < 0.2, 'word boundary re-syncs the mouth', st + ' vs ' + ka.t0);
    u.onend(); await p;
    ok(res.ok && res.engine === 'device', 'resolves on end');
    eq(v.mouth().v, 'X', 'rests afterwards');
    var sob = Leon.Voice.create({ engine: 'device' }); sob.speak({ voice: 'Huhu', style: 'sob' }); await sleep(2);
    var us = reg.spoken[reg.spoken.length - 1]; ok(us.rate < 0.9 && us.volume < 0.8, 'sob is slower and quieter', us.rate + '/' + us.volume);
    sob.stop();
  })();

  H.section('Voice manager: Android bridge');
  await (async function () {
    var Leon = loadVoice({ audio: true, native: true }), reg = Leon.__reg, v = Leon.Voice.create({});
    var res = null, p = v.speak({ voice: 'Hello po', style: 'soft' }).then(function (r) { res = r; });
    await sleep(3);
    eq(reg.native.length, 1, 'native speak() called');
    var n = reg.native[0];
    ok(n.text === 'Hello po' && n.rate < 1 && n.lang === 'fil-PH', 'rate / lang forwarded', JSON.stringify(n));
    Leon.Voice.nativeEvent('range', n.id, 6, 8);
    ok(v.mouth().active, 'mouth active during native speech');
    Leon.Voice.nativeEvent('done', 'other-id'); await sleep(2); ok(v.speaking(), 'an event for another utterance is ignored');
    Leon.Voice.nativeEvent('done', n.id); await p;
    ok(res.ok && res.engine === 'device', 'native done resolves');
    v.speak({ voice: 'Isa pa' }); await sleep(2); v.stop(); ok(reg.nativeStops >= 1, 'stop() tells the native side to stop');
  })();

  H.section('Voice manager: sound effects + custom engine');
  await (async function () {
    var Leon = loadVoice({ audio: true }), reg = Leon.__reg, v = Leon.Voice.create({ engine: 'leon' });
    var r = null, p = v.sfx('giggle').then(function (x) { r = x; }); await sleep(3);
    var src = reg.sources[reg.sources.length - 1];
    ok(src && src.buffer.duration > 0.4, 'giggle buffer is playing');
    reg.ctx.currentTime = 0.02 + 0.07; ok(v.mouth().active, 'giggle moves the mouth when nobody is talking');
    src.onended(); await p; ok(r.ok, 'sfx resolves');
    eq((await v.sfx('does-not-exist')).ok, false, 'unknown sfx is harmless');
    var quiet = Leon.Voice.create({ engine: 'leon', sfx: false }); ok((await quiet.sfx('pop')).skipped, 'sfx can be switched off');
    v.registerEngine('mine', function (text) { return Promise.resolve({ pcm: new Float32Array(22050), sampleRate: 22050 }); });
    v.setOptions({ engine: 'mine' }); eq(v.engineName(), 'mine', 'custom engine selectable');
    var cr = null, cp = v.speak({ voice: 'Test ng sariling boses' }).then(function (x) { cr = x; }); await sleep(10);
    var cs = reg.sources[reg.sources.length - 1]; ok(Math.abs(cs.buffer.duration - 1) < 0.01, 'custom PCM is played');
    reg.ctx.currentTime = 0.5; ok(v.mouth().active, 'lip-sync is stretched to the custom audio length');
    cs.onended(); await cp; ok(cr.ok && cr.engine === 'mine', 'custom engine resolves');
  })();

  return H.summary();
}
main().then(function (failed) { process.exit(failed ? 1 : 0); }, function (e) { console.error(e); process.exit(2); });
