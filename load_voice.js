/* Loads the voice stack (G2P, LeonSynth, Lipsync, Sfx, Voice) into a sandbox with mock WebAudio / Web Speech / Android bridge. */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.join(__dirname, '..');
var FILES = require('../tools/files.js').VOICE;

function makeAudioContext(registry) {
  function AudioContext() { this.currentTime = 0; this.state = 'running'; this.destination = {}; registry.ctx = this; }
  AudioContext.prototype.createGain = function () { return { gain: { value: 1 }, connect: function () {}, disconnect: function () {} }; };
  AudioContext.prototype.createBuffer = function (ch, n, sr) { var data = new Float32Array(n); return { length: n, sampleRate: sr, duration: n / sr, copyToChannel: function (a) { data.set(a); }, getChannelData: function () { return data; } }; };
  AudioContext.prototype.createBufferSource = function () {
    var s = { buffer: null, onended: null, startedAt: null, stopped: false, connect: function () {}, disconnect: function () {}, start: function (t) { s.startedAt = t; }, stop: function () { s.stopped = true; } };
    registry.sources.push(s); return s;
  };
  AudioContext.prototype.resume = function () { this.state = 'running'; return Promise.resolve(); };
  return AudioContext;
}

/* opts: { audio: bool, webSpeech: bool|voices[], native: bool, leon: bool (default true) } */
module.exports = function loadVoice(opts) {
  opts = opts || {};
  var reg = { sources: [], spoken: [], cancelled: 0, native: [], nativeStops: 0, ctx: null };
  var sb = { console: console, Math: Math, JSON: JSON, Date: Date, Float32Array: Float32Array, Float64Array: Float64Array, Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout, performance: performance };
  sb.globalThis = sb;
  if (opts.audio) sb.AudioContext = makeAudioContext(reg);
  if (opts.webSpeech) {
    var voices = Array.isArray(opts.webSpeech) ? opts.webSpeech : [{ name: 'Google US English', lang: 'en-US', localService: true }, { name: 'Filipino (Philippines)', lang: 'fil-PH', localService: true }, { name: 'Online Tagalog', lang: 'tl-PH', localService: false }];
    sb.speechSynthesis = { getVoices: function () { return voices; }, speak: function (u) { reg.spoken.push(u); }, cancel: function () { reg.cancelled++; }, addEventListener: function () {} };
    sb.SpeechSynthesisUtterance = function (t) { this.text = t; };
  }
  if (opts.native) {
    sb.LeonNative = { speak: function (id, text, rate, pitch, vol, lang) { reg.native.push({ id: id, text: text, rate: rate, pitch: pitch, vol: vol, lang: lang }); }, stopSpeaking: function () { reg.nativeStops++; } };
  }
  vm.createContext(sb);
  var files = opts.leon === false ? FILES.filter(function (f) { return !/leonsynth|sfx/.test(f); }) : FILES;
  files.forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sb, { filename: f }); });
  sb.Leon.__reg = reg;
  return sb.Leon;
};
