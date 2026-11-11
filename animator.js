/* Leon Offline — animator.js
 * Brings the SVG puppet to life inside a DOM container:
 *   var leon = Leon.Avatar.create(document.getElementById('leon'));
 *   leon.setExpression('happy'); leon.gesture('wave'); leon.setMouth('A', 1);
 * Idle floating, breathing, blinking and eye wandering run by themselves. Only the layers that changed
 * are redrawn; per-frame work is a handful of transform attributes. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var A = L.Avatar = L.Avatar || {}, M = L.Motion;

  var CSS = '.leon-svg{display:block;width:100%;height:100%;overflow:visible}.leon-svg .fx{transform-box:fill-box;transform-origin:center}' +
    '.leon-svg .fx-zzz,.leon-svg .fx-hearts,.leon-svg .fx-hearts_small,.leon-svg .fx-kiss_heart,.leon-svg .fx-question,.leon-svg .fx-swirl{animation:lnfloat 2.2s ease-in-out infinite}' +
    '.leon-svg .fx-sparkles,.leon-svg .fx-star_burst{animation:lntwinkle 1.5s ease-in-out infinite}' +
    '.leon-svg .fx-excl,.leon-svg .fx-excl_q{animation:lnpulse .8s ease-in-out infinite}' +
    '.leon-svg .fx-tears,.leon-svg .fx-tears_big,.leon-svg .fx-tears_one,.leon-svg .fx-tears_joy,.leon-svg .fx-sweat{animation:lndrip 1.7s ease-in infinite}' +
    '.leon-svg .fx-shiver{animation:lnshiver .16s linear infinite}' +
    '.leon-svg .fx-puff,.leon-svg .fx-puff_small,.leon-svg .fx-sigh{animation:lnpuff 1.7s ease-in-out infinite}' +
    '@keyframes lnfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}' +
    '@keyframes lntwinkle{0%,100%{opacity:.45;transform:scale(.85)}50%{opacity:1;transform:scale(1.12)}}' +
    '@keyframes lnpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}' +
    '@keyframes lndrip{0%{transform:translateY(-3px);opacity:.75}70%{opacity:1}100%{transform:translateY(6px);opacity:.85}}' +
    '@keyframes lnshiver{0%,100%{transform:translateX(-2px)}50%{transform:translateX(2px)}}' +
    '@keyframes lnpuff{0%,100%{transform:scale(.92);opacity:.85}50%{transform:scale(1.1);opacity:1}}' +
    '.leon-svg.calm *{animation:none!important}';

  var PARTS = ['shadow', 'root', 'fxBack', 'tail', 'torso', 'feetL', 'feetR', 'bodyProps', 'armsBackL', 'armsBackR', 'head', 'headShape', 'cheeks', 'eyes', 'brows', 'mouth', 'headProps', 'midProps', 'armsFrontL', 'armsFrontR', 'fx'];
  var BLINKABLE = /^(open|wide|angry|sad|glossy|half|think|big|uneven|small)$/;

  function skeleton() {
    function p(n, inner) { return '<g data-p="' + n + '">' + (inner || '') + '</g>'; }
    return '<svg class="leon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-10 -60 420 530" role="img" aria-label="Leon the dino"><style>' + CSS + '</style>' +
      p('shadow') + '<g data-p="root">' + p('fxBack') + p('tail') + p('torso') + p('feetL') + p('feetR') + p('bodyProps') + p('armsBackL') + p('armsBackR') +
      '<g data-p="head">' + p('headShape') + p('cheeks') + p('eyes') + p('brows') + p('mouth') + p('headProps') + '</g>' +
      p('midProps') + p('armsFrontL') + p('armsFrontR') + p('fx') + '</g></svg>';
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function r2(n) { return Math.round(n * 100) / 100; }

  A.create = function (container, opts) {
    opts = opts || {};
    container.innerHTML = skeleton();
    var svg = container.querySelector('svg'), P = {};
    PARTS.forEach(function (n) { P[n] = container.querySelector('[data-p="' + n + '"]'); });
    var reduce = false;
    try { reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
    if (reduce || opts.calm) svg.setAttribute('class', 'leon-svg calm');

    var S = { expr: 'neutral', viseme: 'X', open: 1, blink: 0, look: null, pose: null, mouthForce: null, speaking: 0 };
    var ex = A.EXPRESSIONS.neutral;
    var cur = { tilt: 0, dy: 0, sy: 1 }, target = { tilt: 0, dy: 0, sy: 1 };
    var now = 0, popAt = -10, gest = null, blinkAt = 2, blinkT0 = -1, lookAt = 3, saccade = [0, 0], running = false, raf = null, lastFrame = 0;
    var frameMs = 1000 / (opts.fps || 30);

    /* static layers: drawn once */
    P.tail.innerHTML = A.drawTail(); P.torso.innerHTML = A.drawBody();
    P.feetL.innerHTML = A.drawFoot(152); P.feetR.innerHTML = A.drawFoot(248); P.headShape.innerHTML = A.drawHead();
    P.shadow.innerHTML = A.drawShadow(1);

    function eyesMarkup() {
      var look = ex.look || (saccade[0] || saccade[1] ? saccade : null);
      return A.eyePair(ex.eyes, { blink: BLINKABLE.test(ex.eyes) ? S.blink : 0, look: look });
    }
    function drawEyes() { P.eyes.innerHTML = eyesMarkup(); }
    function drawMouth() {
      var v = S.mouthForce || S.viseme;
      P.mouth.innerHTML = (v && v !== 'X') ? (A.MOUTHS[v] ? A.mouth(v) : A.visemeAt(v, S.open)) : A.mouth(ex.mouth);
    }
    function drawArms() {
      var pose = A.POSES[S.pose || ex.arms] || A.POSES.down, front = !!pose.front;
      P.armsBackL.innerHTML = front ? '' : A.drawArm('L', pose.L); P.armsBackR.innerHTML = front ? '' : A.drawArm('R', pose.R);
      P.armsFrontL.innerHTML = front ? A.drawArm('L', pose.L) : ''; P.armsFrontR.innerHTML = front ? A.drawArm('R', pose.R) : '';
    }
    function drawExpression() {
      P.cheeks.innerHTML = A.cheeks(ex.cheeks, ex.cheekLines);
      P.brows.innerHTML = A.brows(ex.brows);
      P.headProps.innerHTML = (ex.headProps || []).map(function (n) { return A.HEAD_PROPS[n](); }).join('');
      P.bodyProps.innerHTML = (ex.bodyProps || []).map(function (n) { return A.BODY_PROPS[n](); }).join('');
      P.midProps.innerHTML = (ex.midProps || []).map(function (n) { return A.MID_PROPS[n](); }).join('');
      P.fx.innerHTML = (ex.fx || []).map(function (n) { return '<g class="fx fx-' + n + '">' + A.FX[n]() + '</g>'; }).join('');
      drawArms(); drawEyes(); drawMouth();
      target.tilt = ex.tilt || 0; target.dy = ex.dy || 0; target.sy = ex.squash || 1;
    }

    var ctl = {
      el: svg, state: S,
      setExpression: function (name, o) {
        var n = A.resolveExpr(name);
        if (n === S.expr && !(o && o.force)) return n;
        S.expr = n; ex = A.EXPRESSIONS[n]; popAt = now; drawExpression();
        return n;
      },
      getExpression: function () { return S.expr; },
      /* v: one of A.VISEMES ('X' = back to the expression's own mouth), open: 0.15 .. 1.45 */
      setMouth: function (v, open) {
        open = open === undefined ? 1 : open;
        if (v === S.viseme && Math.abs(open - S.open) < 0.08) return;
        S.viseme = v || 'X'; S.open = open; drawMouth();
      },
      setSpeaking: function (amp) { S.speaking = amp || 0; },
      setPose: function (name) { S.pose = name || null; drawArms(); },
      gesture: function (name, o) {
        o = o || {};
        var def = M.GESTURES[name]; if (!def) return 0;
        ctl._endGesture();
        var dur = o.dur || def.dur;
        gest = { name: name, t0: now, dur: dur, pose: def.pose || null, mouth: def.mouth || null };
        if (gest.pose) { S.pose = gest.pose; drawArms(); }
        if (gest.mouth) { S.mouthForce = gest.mouth; drawMouth(); }
        return dur;
      },
      _endGesture: function () {
        if (!gest) return;
        var g0 = gest; gest = null;
        if (g0.pose) { S.pose = null; drawArms(); }
        if (g0.mouth) { S.mouthForce = null; drawMouth(); }
      },
      blink: function () { blinkT0 = now; },
      lookAt: function (dx, dy) { saccade = [dx || 0, dy || 0]; drawEyes(); },
      setCalm: function (on) { svg.setAttribute('class', on ? 'leon-svg calm' : 'leon-svg'); },

      /* one animation frame at time t (seconds). start() calls this for you; tests can call it by hand. */
      step: function (t) {
        var dt = Math.min(0.1, Math.max(0.001, t - now)); now = t;
        /* blink: 0 -> .5 -> 1 -> .5 -> 0 over ~220ms */
        if (blinkT0 < 0 && now >= blinkAt) { blinkT0 = now; }
        if (blinkT0 >= 0) {
          var bt = (now - blinkT0) * 1000, bv = bt < 55 ? 0.5 : (bt < 115 ? 1 : (bt < 170 ? 0.5 : 0));
          if (bt >= 220) { blinkT0 = -1; blinkAt = now + (Math.random() < 0.2 ? 0.35 : rnd(2.4, 5.6)); bv = 0; }
          if (bv !== S.blink) { S.blink = bv; if (BLINKABLE.test(ex.eyes)) drawEyes(); }
        }
        /* eyes wander a little */
        if (now >= lookAt) {
          lookAt = now + rnd(1.6, 4.2);
          if (!ex.look && !S.speaking) { var nl = Math.random() < 0.4 ? [0, 0] : [Math.round(rnd(-3, 3)), Math.round(rnd(-2, 2))]; if (nl[0] !== saccade[0] || nl[1] !== saccade[1]) { saccade = nl; if (BLINKABLE.test(ex.eyes)) drawEyes(); } }
        }
        /* ease towards the expression's posture */
        var k = Math.min(1, dt * 9);
        cur.tilt += (target.tilt - cur.tilt) * k; cur.dy += (target.dy - cur.dy) * k; cur.sy += (target.sy - cur.sy) * k;
        var calm = svg.getAttribute('class') === 'leon-svg calm';
        var m = calm ? M.zero() : M.idle(now, S.expr);
        if (gest) { var go = M.gesture(gest.name, (now - gest.t0) * 1000, gest.dur); if (go) m = M.add(m, go); else ctl._endGesture(); }
        if (S.speaking && !calm) m = M.add(m, M.talk(now, S.speaking));
        if (!calm) m = M.add(m, M.pop((now - popAt) / 0.45));
        var jitter = (ex.shake && !calm) ? Math.sin(now * 90) * 1.6 : 0;
        var dx = m.dx + jitter, dy = m.dy + cur.dy;
        var tf = 'translate(' + r2(dx) + ',' + r2(dy) + ') translate(200,430) rotate(' + r2(m.rot) + ') scale(' + r2(m.sx * m.flip * 1000) / 1000 + ',' + r2(m.sy * cur.sy * 1000) / 1000 + ') translate(-200,-430)';
        P.root.setAttribute('transform', tf);
        P.head.setAttribute('transform', 'translate(0,' + r2(m.headDy) + ') rotate(' + r2(m.headRot + cur.tilt) + ' 200 296)');
        P.tail.setAttribute('transform', 'rotate(' + r2(m.tail) + ' 262 380)');
        P.feetL.setAttribute('transform', 'translate(0,' + r2(m.footL) + ')'); P.feetR.setAttribute('transform', 'translate(0,' + r2(m.footR) + ')');
        var aL = 'rotate(' + r2(m.armL) + ' 140 308)', aR = 'rotate(' + r2(m.armR) + ' 260 308)';
        P.armsBackL.setAttribute('transform', aL); P.armsFrontL.setAttribute('transform', aL); P.armsBackR.setAttribute('transform', aR); P.armsFrontR.setAttribute('transform', aR);
        var sh = Math.max(0.55, Math.min(1.2, 1 + (m.dy + cur.dy) / 120));
        P.shadow.setAttribute('transform', 'translate(200,438) scale(' + r2(sh) + ',' + r2(sh) + ') translate(-200,-438)'); P.shadow.setAttribute('opacity', r2(Math.max(0.35, Math.min(1, 1 - (m.dy + cur.dy) / 160))));
      },
      start: function () {
        if (running) return; running = true;
        var tick = function (ms) {
          if (!running) return;
          if (ms - lastFrame >= frameMs - 1) { lastFrame = ms; ctl.step(ms / 1000); }
          raf = root.requestAnimationFrame ? root.requestAnimationFrame(tick) : root.setTimeout(function () { tick(Date.now()); }, frameMs);
        };
        raf = root.requestAnimationFrame ? root.requestAnimationFrame(tick) : root.setTimeout(function () { tick(Date.now()); }, frameMs);
        if (root.document && !ctl._vis) { ctl._vis = function () { if (root.document.hidden) { running = false; } else if (!running) ctl.start(); }; root.document.addEventListener('visibilitychange', ctl._vis); }
      },
      stop: function () { running = false; if (raf && root.cancelAnimationFrame) root.cancelAnimationFrame(raf); },
      destroy: function () { ctl.stop(); if (ctl._vis && root.document) root.document.removeEventListener('visibilitychange', ctl._vis); container.innerHTML = ''; }
    };
    drawExpression();
    ctl.step(0.016);
    if (opts.expr) ctl.setExpression(opts.expr);
    if (opts.autostart !== false) ctl.start();
    return ctl;
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
