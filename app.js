/* Leon Offline — app.js
 * The demo app: wires index.html to Leon.Companion (chat, quick replies, history, settings, mute button).
 * This file is the reference for how to integrate Leon into your own screens: everything it does goes through the public
 * Companion API (say, poke, mute, unmute, setConfig, setVoice, on(...)). Copy what you need. */
(function () {
  'use strict';
  var L = window.Leon;
  if (!L || !L.Companion) { document.body.innerHTML = '<p style="padding:24px;font:16px system-ui">Leon scripts did not load.</p>'; return; }
  function $(id) { return document.getElementById(id); }
  var UI_KEY = 'leon:ui', params = new URLSearchParams(location.search);

  /* ---------- saved UI settings (separate from Leon's memory of the person) ---------- */
  function loadUi() { try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (e) { return {}; } }
  function saveUi() { try { localStorage.setItem(UI_KEY, JSON.stringify({ voice: voiceOpts, config: cfg })); } catch (e) { /* private mode */ } }
  var saved = loadUi();
  var voiceOpts = { engine: 'auto', rate: 1, pitch: 1, volume: 1, sfx: true, voiceName: '' };
  var cfg = {};
  var k;
  for (k in (saved.voice || {})) voiceOpts[k] = saved.voice[k];
  for (k in (saved.config || {})) cfg[k] = saved.config[k];
  if (params.get('boredom')) cfg.boredom = params.get('boredom');            /* ?boredom=demo to see the boredom stages fast */
  if (params.get('engine')) voiceOpts.engine = params.get('engine');

  var leon = L.Companion.create({ container: $('leon'), bubble: $('bubble'), config: cfg, voice: voiceOpts });
  L.app = leon;

  /* ---------- transcript ---------- */
  var log = $('log');
  function addLog(who, text, action) {
    var li = document.createElement('li');
    li.className = 'msg msg-' + who + (action ? ' action' : '');
    li.textContent = text;
    log.appendChild(li);
    while (log.children.length > 200) log.removeChild(log.firstChild);
    log.parentNode.scrollTop = log.parentNode.scrollHeight;
  }
  leon.on('user', function (t) { addLog('you', t); });
  leon.on('beat', function (b) { if (b.text) addLog('leon', b.text, b.action); });

  /* ---------- mute button (this is the one that makes him cry) ---------- */
  var btnMute = $('btnMute');
  function paintMute(m) {
    btnMute.textContent = m ? '🔇' : '🔊'; btnMute.setAttribute('aria-pressed', m ? 'true' : 'false');
    btnMute.setAttribute('aria-label', m ? 'Unmute Leon' : 'Mute Leon'); btnMute.title = m ? 'Unmute Leon' : 'Mute Leon';
  }
  leon.on('mute', paintMute);
  btnMute.addEventListener('click', function () { leon.unlock(); leon.toggleMute(); });

  /* ---------- poke him ---------- */
  var face = $('leon');
  face.addEventListener('click', function () { leon.unlock(); leon.poke(); });
  face.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); leon.unlock(); leon.poke(); } });

  /* ---------- composer + quick replies ---------- */
  var form = $('form'), input = $('msg');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = input.value.trim(); if (!t) return;
    input.value = ''; leon.unlock(); leon.say(t);
  });
  var CHIPS = ['Kumusta!', 'Joke naman', 'Quote please', 'Science fact', '15% of 240', 'Pagod na ako', 'Anong oras na?', 'Bored ako', 'Sino ka?', 'Mahal kita'];
  var chips = $('chips');
  CHIPS.forEach(function (c) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = c;
    b.addEventListener('click', function () { leon.unlock(); leon.say(c); });
    chips.appendChild(b);
  });
  var mic = $('mic');
  if (window.LeonNative && typeof window.LeonNative.startListening === 'function') {
    mic.hidden = false;
    mic.addEventListener('click', function () { leon.unlock(); window.LeonNative.startListening(); });       /* the native side calls Leon.host.say(text) with the result */
  }

  /* ---------- sheets ---------- */
  var scrim = $('scrim'), openSheet = null;
  function show(el) {
    if (openSheet) hide(openSheet);
    openSheet = el; el.hidden = false; scrim.hidden = false;
    requestAnimationFrame(function () { el.classList.add('open'); scrim.classList.add('open'); });
    var c = el.querySelector('[data-close]'); if (c) c.focus();
  }
  function hide(el) {
    el.classList.remove('open'); scrim.classList.remove('open');
    setTimeout(function () { if (!el.classList.contains('open')) { el.hidden = true; if (openSheet === el) { openSheet = null; scrim.hidden = true; } } }, 200);
  }
  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { hide(b.closest('.sheet')); }); });
  scrim.addEventListener('click', function () { if (openSheet) hide(openSheet); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openSheet) hide(openSheet); });
  $('btnTranscript').addEventListener('click', function () { show($('transcript')); log.parentNode.scrollTop = log.parentNode.scrollHeight; });
  $('btnSettings').addEventListener('click', function () { refreshVoices(); refreshInfo(); show($('settings')); });

  /* ---------- settings ---------- */
  function bindSelect(id, store, key, apply) {
    var el = $(id); el.value = String(store[key] !== undefined ? store[key] : el.value);
    el.addEventListener('change', function () { store[key] = el.value; apply(); saveUi(); });
  }
  function bindCheck(id, store, key, apply) {
    var el = $(id); el.checked = store[key] !== undefined ? !!store[key] : el.checked;
    el.addEventListener('change', function () { store[key] = el.checked; apply(); saveUi(); });
  }
  function bindRange(id, outId, store, key, fmt) {
    var el = $(id), out = $(outId); if (store[key] !== undefined) el.value = store[key];
    function paint() { out.textContent = fmt(+el.value); }
    paint();
    el.addEventListener('input', function () { store[key] = +el.value; paint(); applyVoice(); saveUi(); });
  }
  function applyVoice() { leon.setVoice(voiceOpts); refreshInfo(); }
  function applyCfg() { leon.setConfig(cfg); refreshInfo(); }
  bindSelect('sEngine', voiceOpts, 'engine', applyVoice);
  bindRange('sRate', 'oRate', voiceOpts, 'rate', function (v) { return v.toFixed(2); });
  bindRange('sPitch', 'oPitch', voiceOpts, 'pitch', function (v) { return v.toFixed(2); });
  bindRange('sVol', 'oVol', voiceOpts, 'volume', function (v) { return Math.round(v * 100) + '%'; });
  bindCheck('sSfx', voiceOpts, 'sfx', applyVoice);
  bindSelect('sHonor', cfg, 'honorific', applyCfg);
  bindSelect('sProf', cfg, 'profanity', applyCfg);
  bindSelect('sYarn', cfg, 'yarn', applyCfg);
  bindSelect('sBore', cfg, 'boredom', applyCfg);
  bindSelect('sMute', cfg, 'muteDrama', applyCfg);
  bindCheck('sAsk', cfg, 'askQuestions', applyCfg);
  bindSelect('sRegion', cfg, 'region', applyCfg);
  $('sVoice').addEventListener('change', function () { voiceOpts.voiceName = $('sVoice').value; applyVoice(); saveUi(); });
  $('bTest').addEventListener('click', function () { leon.unlock(); leon.speak('Hello po, ako si Leon. Ito ang boses ko, yarn!', { expr: 'cheerful', gesture: 'wave' }); });

  function refreshVoices() {
    var list = leon.voice.listVoices(), sel = $('sVoice');
    sel.innerHTML = '';
    var auto = document.createElement('option'); auto.value = ''; auto.textContent = 'Automatic'; sel.appendChild(auto);
    list.forEach(function (v) { var o = document.createElement('option'); o.value = v.name; o.textContent = v.name + ' (' + v.lang + (v.local ? '' : ', online') + ')'; sel.appendChild(o); });
    sel.value = voiceOpts.voiceName || '';
    $('rowVoice').hidden = list.length === 0;
  }
  function refreshInfo() {
    var i = leon.voice.info(), name = { device: 'the phone voice', leon: "Leon's own voice", off: 'no sound' }[i.active] || i.active;
    $('voiceInfo').textContent = 'Now using: ' + name + (i.active === 'device' && i.voices === 0 && !i.native ? ' (voice list is empty)' : '') + '. '
      + (i.leon ? '' : 'Own voice not available in this build. ') + (i.active === 'device' ? 'Filipino pronunciation needs a Filipino voice installed on the phone; if it sounds off, try Leon\'s own voice.' : '');
    var st = leon.snapshot().state.profile, bits = [];
    if (st.name) bits.push('your name: ' + st.name);
    if (st.hometown) bits.push('hometown: ' + st.hometown);
    if (st.food) bits.push('favorite food: ' + st.food);
    if (st.job) bits.push('what you do: ' + st.job);
    $('memInfo').textContent = bits.length ? 'He remembers ' + bits.join(', ') + '. Stored only on this device.' : 'He does not know anything about you yet. What he learns is stored only on this device.';
  }
  $('bForget').addEventListener('click', function () {
    if (window.confirm('Leon will forget your name and everything else he learned. Continue?')) { leon.resetMemory(); log.innerHTML = ''; refreshInfo(); }
  });
  leon.setVoice(voiceOpts); refreshInfo();

  /* ---------- wake screen (browsers keep audio locked until a tap) ---------- */
  var wake = $('wake');
  function begin() {
    leon.unlock(); wake.classList.add('gone'); setTimeout(function () { wake.hidden = true; }, 250);
    leon.start(); input.focus({ preventScroll: true });
  }
  $('wakeBtn').addEventListener('click', begin);
  if (params.get('autostart') === '1' || window.LeonNative) { wake.hidden = true; setTimeout(function () { leon.start(); }, 300); }
  else setTimeout(function () { $('wakeBtn').focus(); }, 50);

  /* ---------- installable + offline (only over http/https; file:// and WebViews skip it) ---------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !params.get('nosw') && !window.LeonNative) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* fine: the app still works */ });
  }
})();
