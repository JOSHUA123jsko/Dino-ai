/* Leon Offline — util.js
 * Small shared helpers. No dependencies. Runs in browsers, Android/iOS WebViews and Node.
 * Every Leon file attaches itself to one global namespace: Leon. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  L.VERSION = '1.0.0';

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var U = {};

  U.makeRng = function (seed) {
    if (seed === null || seed === undefined || seed === '') return Math.random;
    return mulberry32(Number(seed) || 1);
  };
  U.pick = function (arr, rng) { return arr[Math.floor((rng || Math.random)() * arr.length)]; };
  U.chance = function (p, rng) { return (rng || Math.random)() < p; };
  U.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  U.clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  U.deepMerge = function (a, b) {
    var out = U.clone(a);
    (function walk(dst, src) {
      for (var k in src) {
        if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
        if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
          if (!dst[k] || typeof dst[k] !== 'object') dst[k] = {};
          walk(dst[k], src[k]);
        } else dst[k] = src[k];
      }
    })(out, b || {});
    return out;
  };

  U.stripAccents = function (s) {
    s = String(s == null ? '' : s);
    return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s;
  };

  /* lowercase, no accents, no apostrophes, letters/digits/spaces only */
  U.normalize = function (s) {
    s = U.stripAccents(s).toLowerCase();
    s = s.replace(/[‘’ʼ`´']/g, '');
    s = s.replace(/(.)\1{2,}/g, '$1$1');
    s = s.replace(/[^a-z0-9]+/g, ' ');
    return s.replace(/^\s+|\s+$/g, '');
  };

  U.words = function (s) {
    var n = U.normalize(s);
    return n ? n.split(' ') : [];
  };

  U.tidy = function (s) {
    return String(s)
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+([,.!?;])/g, '$1')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/^\s+|\s+$/g, '');
  };

  U.fmt = function (tpl, vars) {
    vars = vars || {};
    return U.tidy(String(tpl).replace(/\{(\w+)\}/g, function (m, k) {
      var v = vars[k];
      return (v === undefined || v === null) ? '' : String(v);
    }));
  };

  U.titleCase = function (s) {
    return String(s).toLowerCase().replace(/(^|[\s\-'])([a-zà-ÿ])/g, function (m, a, b) { return a + b.toUpperCase(); });
  };

  U.sentences = function (text) {
    var m = String(text).match(/[^.!?…]+[.!?…]*\s*/g);
    return m ? m : [String(text)];
  };

  U.dayPart = function (hour) {
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 13) return 'noon';
    if (hour >= 13 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  };

  U.makeStorage = function (prefix) {
    prefix = prefix || 'leon:';
    var mem = {};
    var ls = null;
    try {
      ls = root.localStorage;
      ls.setItem('__leon_t', '1');
      ls.removeItem('__leon_t');
    } catch (e) { ls = null; }
    return {
      get: function (k) {
        try {
          var v = ls ? ls.getItem(prefix + k) : mem[k];
          return v === null || v === undefined ? null : JSON.parse(v);
        } catch (e) { return null; }
      },
      set: function (k, v) {
        try {
          var s = JSON.stringify(v);
          if (ls) ls.setItem(prefix + k, s); else mem[k] = s;
        } catch (e) { /* storage full or blocked: Leon just forgets */ }
      },
      remove: function (k) {
        try { if (ls) ls.removeItem(prefix + k); else delete mem[k]; } catch (e) { /* ignore */ }
      }
    };
  };

  L.Util = U;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
