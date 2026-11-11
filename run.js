'use strict';
var H = require('./helpers.js'), ok = H.ok, eq = H.eq, mk = H.mk;
var Leon = H.load();

/* ---------------------------------------------------------------- calculator */
H.section('calculator');
(function () {
  var C = Leon.Calc;
  function v(s) { var r = C.parse(s); return r && r.kind === 'expr' ? r.value : (r ? r.kind + ':' + (r.code || '') : null); }
  eq(v('15% of 240'), 36, 'percent of');
  eq(v('sqrt of 144'), 12, 'sqrt of');
  eq(v('kalahati ng 90'), 45, 'kalahati');
  eq(v('what is 12 x 12'), 144, 'x as times');
  eq(v('2+2'), 4, '2+2');
  eq(v('100/0'), 'error:div0', 'div by zero');
  eq(v('1e999*1e999'), null, 'glued letters rejected');
  eq(v('3rd + 4th'), null, 'ordinals rejected');
  eq(v('09/11/2026'), null, 'date is not math');
  eq(v('call me at 0917 899 8727'), null, 'phone is not math');
  eq(v('Nov 9 - 12'), null, 'date range is not math');
  eq(v('1000 + 12%'), 1120, 'VAT-style percent');
  eq(v('1000 - 20%'), 800, 'discount percent');
  eq(v('2^3^2'), 512, 'right-assoc power');
  eq(v('-2^2'), -4, 'unary minus');
  eq(v('0.1+0.2'), 0.30000000000000004, 'float value kept');
  eq(C.parse('0.1+0.2').text, '0.3', 'float text rounded');
  eq(v('sqrt(-4)'), 'error:invalid', 'sqrt negative');
  eq(v('99999999^99999'), 'error:overflow', 'overflow');
  eq(v('I have 3 cats and 4 dogs'), null, 'chat with numbers');
  eq(v('pizza 3 x 4'), null, 'no cue + words -> ignore');
  eq(v('paki compute 45 * 12'), 540, 'Taglish cue');
  var sp = C.parse('split 1250 among 4 with 10% tip');
  ok(sp && sp.kind === 'split' && sp.perPerson === 343.75 && sp.perPersonCeil === 344, 'bill split');
  /* injection safety: no code is ever executed */
  global.__pwned = false;
  ['process.exit()', 'constructor.constructor("global.__pwned=true")()', '__proto__', 'require("fs")', '2+2;global.__pwned=true', 'this.constructor'].forEach(function (s) {
    try { C.parse(s); C.evaluate(s); } catch (e) {}
  });
  ok(!global.__pwned, 'no eval/injection');
  ok(!/\beval\b|\bFunction\s*\(/.test(require('fs').readFileSync(__dirname + '/../src/engine/calc.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')), 'calc.js has no eval/Function');
})();

/* ---------------------------------------------------------------- safety */
H.section('safety');
(function () {
  var S = Leon.Safety;
  var must2 = ['gusto ko nang mamatay', 'I want to kill myself', 'magpapakamatay na ako', 'ayoko na mabuhay', 'I want to end my life', 'sasaktan ko sarili ko', 'i am going to hurt myself tonight', 'plano kong magpakamatay', 'wala nang saysay mabuhay', 'gusto ko nang tapusin ang buhay ko', 'i have a plan to kill myself', 'ayaw ko na mabuhay'];
  var must1 = ['pagod na pagod na ako sa lahat, wala na akong pag-asa', 'i feel so hopeless', 'wala na akong pakialam kung mawala ako', 'nobody would miss me', 'sana mawala na lang ako', 'i feel like a burden to everyone'];
  var never = ['mamatay ako sa hiya', 'mamatay na sa tawa', 'patay na patay ako sa crush ko', 'kill the process in terminal', 'ang cute mo, mamatay na ako sa kilig', 'to die for ang pizza na yan', 'this exam is killing me haha', 'i could die of embarrassment', 'patayin mo yung ilaw', 'how do I kill a python process', 'tawang tawa ako, mamamatay na ko', 'dead na ako sa kakatawa', 'what is the death rate of dengue', 'ang sarap, ikamamatay ko', 'pagod na ako sa trabaho', 'sobrang pagod ako today', 'nakakainis ang traffic', 'i am so tired of this', 'nakakamatay yung init'];
  must2.forEach(function (t) { ok(S.assess(t).level >= 2, 'L2: ' + t, 'level ' + S.assess(t).level); });
  must1.forEach(function (t) { ok(S.assess(t).level >= 1, 'L1: ' + t, 'level ' + S.assess(t).level); });
  never.forEach(function (t) { ok(S.assess(t).level === 0, 'idiom ok: ' + t, 'level ' + S.assess(t).level + ' hit=' + S.assess(t).hit); });
  var rl = S.resourceLine({ region: 'PH' });
  ok(/1553/.test(rl) && /0917 558 4673/.test(rl) && /911/.test(rl), 'PH resource line has verified numbers', rl);
  ok(!/2919/.test(rl), '2919 deliberately omitted');
})();

/* ---------------------------------------------------------------- persona */
H.section('persona');
(function () {
  var b = mk(); var P = b.Leon.Persona;
  eq(P._appendYarn('Hello po.'), 'Hello po, yarn.', 'yarn before the period');
  eq(P._appendYarn('Ready ka na ba?'), 'Ready ka na ba, yarn?', 'yarn before question mark');
  eq(P._appendYarn('Wow :)'), 'Wow :)', 'no yarn after emoticon');
  eq(P._limitYarn('a, yarn. b, yarn. c, yarn. d, yarn.', 3).match(/yarn/g).length, 3, 'max 3 yarn');
  eq(P._stripYarn('Hello, yarn.'), 'Hello.', 'strip yarn');
  eq(P.voiceText('8/10 ang quality :) *sniff* = 5'), '8 sa 10 ang quality equals 5', 'voice cleanup');
  eq(P.voiceText('15% of 240'), '15 percent of 240', 'voice percent');
  /* curse policy */
  b.cfg.profanity = 'on'; b._curseCount = 0; b._curseMax = 1;
  var a = P.fmt(b, '{curse}, ang init. {curse}, grabe.');
  ok(/^(Putragis|Tarantado|Sira ulo|Bruha)/.test(a), 'first curse is real', a);
  ok(!/(putragis|tarantado|sira ulo|bruha)/i.test(a.slice(10)), 'only one curse per reply', a);
  b.cfg.profanity = 'off'; b._curseCount = 0;
  ok(!/(putragis|tarantado|sira ulo|bruha)/i.test(P.fmt(b, '{curse}! {cursebtn}! {roast}!')), 'profanity off = clean');
  b.cfg.profanity = 'on'; b._curseCount = 0; b.state.mood.trust = 10;
  eq(P.fmt(b, '{roast}'), 'Grabe', 'roast curse needs trust');
  b.state.mood.trust = 60; b._curseCount = 0;
  ok(/^(Putragis|Tarantado|Sira ulo|Bruha)/.test(P.fmt(b, '{roast}')) || /^(Tarantado|Sira ulo|Bruha)/.test(P.fmt(b, '{roast}')), 'roast curse at high trust');
  b.session.seriousTurns = 3; b._curseCount = 0;
  ok(!/(putragis|tarantado|sira ulo|bruha)/i.test(P.fmt(b, '{curse} {cursebtn} {roast}')), 'serious mode: no curses');
})();

require('./run_brain.js')(H, Leon);
process.exit(H.summary() ? 1 : 0);
