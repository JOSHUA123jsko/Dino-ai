/* Leon Offline — matcher.js
 * Leon's text-understanding model: a TF-IDF example matcher (word 1-grams, 2-grams and char 3-grams,
 * cosine nearest-neighbour per class). It is built from plain example sentences, so "training" Leon
 * = adding examples to src/data/intents.js and rebuilding. No API, no network, a few KB of data. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var U = L.Util;

  function features(text) {
    var norm = U.normalize(text).replace(/\d+/g, '#');
    var words = norm ? norm.split(' ') : [];
    var f = {};
    function add(k, w) { if (!(k in f) || f[k] < w) f[k] = w; }
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      add('w:' + w, 1);
      if (i + 1 < words.length) add('b:' + w + '_' + words[i + 1], 1);
      if (w.length >= 4) {
        var p = '^' + w + '$';
        for (var j = 0; j + 3 <= p.length; j++) add('c:' + p.substr(j, 3), 0.4);
      }
    }
    return f;
  }

  /* examples: [{t: 'sentence', c: 'label'}] */
  function Matcher(examples) {
    var N = examples.length, df = Object.create(null), docs = [], i, k;
    for (i = 0; i < N; i++) {
      var f = features(examples[i].t);
      docs.push({ label: examples[i].c, text: examples[i].t, f: f });
      for (k in f) df[k] = (df[k] || 0) + 1;
    }
    this.N = N;
    this.idf = Object.create(null);
    for (k in df) this.idf[k] = Math.log((N + 1) / (df[k] + 0.5)) + 1;
    this.maxIdf = Math.log(N + 1) + 1;
    this.docs = docs;
    this.inv = Object.create(null);
    for (i = 0; i < N; i++) {
      var d = docs[i], norm = 0, v = {};
      for (k in d.f) { v[k] = d.f[k] * this.idf[k]; norm += v[k] * v[k]; }
      norm = Math.sqrt(norm) || 1;
      for (k in v) { (this.inv[k] = this.inv[k] || []).push([i, v[k] / norm]); }
    }
  }

  /* nearest examples: [{label, text, score, idx}] best first. skipIdx is used by leave-one-out evaluation. */
  Matcher.prototype.query = function (text, k, skipIdx) {
    var f = features(text), q = Object.create(null), norm = 0, key;
    for (key in f) {
      var idf = this.idf[key] !== undefined ? this.idf[key] : this.maxIdf;
      q[key] = f[key] * idf;
      norm += q[key] * q[key];
    }
    norm = Math.sqrt(norm) || 1;
    var sims = Object.create(null);
    for (key in q) {
      var list = this.inv[key];
      if (!list) continue;
      var qw = q[key] / norm;
      for (var j = 0; j < list.length; j++) {
        var di = list[j][0];
        if (di === skipIdx) continue;
        sims[di] = (sims[di] || 0) + qw * list[j][1];
      }
    }
    var out = [];
    for (var d in sims) out.push({ i: +d, s: sims[d] });
    out.sort(function (a, b) { return b.s - a.s; });
    var docs = this.docs;
    return out.slice(0, k || 8).map(function (o) {
      return { label: docs[o.i].label, text: docs[o.i].text, score: o.s, idx: o.i };
    });
  };

  Matcher.prototype.classify = function (text, skipIdx) {
    var top = this.query(text, 14, skipIdx);
    if (!top.length) return { label: null, score: 0, margin: 0, nearest: null, ranked: [] };
    var per = Object.create(null);
    top.forEach(function (h) { (per[h.label] = per[h.label] || []).push(h.score); });
    var ranked = [];
    for (var lab in per) ranked.push({ label: lab, best: per[lab][0], score: per[lab][0] + 0.1 * (per[lab][1] || 0) });
    ranked.sort(function (a, b) { return b.score - a.score; });
    return {
      label: ranked[0].label,
      score: ranked[0].best,
      margin: ranked.length > 1 ? ranked[0].score - ranked[1].score : ranked[0].score,
      nearest: top[0],
      ranked: ranked
    };
  };

  Matcher.features = features;
  L.Matcher = Matcher;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
