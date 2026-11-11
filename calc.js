/* Leon Offline — calc.js
 * Safe calculator: recursive-descent parser, NO eval(), NO Function().
 * Understands symbols and Taglish/English words:
 *   "12 x 7", "15% of 240", "sqrt of 144", "2^10", "kalahati ng 90", "split 1250 among 4 with 10% tip" */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};

  var FUNCS = { sqrt: Math.sqrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil };
  var CONSTS = { pi: Math.PI };

  function DivZero() { this.name = 'DivZero'; this.message = 'division by zero'; }
  DivZero.prototype = Object.create(Error.prototype);

  /* ---------- tokenizer (lenient: unknown words become 'word' tokens) ---------- */
  function lex(src) {
    var toks = [], i = 0, m, rest;
    while (i < src.length) {
      var ch = src.charAt(i);
      if (/\s/.test(ch)) { i++; continue; }
      rest = src.slice(i);
      if ((m = /^(?:\d+(?:\.\d+)?|\.\d+)/.exec(rest))) { toks.push({ t: 'num', v: parseFloat(m[0]), s: m[0], p: i, e: i + m[0].length }); i += m[0].length; continue; }
      if ((m = /^[a-z]+/.exec(rest))) {
        var w = m[0];
        if (FUNCS.hasOwnProperty(w)) toks.push({ t: 'fn', v: w, s: w, p: i, e: i + w.length });
        else if (CONSTS.hasOwnProperty(w)) toks.push({ t: 'num', v: CONSTS[w], s: w, p: i, e: i + w.length });
        else toks.push({ t: 'word', v: w, s: w, p: i, e: i + w.length });
        i += w.length; continue;
      }
      if ('+-*/^()%'.indexOf(ch) >= 0) { toks.push({ t: 'op', v: ch, s: ch, p: i, e: i + 1 }); i++; continue; }
      toks.push({ t: 'word', v: ch, s: ch, p: i, e: i + 1 }); i++;
    }
    return toks;
  }

  /* ---------- parser ---------- */
  function evaluateTokens(tokens) {
    var p = 0, pctLit = false;
    function eat(v) {
      var t = tokens[p];
      if (t && t.t === 'op' && t.v === v) { p++; return true; }
      return false;
    }
    function expr() {
      var v = term(), r;
      for (;;) {
        if (eat('+')) { r = term(); v += pctLit ? v * r : r; }       /* 1000 + 12%  ->  1120 */
        else if (eat('-')) { r = term(); v -= pctLit ? v * r : r; }  /* 1000 - 20%  ->  800  */
        else return v;
      }
    }
    function term() {
      var v = unary(), pure = pctLit;
      for (;;) {
        if (eat('*')) { v *= unary(); pure = false; }
        else if (eat('/')) { var d = unary(); if (d === 0) throw new DivZero(); v /= d; pure = false; }
        else { pctLit = pure; return v; }
      }
    }
    function unary() {
      if (eat('-')) return -unary();
      if (eat('+')) return unary();
      return power();
    }
    function power() {
      var base = postfix();
      if (eat('^')) return Math.pow(base, unary());
      return base;
    }
    function postfix() {
      var start = p, v = primary(), lit = tokens[start].t === 'num' && p === start + 1;
      pctLit = false;
      while (eat('%')) { v = v / 100; pctLit = lit; }
      return v;
    }
    function primary() {
      var t = tokens[p];
      if (!t) throw new Error('unexpected end');
      if (t.t === 'num') { p++; return t.v; }
      if (t.t === 'fn') {
        p++;
        if (!eat('(')) throw new Error('function needs (');
        var a = expr();
        if (!eat(')')) throw new Error('missing )');
        return FUNCS[t.v](a);
      }
      if (t.t === 'op' && t.v === '(') {
        p++;
        var v = expr();
        if (!eat(')')) throw new Error('missing )');
        return v;
      }
      throw new Error('unexpected token');
    }
    var out = expr();
    if (p !== tokens.length) throw new Error('trailing tokens');
    return out;
  }

  /* ---------- number formatting ---------- */
  function addCommas(intStr) { return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmtNum(n) {
    if (!isFinite(n)) return String(n);
    var abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e15 || abs < 1e-6)) return n.toExponential(4).replace(/\.?0+e/, 'e');
    var s = String(Math.round(n * 1e6) / 1e6);
    if (/e/i.test(s)) return s;
    var neg = s.charAt(0) === '-';
    if (neg) s = s.slice(1);
    var parts = s.split('.');
    parts[0] = addCommas(parts[0]);
    return (neg ? '-' : '') + parts.join('.');
  }

  /* ---------- natural-language -> symbols ---------- */
  var RULES = [
    [/(\d+(?:\.\d+)?)\s*(?:%|percent|porsyento|porsiyento)\s*(?:of|ng)\s*(\d+(?:\.\d+)?)/g, '($1/100*$2)'],
    [/\b(?:half|kalahati)\s*(?:of|ng)\s*(\d+(?:\.\d+)?)/g, '($1/2)'],
    [/\b(?:square\s*root|sqrt|ugat)\s*(?:of|ng)?\s*(\d+(?:\.\d+)?)/g, 'sqrt($1)'],
    [/\bsquared\b/g, '^2'],
    [/\bcubed\b/g, '^3'],
    [/\b(?:to the power of|raised to|power of)\b/g, '^'],
    [/\b(?:multiplied by|multiply by|times|beses)\b/g, '*'],
    [/\b(?:divided by|divide by|over|hatiin sa|hati sa)\b/g, '/'],
    [/\b(?:plus|dagdag|add)\b/g, '+'],
    [/\b(?:minus|bawas|subtract)\b/g, '-'],
    [/(\d)\s*x\s*(?=\d)/g, '$1*'],
    [/(\d)\s*x\s*(?=\d)/g, '$1*']
  ];

  function preprocess(raw) {
    var s = String(raw).toLowerCase();
    s = s.replace(/[₱$€£]/g, ' ').replace(/[×✕]/g, '*').replace(/÷/g, '/').replace(/[–—−]/g, '-');
    s = s.replace(/(\d),(?=\d{3}(?!\d))/g, '$1');
    s = s.replace(/\bphp\s*(?=\d)/g, ' ');
    for (var i = 0; i < RULES.length; i++) s = s.replace(RULES[i][0], RULES[i][1]);
    return s;
  }

  var FILLER = /\b(po|opo|ba|lang|naman|please|pls|plis|leon|hey|hi|hello|yarn|kuya|ate|boss|bes|pare|sir|ma'?am|uy|oy)\b/g;
  var CUE = /\b(compute|calculate|calc|solve|what is|whats|what's|how much|magkano|ilan|pila|equals?|sagutin|answer|ano ang|ano po ang|paki[- ]?(?:compute|calculate|solve)|pa[- ]?(?:compute|solve|calculate))\b|=/;

  function pretty(tokens) {
    var out = '', prev = null;
    tokens.forEach(function (t) {
      var txt = t.t === 'op' ? (t.v === '*' ? '×' : (t.v === '/' ? '÷' : t.v)) : t.s;
      if (t.t === 'num' && /^\d{4,}(\.\d+)?$/.test(t.s)) txt = addCommas(t.s.split('.')[0]) + (t.s.indexOf('.') >= 0 ? '.' + t.s.split('.')[1] : '');
      var unary = prev && prev.t === 'op' && (prev.v === '-' || prev.v === '+') && prev.unary;
      var needSpace = out && !unary && !(t.t === 'op' && (t.v === '%' || t.v === '^' || t.v === ')')) && !(prev && prev.t === 'op' && (prev.v === '(' || prev.v === '^')) && !(t.t === 'op' && t.v === '(' && prev && prev.t === 'fn');
      out += (needSpace ? ' ' : '') + txt;
      if (t.t === 'op' && (t.v === '-' || t.v === '+')) t.unary = !prev || (prev.t === 'op' && prev.v !== ')' && prev.v !== '%');
      prev = t;
    });
    return out;
  }

  /* "(15 ÷ 100 × 240)" -> "15% of 240", "sqrt (144)" -> "√144", "(90 ÷ 2)" -> "half of 90" */
  function label(txt) {
    return txt
      .replace(/\((\d+(?:\.\d+)?) ÷ 100 × (\d+(?:\.\d+)?)\)/g, '$1% of $2')
      .replace(/\((\d+(?:\.\d+)?) ÷ 2\)/g, 'half of $1')
      .replace(/sqrt\s*\((\d+(?:\.\d+)?)\)/g, '√$1')
      .replace(/sqrt\s*\(/g, '√(');
  }

  function trimRun(run) {
    while (run.length && run[0].t === 'op' && '(-+'.indexOf(run[0].v) < 0) run.shift();
    while (run.length && run[run.length - 1].t === 'op' && run[run.length - 1].v !== ')' && run[run.length - 1].v !== '%') run.pop();
    return run;
  }

  /* Split tokens into runs of math tokens separated by words. A run that has a letter glued to it
   * ("1e999", "3rd", "5km") is thrown away, so Leon never "solves" something he misread. */
  function findRuns(toks) {
    var runs = [], cur = [], poisonNext = false;
    function flush() { if (cur.length) { if (cur.bad) cur = []; else runs.push(cur); } cur = []; }
    toks.forEach(function (t, j) {
      if (t.t === 'word') {
        var prev = toks[j - 1], next = toks[j + 1];
        if (prev && prev.t !== 'word' && prev.e === t.p && cur.length) cur.bad = true;
        flush();
        poisonNext = !!(next && next.t !== 'word' && next.p === t.e);
      } else {
        if (!cur.length && poisonNext) { cur.bad = true; poisonNext = false; }
        cur.push(t);
      }
    });
    flush();
    return runs;
  }

  function parseSplit(lower) {
    var m = /(?:split|hati(?:in)?|share)\s+(?:the\s+)?(?:bill\s+)?(?:of\s+)?(?:₱|php\s*)?(\d[\d,]*(?:\.\d+)?)\s*(?:pesos?)?\s*(?:among|between|by|with|sa|for|kina|into)\s+(\d+)\b/.exec(lower);
    if (!m) return null;
    var total = parseFloat(m[1].replace(/,/g, ''));
    var people = parseInt(m[2], 10);
    if (!isFinite(total) || people < 1 || people > 500) return null;
    var tip = 0;
    var tm = /(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:tip|service)|(?:tip|service)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(?:%|percent)?/.exec(lower);
    if (tm) tip = parseFloat(tm[1] || tm[2]);
    var grand = total * (1 + tip / 100);
    var per = grand / people;
    return { kind: 'split', total: total, people: people, tipPct: tip, grand: grand, perPerson: per, perPersonCeil: Math.ceil(per - 1e-9),
      text: { total: fmtNum(total), grand: fmtNum(grand), per: fmtNum(per), perCeil: fmtNum(Math.ceil(per - 1e-9)) } };
  }

  var Calc = {
    fmtNum: fmtNum, label: label,
    /* Evaluate a plain math string. Throws on anything that is not pure math. */
    evaluate: function (str) { return evaluateTokens(lex(String(str).toLowerCase())); },

    /* Look for a calculation inside a chat message.
     * Returns {kind:'expr'|'split'|'error', ...} or null when the message is not a calculation. */
    parse: function (raw) {
      var lower = String(raw || '').toLowerCase();
      if (lower.length > 300) return null;
      var hasCue = CUE.test(lower);
      /* dates, phone numbers: never math */
      if (/\d{4}-\d{2}-\d{2}/.test(lower) || /\b\d{3,4}[- ]\d{3,4}[- ]\d{4}\b/.test(lower)) return null;
      if (!hasCue && /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/.test(lower)) return null;
      var sp = parseSplit(lower.replace(/(\d),(?=\d{3}(?!\d))/g, '$1'));
      if (sp) return sp;
      var s = preprocess(raw);
      var toks = lex(s);
      var runs = findRuns(toks).map(trimRun).filter(function (r) { return r.length > 0; });
      var best = null;
      runs.forEach(function (run) {
        var nums = run.filter(function (t) { return t.t === 'num'; }).length;
        var fns = run.filter(function (t) { return t.t === 'fn'; }).length;
        var ops = run.filter(function (t) { return t.t === 'op' && '+-*/^%'.indexOf(t.v) >= 0; }).length;
        if (!((nums >= 2 && ops >= 1) || (fns >= 1 && nums >= 1) || (nums >= 1 && run.some(function (t) { return t.v === '%'; }) && ops >= 1))) return;
        var score = nums + fns + ops;
        if (!best || score > best.score) best = { run: run, score: score };
      });
      if (!best) return null;
      if (!hasCue) {
        /* without "compute / what is / ano ang ..." the message must be mostly math */
        var len = best.run.map(function (t) { return t.s; }).join('').length;
        var plain = lower.replace(FILLER, ' ');
        var letters = plain.replace(/[^a-z0-9]/g, '').length || 1;
        var leftovers = lex(preprocess(plain)).filter(function (t) { return t.t === 'word' && /^[a-z]{3,}$/.test(t.s); }).length;
        var onlyMinus = best.run.every(function (t) { return t.t !== 'op' || '-()'.indexOf(t.v) >= 0; });
        if (len / letters < 0.5 || leftovers > 2 || (onlyMinus && leftovers > 0)) return null;
      }
      var shown = label(pretty(best.run));
      try {
        var value = evaluateTokens(best.run);
        if (!isFinite(value)) return { kind: 'error', code: isNaN(value) ? 'invalid' : 'overflow', expr: shown };
        return { kind: 'expr', expr: shown, value: value, text: fmtNum(value) };
      } catch (e) {
        if (e instanceof DivZero) return { kind: 'error', code: 'div0', expr: shown };
        return null;
      }
    }
  };

  L.Calc = Calc;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
