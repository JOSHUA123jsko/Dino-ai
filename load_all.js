/* Loads engine + voice + ui (no SVG avatar: that needs a DOM) into one sandbox with mock audio / speech / timers. */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.join(__dirname, '..');
var F = require('../tools/files.js'), ENGINE = F.ENGINE, VOICE = F.VOICE, UI = F.UI;

module.exports = function loadAll(opts) {
  opts = opts || {};
  var reg = { sources: [], spoken: [], cancelled: 0, ctx: null, intervals: 0 };
  var sb = { console: console, Math: Math, JSON: JSON, Date: Date, setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval, performance: performance };
  sb.globalThis = sb;
  if (opts.audio !== false) {
    sb.AudioContext = function () {
      this.currentTime = 0; this.state = 'running'; this.destination = {}; reg.ctx = this;
    };
    sb.AudioContext.prototype.createGain = function () { return { gain: { value: 1 }, connect: function () {}, disconnect: function () {} }; };
    sb.AudioContext.prototype.createBuffer = function (c, n, sr) { var d = new Float32Array(n); return { length: n, sampleRate: sr, duration: n / sr, copyToChannel: function (a) { d.set(a); }, getChannelData: function () { return d; } }; };
    sb.AudioContext.prototype.createBufferSource = function () { var s = { buffer: null, onended: null, stopped: false, connect: function () {}, disconnect: function () {}, start: function (t) { s.startedAt = t; }, stop: function () { s.stopped = true; } }; reg.sources.push(s); return s; };
    sb.AudioContext.prototype.resume = function () { return Promise.resolve(); };
  }
  vm.createContext(sb);
  ENGINE.concat(VOICE, UI, opts.extra || []).forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sb, { filename: f }); });
  sb.Leon.__reg = reg; sb.Leon.__sandbox = sb;
  return sb.Leon;
};
