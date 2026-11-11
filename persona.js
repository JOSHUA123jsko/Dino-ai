/* Leon Offline — persona.js
 * The composer: turns picked lines into Leon-sounding text.
 *   - "yarn" governor (every normal message gets one; never more than 3; none when serious)
 *   - Filipino-coded exclamations (putragis, tarantado, bruha, sira ulo) used as seasoning:
 *       max per reply, never in serious mode, never as an insult unless trust is high, and a
 *       profanity switch swaps them for harmless ones (hay naku, ay sus...)
 *   - po/opo honorifics, kuya/ate/boss/bes address, line variety (no repeats), voice-friendly text. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var U = L.Util;

  var CURSES = ['Putragis', 'Tarantado', 'Sira ulo', 'Bruha'];
  var SOFT = ['Hay naku', 'Ay sus', 'Naku po', 'Ay kalabaw', 'Ay grabe'];
  var NEUTRAL_CALLS = ['boss', 'bes'];

  var P = {};

  /* ---------- who is Leon talking to ---------- */
  P.callName = function (b) {
    var c = b.state.profile.call || (b.cfg.call && b.cfg.call !== 'auto' ? b.cfg.call : null);
    if (c) return c;
    if (!b.session.autoCall) b.session.autoCall = U.pick(NEUTRAL_CALLS, b.rng);
    return b.session.autoCall;
  };
  P.poOn = function (b) {
    if (b.cfg.honorific === 'always') return true;
    if (b.cfg.honorific === 'never') return false;
    return !!(b.state.profile.usedPo || b.session.usedPo);
  };
  P.vars = function (b, extra) {
    var pr = b.state.profile, po = P.poOn(b), call = P.callName(b);
    var v = {
      name: pr.name || '', call: call, po: po ? ' po' : '', opo: po ? 'Opo' : 'Oo',
      food: pr.food || '', hometown: pr.hometown || '', job: pr.job || '', stress: pr.stress || '',
      callmute: (b.cfg.call === 'auto' && !pr.call) ? 'Kuya/Ate' : call.charAt(0).toUpperCase() + call.slice(1)
    };
    if (extra) for (var k in extra) v[k] = extra[k];
    return v;
  };

  /* ---------- exclamations ---------- */
  P.curseWord = function (b, kind) {
    var on = b.cfg.profanity === 'on' && !b.isSerious();
    var max = b._curseMax || 1;
    if (kind === 'roast') {
      var ok = on && b.state.mood.trust >= 40 && !b.isGentle() && (b._curseCount || 0) < max;
      if (!ok) return 'Grabe';
      var c = P.callName(b), fem = /^(ate|bes|ma'?am|madam)$/.test(c);
      b._curseCount = (b._curseCount || 0) + 1;
      return U.pick(fem ? ['Bruha', 'Sira ulo'] : ['Tarantado', 'Sira ulo'], b.rng);
    }
    if (kind === 'cursebtn') {
      if (!on || (b._curseCount || 0) >= max) return 'Nakakainis';
      b._curseCount = (b._curseCount || 0) + 1;
      return U.pick(['Tarantado', 'Sira ulo'], b.rng);
    }
    if (!on || (b._curseCount || 0) >= max) return U.pick(SOFT, b.rng);
    b._curseCount = (b._curseCount || 0) + 1;
    return U.pick(CURSES, b.rng);
  };

  function atSentenceStart(str, off) { return /(^|[.!?…]\s+|\n)$/.test(str.slice(0, off)) && !/\.\.\.\s*$/.test(str.slice(0, off)); }

  P.fmt = function (b, text, extra) {
    var out = String(text).replace(/\{(curse|cursebtn|roast)\}/g, function (m, kind, off, str) {
      var atStart = /(^|[.!?…]\s*)$/.test(str.slice(0, off));
      var w = P.curseWord(b, kind);
      return atStart ? w : w.charAt(0).toLowerCase() + w.slice(1);
    });
    var v = P.vars(b, extra);
    return out.replace(/\{(\w+)\}/g, function (m, k, off, str) {
      var val = v[k];
      if (val === undefined || val === null) return '';
      val = String(val);
      if (val && /^[a-zà-ÿ]/.test(val) && atSentenceStart(str, off)) val = val.charAt(0).toUpperCase() + val.slice(1);
      return val;
    });
  };

  /* ---------- picking lines without repeating ---------- */
  P.pick = function (b, key, bank, opts) {
    opts = opts || {};
    var prof = b.state.profile, trust = b.state.mood.trust, elig = [], i;
    for (i = 0; i < bank.length; i++) {
      var e = bank[i];
      if (e && typeof e === 'object' && !Array.isArray(e)) {
        if (e.needs && !e.needs.every(function (k) { return !!(prof[k] || (opts.have && opts.have[k])); })) continue;
        if (e.minTrust !== undefined && trust < e.minTrust) continue;
        if (e.maxTrust !== undefined && trust > e.maxTrust) continue;
      }
      elig.push(i);
    }
    if (!elig.length) return null;
    var recent = (b.session.recent[key] = b.session.recent[key] || []);
    var fresh = elig.filter(function (x) { return recent.indexOf(x) < 0; });
    var idx = U.pick(fresh.length ? fresh : elig, b.rng);
    recent.push(idx);
    var keep = Math.max(1, Math.min(6, Math.floor(elig.length / 2)));
    while (recent.length > keep) recent.shift();
    var chosen = bank[idx];
    if (opts.raw) return chosen;
    if (chosen && typeof chosen === 'object' && !Array.isArray(chosen)) return chosen.t;
    return chosen;
  };

  /* pick + format. Sequences (arrays of strings) come back as arrays of formatted strings. */
  P.say = function (b, key, bank, extra, opts) {
    var chosen = P.pick(b, key, bank, opts);
    if (chosen === null || chosen === undefined) return null;
    if (Array.isArray(chosen)) return chosen.map(function (s) { return P.fmt(b, s, extra); });
    return P.fmt(b, chosen, extra);
  };

  /* ---------- yarn governor ---------- */
  var YARN_RE = /\byarn\b/gi;

  function appendYarn(text) {
    var t = String(text).replace(/\s+$/, '');
    if (!t || /[:;][()DPp]+$/.test(t) || /:$/.test(t)) return t;   /* "Sige, ito:" introduces the next beat: leave it */
    var m = /^([\s\S]*?)([.!?…]*)$/.exec(t);
    var body = m[1].replace(/[,;:\s]+$/, ''), punct = m[2];
    if (!body) return t;
    if (/\)$/.test(body) && !punct) return t + ' yarn';
    return body + ', yarn' + (punct || '.');
  }

  function limitYarn(text, max) {
    var hits = [], re = /,?\s*\byarn\b/gi, m;
    while ((m = re.exec(text))) hits.push({ i: m.index, len: m[0].length });
    if (hits.length <= max) return text;
    var drop = hits.slice(0, hits.length - max), out = '', pos = 0;
    drop.forEach(function (h) { out += text.slice(pos, h.i); pos = h.i + h.len; });
    return out + text.slice(pos);
  }

  function stripYarn(text) {
    return String(text).replace(/,?\s*\byarn\b/gi, '').replace(/\s+([.!?,])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();
  }

  function sprinkleYarn(text, rng) {
    var parts = U.sentences(text);
    if (parts.length < 2) return text;
    for (var i = 0; i < parts.length - 1; i++) {
      var s = parts[i];
      if (/\byarn\b/i.test(s) || s.trim().split(/\s+/).length < 4 || (rng || Math.random)() > 0.5) continue;
      var m = /^([\s\S]*?)([.!?…]+)(\s*)$/.exec(s);
      if (m) parts[i] = m[1].replace(/[,;:\s]+$/, '') + ', yarn' + m[2] + m[3];
    }
    return parts.join('');
  }

  P.finish = function (b, text, opts) {
    opts = opts || {};
    if (opts.noYarn || b.isSerious()) return stripYarn(text);
    var mode = b.cfg.yarn || 'normal';
    var n = (text.match(YARN_RE) || []).length, out = text;
    if (n === 0) {
      if (mode !== 'low' || U.chance(0.5, b.rng)) out = appendYarn(out);
    } else if (n > 3) out = limitYarn(out, 3);
    if (mode === 'high') out = sprinkleYarn(out, b.rng);
    return out;
  };

  /* ---------- text the voice can read ---------- */
  P.voiceText = function (text) {
    return String(text)
      .replace(/\*[^*]*\*/g, ' ')
      .replace(/[:;]['-]?[()DPp]+/g, ' ')
      .replace(/(\d+)\s*\/\s*(\d+)/g, '$1 sa $2')
      .replace(/Ate\/Kuya/g, 'Ate o Kuya')
      .replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/²/g, ' squared ')
      .replace(/π/g, ' pi ').replace(/≈/g, ' approximately ').replace(/°/g, ' degrees ')
      .replace(/\s=\s/g, ' equals ').replace(/\s\+\s/g, ' plus ')
      .replace(/(\d)%/g, '$1 percent')
      .replace(/…|\.\.\./g, ', ')
      .replace(/\s*[—–]\s*/g, ', ')
      .replace(/[()"]/g, ' ')
      .replace(/\s*,(\s*,)+/g, ',')
      .replace(/\s+([,.!?])/g, '$1')
      .replace(/\s+/g, ' ')
      .replace(/^[\s,.]+/, '')
      .trim();
  };

  P._appendYarn = appendYarn;
  P._limitYarn = limitYarn;
  P._stripYarn = stripYarn;
  L.Persona = P;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
