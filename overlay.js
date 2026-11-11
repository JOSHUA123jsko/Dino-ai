/* Leon Offline — overlay.js
 * The floating-dino page (overlay.html). Tap = poke, drag = move the window (needs the native shell), long-press = open the full app.
 * Native shell API (all optional, see android/): window.LeonNative = { moveBy(dxCssPx, dyCssPx), resize(wDp, hDp), openApp(), startListening(), speak(...), stopSpeaking() }
 * and Leon.host.say / mute / unmute / poke / speak for the shell to call into the page. */
(function () {
  'use strict';
  var L = window.Leon, N = window.LeonNative || null, params = new URLSearchParams(location.search);
  if (!L || !L.Companion) return;
  function $(id) { return document.getElementById(id); }

  var saved = {};
  try { saved = JSON.parse(localStorage.getItem('leon:ui')) || {}; } catch (e) { saved = {}; }       /* same settings as the full app */
  var cfg = saved.config || {}, voice = saved.voice || {};
  if (params.get('boredom')) cfg.boredom = params.get('boredom');
  if (!cfg.boredom) cfg.boredom = 'chill';                                                         /* an overlay should not nag */

  var COMPACT = { w: +params.get('w') || 170, h: +params.get('h') || 210 }, OPEN = { w: +params.get('bw') || 300, h: +params.get('bh') || 360 };
  var expanded = false, shrinkTimer = null;
  function setExpanded(on) {
    if (on === expanded) return;
    expanded = on; document.body.classList.toggle('expanded', on);
    if (N && typeof N.resize === 'function') { try { N.resize(on ? OPEN.w : COMPACT.w, on ? OPEN.h : COMPACT.h); } catch (e) { /* ignore */ } }
  }

  var leon = L.Companion.create({ container: $('leon'), bubble: $('bubble'), config: cfg, voice: voice, fadeBubble: true, typeCps: 70 });
  L.app = leon;
  leon.on('beat', function () { clearTimeout(shrinkTimer); setExpanded(true); });
  leon.on('idle', function () { clearTimeout(shrinkTimer); shrinkTimer = setTimeout(function () { if (!leon.stage.running) setExpanded(false); }, 5200); });

  /* gestures on the dino */
  var face = $('leon'), drag = null;
  face.addEventListener('pointerdown', function (e) {
    leon.unlock();
    drag = { x: e.screenX, y: e.screenY, t: Date.now(), moved: false, long: false };
    drag.timer = setTimeout(function () { if (drag && !drag.moved) { drag.long = true; if (N && typeof N.openApp === 'function') N.openApp(); } }, 650);
    try { face.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  face.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.screenX - drag.x, dy = e.screenY - drag.y;
    if (drag.moved || Math.abs(dx) + Math.abs(dy) > 8) {
      drag.moved = true; clearTimeout(drag.timer);
      if (N && typeof N.moveBy === 'function') { N.moveBy(Math.round(dx), Math.round(dy)); drag.x = e.screenX; drag.y = e.screenY; }
    }
  });
  function end() { if (!drag) return; clearTimeout(drag.timer); var d = drag; drag = null; if (!d.moved && !d.long && Date.now() - d.t < 650) leon.poke(); }
  face.addEventListener('pointerup', end);
  face.addEventListener('pointercancel', function () { if (drag) { clearTimeout(drag.timer); drag = null; } });

  if (N) setTimeout(function () { leon.start(); }, 300);                                          /* native shells allow autoplay; the browser needs a tap first */
  else document.addEventListener('pointerdown', function once() { document.removeEventListener('pointerdown', once); leon.start(); }, { once: true });
})();
