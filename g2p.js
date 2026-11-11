/* Leon Offline — g2p.js
 * Text -> phonemes for Leon's voice and lip-sync. Rule-based "Filipino orthography" (Tagalog spelling is almost
 * phonetic) plus a small lexicon of English words, numbers and letters, so Taglish sounds like a Filipino speaker
 * reading it. Phones: vowels a e i o u @(schwa) | consonants p b t d k g m n N(ng) f v s z S(sh) h tS dZ l r w y.
 * A leading ' marks a stressed vowel in lexicon entries. No DOM, no network. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var G = L.G2P = {};

  /* ---------------- lexicon (phones separated by spaces) ---------------- */
  var LEX = {
    /* Leon's own words */
    yarn: "y 'a r n", leon: "l 'e o n", dino: "d 'a y n o", charot: "tS a r 'o t", hehe: "h 'e h e", huhu: "h 'u h u", hmm: "'@ m", hm: "'@ m", mm: "'@ m", ahh: "'a", ah: "'a", aaah: "'a", ay: "'a y", uy: "'u y", po: "p 'o", opo: "o p 'o",
    science: "s 'a y @ n s", scientist: "s 'a y @ n t i s t", scientific: "s a y @ n t 'i f i k", scientifically: "s a y @ n t 'i f i k @ l i", math: "m 'a t", okay: "o k 'e y", ok: "o k 'e y",
    joke: "dZ 'o w k", jokes: "dZ 'o w k s", fact: "f 'a k t", facts: "f 'a k t s", quote: "k w 'o w t", quotes: "k w 'o w t s", call: "k 'o l", sorry: "s 'o r i", earth: "'e r t", time: "t 'a y m",
    data: "d 'e y t a", volume: "v 'o l y u m", estimate: "'e s t i m e y t", promise: "p r 'o m i s", offline: "'o f l a y n", online: "'o n l a y n", phone: "f 'o w n", level: "l 'e v @ l", number: "n 'a m b e r",
    gravity: "g r 'a v i t i", name: "n 'e y m", mode: "m 'o w d", water: "w 'o t e r", curse: "k 'e r s", love: "l 'a v", derivative: "d e r 'i v a t i v", variable: "v 'e r i a b @ l", zero: "z 'i r o",
    atmosphere: "'a t m o s f i r", electron: "i l 'e k t r o n", electrons: "i l 'e k t r o n s", atom: "'a t @ m", calculator: "k 'a l k y u l e y t e r", compute: "k @ m p y 'u t", engine: "'e n dZ i n",
    universe: "y 'u n i v e r s", equation: "i k w 'e y S @ n", explanation: "e k s p l a n 'e y S @ n", feelings: "f 'i l i N s", crush: "k r 'a S", mute: "m 'y u t", unmute: "a n m 'y u t", silence: "s 'a y l @ n s",
    sure: "S 'u r", please: "p l 'i z", thanks: "t 'a N k s", thank: "t 'a N k", hello: "h e l 'o w", hi: "h 'a y", hey: "h 'e y", bye: "b 'a y", good: "g 'u d", great: "g r 'e y t", nice: "n 'a y s", cute: "k y 'u t", cool: "k 'u l",
    funny: "f 'a n i", fun: "f 'a n", free: "f r 'i", real: "r 'i @ l", really: "r 'i l i", very: "v 'e r i", just: "dZ 'a s t", yes: "y 'e s", no: "n 'o w", not: "n 'o t", now: "n 'a w", new: "n 'u", know: "n 'o w", knows: "n 'o w z",
    /* function words */
    the: "d @", a: "@", an: "a n", and: "a n d", of: "o v", to: "t u", too: "t 'u", you: "y u", your: "y o r", youre: "y u r", we: "w i", were: "w e r", i: "'a y", im: "a y m", ill: "a y l", ive: "a y v", id: "a y d",
    is: "i z", it: "i t", its: "i t s", in: "i n", on: "o n", at: "a t", as: "a z", be: "b i", or: "o r", if: "i f", so: "s 'o w", do: "d u", does: "d 'a z", did: "d i d", dont: "d 'o w n t", cant: "k 'a n t", wont: "w 'o w n t", isnt: "'i z @ n t",
    thats: "d a t s", whats: "w 'a t s", lets: "l 'e t s", heres: "h 'i r z", theres: "d 'e r z", can: "k a n", will: "w i l", with: "w i t", for: "f o r", from: "f r 'a m", by: "b 'a y", my: "m 'a y", me: "m 'i", he: "h 'i", she: "S 'i",
    that: "d a t", this: "d i s", there: "d 'e r", they: "d 'e y", them: "d e m", then: "d 'e n", these: "d 'i z", those: "d 'o w z", than: "d a n", what: "w 'a t", when: "w 'e n", where: "w 'e r", which: "w 'i tS", who: "h 'u", why: "w 'a y", how: "h 'a w",
    are: "'a r", am: "a m", have: "h a v", has: "h a z", had: "h a d", was: "w a z", been: "b i n", would: "w u d", could: "k u d", should: "S u d", one: "w 'a n", only: "'o w n l i", also: "'o l s o", more: "m 'o r", some: "s 'a m", any: "'e n i", all: "'o l",
    out: "'a w t", up: "'a p", down: "d 'a w n", over: "'o w v e r", about: "@ b 'a w t", because: "b i k 'o z", but: "b 'a t", maybe: "m 'e y b i", again: "@ g 'e n", ready: "r 'e d i", home: "h 'o w m", here: "h 'i r", same: "s 'e y m",
    /* words that show up in Leon's talk */
    pone: "p 'o w n", warning: "w 'o r n i N", comfort: "k 'a m f e r t", charge: "tS 'a r dZ", charger: "tS 'a r dZ e r", reboot: "r i b 'u t", screen: "s k r 'i n", screenshot: "s k r 'i n S o t", scroll: "s k r 'o w l",
    answer: "'a n s e r", solve: "s 'o l v", solution: "s o l 'u S @ n", slope: "s l 'o w p", graph: "g r 'a f", curve: "k 'e r v", formula: "f 'o r m y u l a", theory: "t 'i o r i", physics: "f 'i z i k s", chemistry: "k 'e m i s t r i",
    energy: "'e n e r dZ i", light: "l 'a y t", sunlight: "s 'a n l a y t", sunflower: "s 'a n f l a w e r", green: "g r 'i n", purple: "p 'e r p @ l", blue: "b l 'u", red: "r 'e d", yellow: "y 'e l o w", orange: "'o r i n dZ", black: "b l 'a k", white: "w 'a y t",
    average: "'a v e r i dZ", percent: "p e r s 'e n t", degrees: "d i g r 'i z", prime: "p r 'a y m", pi: "p 'a y", cube: "k y 'u b", area: "'e r i a", circle: "s 'e r k @ l", equal: "'i k w @ l", positive: "p 'o z i t i v", negative: "n 'e g a t i v",
    minus: "m 'a y n @ s", plus: "p l 'a s", times: "t 'a y m z", divided: "d i v 'a y d e d", point: "p 'o y n t", equals: "'i k w @ l z", total: "t 'o w t @ l", split: "s p l 'i t", tip: "t 'i p", round: "r 'a w n d", half: "h 'a f",
    boss: "b 'o s", bes: "b 'e s", sir: "s 'e r", maam: "m 'a m", kuya: "k 'u y a", dear: "d 'i r", friend: "f r 'e n d", friends: "f r 'e n d z", barkada: "b a r k 'a d a", filipino: "f i l i p 'i n o", pinoy: "p 'i n o y",
    jeepney: "dZ 'i p n i", jeep: "dZ 'i p", traffic: "t r 'a f i k", coffee: "k 'o f i", kape: "k 'a p e", lunch: "l 'a n tS", dinner: "d 'i n e r", merienda: "m e r i 'e n d a", snack: "s n 'a k", rice: "r 'a y s", adobo: "a d 'o b o", sinigang: "s i n i g 'a N",
    hour: "'a w e r", minute: "m 'i n i t", second: "s 'e k @ n d", morning: "m 'o r n i N", afternoon: "a f t e r n 'u n", evening: "'i v n i N", night: "n 'a y t", today: "t u d 'e y", tomorrow: "t u m 'o r o w", sleep: "s l 'i p",
    imagination: "i m a dZ i n 'e y S @ n", experiment: "i k s p 'e r i m @ n t", hypothesis: "h a y p 'o t e s i s", reaction: "r i 'a k S @ n", pressure: "p r 'e S e r", vacuum: "v 'a k y u m", carbon: "k 'a r b @ n", fibonacci: "f i b o n 'a tS i",
    probability: "p r o b a b 'i l i t i", entropy: "'e n t r o p i", integral: "'i n t e g r @ l", irrational: "i r 'a S @ n @ l", constant: "k 'o n s t @ n t", asymptote: "'a s i m p t o w t", deviation: "d i v i 'e y S @ n",
    superposition: "s u p e r p o z 'i S @ n", catalyst: "k 'a t a l i s t", photosynthesis: "f o t o s 'i n t e s i s", electricity: "i l e k t r 'i s i t i", equator: "i k w 'e y t e r", vibration: "v a y b r 'e y S @ n",
    /* numbers */
    two: "t 'u", three: "t r 'i", four: "f 'o r", five: "f 'a y v", six: "s 'i k s", seven: "s 'e v @ n", eight: "'e y t", nine: "n 'a y n", ten: "t 'e n", eleven: "i l 'e v @ n", twelve: "t w 'e l v",
    thirteen: "t e r t 'i n", fourteen: "f o r t 'i n", fifteen: "f i f t 'i n", sixteen: "s i k s t 'i n", seventeen: "s e v @ n t 'i n", eighteen: "e y t 'i n", nineteen: "n a y n t 'i n",
    twenty: "t w 'e n t i", thirty: "t 'e r t i", forty: "f 'o r t i", fifty: "f 'i f t i", sixty: "s 'i k s t i", seventy: "s 'e v @ n t i", eighty: "'e y t i", ninety: "n 'a y n t i",
    hundred: "h 'a n d r @ d", thousand: "t 'a w z @ n d", million: "m 'i l y @ n", billion: "b 'i l y @ n", oh: "'o w",
    /* Filipino function words the rules would get wrong */
    mga: "m a N 'a", ng: "n a N", sa: "s a", ang: "'a N", nang: "n 'a N", ngayon: "N 'a y o n"
  };
  /* spelled-out letters (for NCMH, PH, AI ...) */
  var LETTERS = { a: "'e y", b: "b 'i", c: "s 'i", d: "d 'i", e: "'i", f: "'e f", g: "dZ 'i", h: "'e y tS", i: "'a y", j: "dZ 'e y", k: "k 'e y", l: "'e l", m: "'e m", n: "'e n", o: "'o w", p: "p 'i", q: "k y 'u", r: "'a r", s: "'e s", t: "t 'i", u: "y 'u", v: "v 'i", w: "d 'a b @ l y u", x: "'e k s", y: "w 'a y", z: "z 'i" };
  var DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  var ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  function below1000(n) {
    var w = [];
    if (n >= 100) { w.push(ONES[Math.floor(n / 100)], 'hundred'); n %= 100; }
    if (n >= 20) { w.push(TENS[Math.floor(n / 10)]); n %= 10; if (n) w.push(ONES[n]); }
    else if (n > 0) w.push(ONES[n]);
    return w;
  }
  /* integer (as a digit string) -> English number words */
  G.numberWords = function (digits) {
    digits = String(digits).replace(/^0+(?=\d)/, '');
    if (digits.length > 12) return digits.split('').map(function (d) { return DIGITS[+d]; });
    var n = parseInt(digits, 10);
    if (n === 0) return ['zero'];
    var w = [], parts = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];
    parts.forEach(function (p) { if (n >= p[0]) { w = w.concat(below1000(Math.floor(n / p[0])), p[1]); n %= p[0]; } });
    return w.concat(below1000(n));
  };
  function spellDigits(s) { return s.split('').filter(function (c) { return /\d/.test(c); }).map(function (d) { return DIGITS[+d]; }); }

  /* ---------------- letter-to-sound rules (Filipino orthography + a few English patterns) ---------------- */
  var VOW = { a: 1, e: 1, i: 1, o: 1, u: 1 };
  function isV(c) { return !!VOW[c]; }
  function rules(w) {
    var out = [], i = 0, n = w.length;
    while (i < n) {
      var c = w[i], c2 = w[i + 1] || '', c3 = w[i + 2] || '', prev = w[i - 1] || '';
      var two = c + c2;
      if (w.substr(i, 4) === 'tion' && i > 0) { out.push('S', '@', 'n'); i += 4; continue; }
      if (two === 'ng') { out.push('N'); i += 2; continue; }
      if (two === 'ch') { out.push('tS'); i += 2; continue; }
      if (two === 'sh') { out.push('S'); i += 2; continue; }
      if (two === 'th') { out.push('t'); i += 2; continue; }
      if (two === 'ph') { out.push('f'); i += 2; continue; }
      if (two === 'ck') { out.push('k'); i += 2; continue; }
      if (two === 'qu') { out.push('k', 'w'); i += 2; continue; }
      if (two === 'gh') { i += 2; continue; }
      if (two === 'wh') { out.push('w'); i += 2; continue; }
      if (i === 0 && (two === 'kn' || two === 'wr')) { i += 1; continue; }
      if (two === 'ee') { out.push('i'); i += 2; continue; }
      if (two === 'oo') { out.push('u'); i += 2; continue; }
      if (two === 'ou' && !isV(c3)) { out.push('a', 'w'); i += 2; continue; }
      if (c === c2 && !isV(c) && c !== 'n') { i += 1; continue; }              /* double consonants */
      if (c === 'y') { out.push(isV(c2) || (i === 0) ? 'y' : (isV(prev) ? 'y' : 'i')); i++; continue; }
      if (c === 'w') { out.push('w'); i++; continue; }
      if (c === 'c') { out.push(/[eiy]/.test(c2) ? 's' : 'k'); i++; continue; }
      if (c === 'x') { out.push('k', 's'); i++; continue; }
      if (c === 'q') { out.push('k'); i++; continue; }
      if (c === 'j') { out.push('dZ'); i++; continue; }
      if (c === 'ñ') { out.push('n', 'y'); i++; continue; }
      if (c === 'z') { out.push('z'); i++; continue; }
      if (/[abdefghiklmnoprstuv]/.test(c)) { out.push(c); i++; continue; }
      i++;                                                                   /* anything else is skipped */
    }
    return out;
  }
  function stressify(tokens) {
    var idx = [];
    tokens.forEach(function (t, k) { if (/^'?[aeiou@]$/.test(t.p)) idx.push(k); });
    var any = tokens.some(function (t) { return t.st; });
    if (any || !idx.length) return;
    var pick = idx.length >= 2 ? idx[idx.length - 2] : idx[0];
    if (idx.length === 1 && tokens.length <= 2) return;                       /* tiny function-like words stay unstressed */
    tokens[pick].st = 1;
  }
  function parseLex(s) {
    return s.split(' ').filter(Boolean).map(function (p) { return p.charAt(0) === "'" ? { p: p.slice(1), st: 1 } : { p: p, st: 0 }; });
  }
  /* "aaaah", "hmmmm", "yessss": 3+ repeats collapse to one long sound (double vowels like "maaga" stay two syllables) */
  G.word = function (w) {                                                    /* lowercase letters -> [{p, st, lng?}] */
    var lenC = null, base = w.replace(/([a-zñ])\1{2,}/g, function (m, c) { if (!lenC) lenC = c; return c; });
    if (lenC && /^[aeiou]$/.test(lenC) === false && lenC !== 'h' && base.length < 2) lenC = null;
    var toks = LEX.hasOwnProperty(base) ? parseLex(LEX[base]) : (function () { var t = rules(base).map(function (p) { return { p: p, st: 0 }; }); stressify(t); return t; })();
    if (lenC) {
      var k = -1, i;
      if (lenC === 'h') { for (i = toks.length - 1; i >= 0; i--) if (/^[aeiou@]$/.test(toks[i].p)) { k = i; break; } }
      else for (i = 0; i < toks.length; i++) if (toks[i].p === lenC) { k = i; break; }
      if (k >= 0) { toks[k].lng = 2.4; if (/^[aeiou@]$/.test(toks[k].p)) toks[k].st = 1; }
    }
    return toks;
  };

  /* ---------------- text -> token stream ---------------- */
  var PAUSE = { ',': 170, ';': 230, ':': 210, '.': 330, '?': 360, '!': 310, '…': 430 };
  var SYMBOLS = { '%': ['percent'], '&': ['and'], '+': ['plus'], '=': ['equals'], '\u00d7': ['times'], '\u00f7': ['divided', 'by'], '@': ['at'], '#': ['number'], '\u00b0': ['degrees'], '\u03c0': ['pi'] };
  var RE = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ']*)|(\d+(?:[.,:]\d+)*)|(\.{2,}|…|[.,!?;:])|(\s+)|([^\sA-Za-z\d])/g;

  /* returns {tokens:[{p, st, w, end?}], words:[{text, start, end, first, last}]}
   * pauses are {p:'_', ms, w:-1}. token.end is '.', '?' or '!' on the last token before a sentence break. */
  G.phonemize = function (text) {
    var src = String(text || ''), tokens = [], words = [], m, lastTok = null, phoneRuns = [], pm;
    var PHONE = /(?:\(\d{2,4}\)\s?)?\b\d{3,4}[ -]\d{3,4}(?:[ -]\d{3,4})?\b/g;     /* 0917 899 8727, (02) 8804 4673 */
    while ((pm = PHONE.exec(src))) phoneRuns.push([pm.index, pm.index + pm[0].length]);
    function inPhone(i) { return phoneRuns.some(function (r) { return i >= r[0] && i < r[1]; }); }
    function pushWord(textWord, start, end, phones, caps) {
      if (!phones.length) return;
      var wi = words.length, first = tokens.length;
      phones.forEach(function (ph) { var t = { p: ph.p, st: ph.st || 0, w: wi }; if (ph.lng) t.lng = ph.lng; if (caps) t.caps = 1; tokens.push(t); });
      words.push({ text: textWord, start: start, end: end, first: first, last: tokens.length - 1, caps: !!caps });
    }
    function pushNumberWords(list, start, end, label) {
      var ph = []; list.forEach(function (wd) { ph = ph.concat(G.word(wd)); });
      pushWord(label, start, end, ph);
    }
    RE.lastIndex = 0;
    while ((m = RE.exec(src))) {
      var start = m.index, end = start + m[0].length;
      if (m[1]) {
        var raw = m[1], parts = raw.split("'").join('').toLowerCase();
        if (/^[A-Z]{2,5}$/.test(raw) && !/[AEIOU]/.test(raw.replace(/^AI$/, 'B')) || /^(AI|PH|OK|TV|DM|GPS|USB)$/.test(raw) && raw !== 'OK') {
          var ph = []; raw.toLowerCase().split('').forEach(function (ch) { ph = ph.concat(parseLex(LETTERS[ch] || '')); });
          pushWord(raw, start, end, ph);
        } else pushWord(raw, start, end, G.word(parts.replace(/[^a-zñ]/g, '')), raw.length >= 2 && raw === raw.toUpperCase() && /[A-Z]/.test(raw));
      } else if (m[2]) {
        var d = m[2];
        if (/^\d{1,2}:\d{2}$/.test(d)) {                                       /* clock time */
          var hm = d.split(':'), words2 = G.numberWords(hm[0]);
          if (hm[1] !== '00') words2 = words2.concat(hm[1].charAt(0) === '0' ? ['oh', DIGITS[+hm[1].charAt(1)]] : G.numberWords(hm[1]));
          pushNumberWords(words2, start, end, d);
        } else {
          var clean = d.replace(/,(?=\d{3}(?:\D|$))/g, '');
          if (/^\d+\.\d+$/.test(clean)) {
            var ip = clean.split('.');
            pushNumberWords(G.numberWords(ip[0]).concat(['point'], spellDigits(ip[1])), start, end, d);
          } else if (/^\d+$/.test(clean)) {
            var bare = clean.length >= 4 && !/^(19|20)\d\d$/.test(clean) || clean === '911' || clean.charAt(0) === '0' || inPhone(start);
            pushNumberWords(bare ? spellDigits(clean) : G.numberWords(clean), start, end, d);   /* phone numbers and hotlines are read digit by digit */
          } else pushNumberWords(spellDigits(d), start, end, d);
        }
      } else if (m[3]) {
        var ch = m[3].length > 1 ? '…' : m[3];
        if (lastTok && lastTok.p !== '_') { if (ch === '.' || ch === '?' || ch === '!') lastTok.end = ch; else if (ch === '…') lastTok.end = '.'; else lastTok.phr = ch; }
        if (tokens.length) tokens.push({ p: '_', ms: PAUSE[ch] || 200, w: -1, punct: ch });
      } else if (m[5]) {
        var sym = SYMBOLS[m[5]];
        if (sym) pushNumberWords(sym, start, end, m[5]);
      }
      lastTok = tokens.length ? tokens[tokens.length - 1] : null;
    }
    /* do not end on a pause */
    return { tokens: tokens, words: words, text: src };
  };

  G.LEXICON_SIZE = Object.keys(LEX).length;
  G.PHONES = 'a e i o u @ p b t d k g m n N f v s z S h tS dZ l r w y'.split(' ');
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
