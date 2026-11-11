/* Leon Offline — avatar.js
 * Assembles Leon from parts. A.layers(state) returns each layer as an SVG string (the animator updates
 * only the layers that changed); A.render(state) returns one complete SVG document (used by the
 * contact-sheet tool, tests, and the static fallback).
 *   state: { expr, viseme, open, blink, look:[dx,dy], tilt, pose } */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var A = L.Avatar = L.Avatar || {};
  var S = A._s, g = S.g;

  A.VIEW = { w: 400, h: 460 };
  A.NECK = [200, 296];

  A.layers = function (st) {
    st = st || {};
    var name = A.resolveExpr(st.expr), ex = A.EXPRESSIONS[name];
    var look = st.look || ex.look, pose = A.POSES[st.pose || ex.arms] || A.POSES.down;
    var mouth = st.viseme && st.viseme !== 'X' ? A.visemeAt(st.viseme, st.open === undefined ? 1 : st.open) : A.mouth(ex.mouth);
    function arm(side) { return A.drawArm(side, pose[side]); }
    var lay = {
      name: name,
      shadow: A.drawShadow(1),
      fxBack: '',
      tail: A.drawTail(),
      body: A.drawBody(),
      feetL: A.drawFoot(152), feetR: A.drawFoot(248),
      bodyProps: (ex.bodyProps || []).map(function (n) { return A.BODY_PROPS[n](); }).join(''),
      armsBack: { L: pose.front ? '' : arm('L'), R: pose.front ? '' : arm('R') },
      head: A.drawHead(),
      cheeks: A.cheeks(ex.cheeks, ex.cheekLines),
      eyes: A.eyePair(ex.eyes, { blink: st.blink || 0, look: look }),
      brows: A.brows(ex.brows),
      mouth: mouth,
      headProps: (ex.headProps || []).map(function (n) { return A.HEAD_PROPS[n](); }).join(''),
      midProps: (ex.midProps || []).map(function (n) { return A.MID_PROPS[n](); }).join(''),
      armsFront: { L: pose.front ? arm('L') : '', R: pose.front ? arm('R') : '' },
      fx: (ex.fx || []).map(function (n) { return g(A.FX[n](), null, { 'class': 'fx fx-' + n }); }).join(''),
      tilt: st.tilt !== undefined ? st.tilt : (ex.tilt || 0),
      dy: ex.dy || 0, squash: ex.squash || 1, shake: !!ex.shake
    };
    return lay;
  };

  A.render = function (st, o) {
    o = o || {};
    var y = A.layers(st), tilt = y.tilt;
    var body = y.shadow + y.fxBack + g(y.tail, null, { id: 'tail' }) + g(y.body + y.feetL + y.feetR + y.bodyProps, 'translate(0,' + y.dy + ')', { id: 'body' }) +
      g(y.armsBack.L + y.armsBack.R, 'translate(0,' + y.dy + ')') +
      g(y.head + y.cheeks + g(y.eyes, null, { id: 'eyes' }) + y.brows + g(y.mouth, null, { id: 'mouth' }) + y.headProps, 'translate(0,' + y.dy + ') rotate(' + tilt + ' ' + A.NECK[0] + ' ' + A.NECK[1] + ')', { id: 'head' }) +
      g(y.midProps, 'translate(0,' + y.dy + ')') + g(y.armsFront.L + y.armsFront.R, 'translate(0,' + y.dy + ')') + y.fx;
    var w = o.width || A.VIEW.w, h = o.height || A.VIEW.h;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + A.VIEW.w + ' ' + A.VIEW.h + '" width="' + w + '" height="' + h + '">' +
      (o.background ? '<rect width="100%" height="100%" fill="' + o.background + '"/>' : '') + g(body, null, { id: 'leon' }) + '</svg>';
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
