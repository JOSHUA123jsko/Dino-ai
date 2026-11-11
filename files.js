'use strict';
/* The one place that says which scripts make up Leon, and in what order they load.
 * index.html / overlay.html, the build, and the tests all follow these lists (tests/run_build.js checks that they agree). */
var ENGINE = [
  'src/engine/util.js', 'src/engine/calc.js', 'src/engine/safety.js', 'src/engine/matcher.js',
  'src/data/intents.js', 'src/data/intents_templates.js', 'src/data/knowledge.js', 'src/data/jokes.js', 'src/data/lines.js',
  'src/engine/nlu.js', 'src/engine/persona.js', 'src/engine/brain.js'
];
var AVATAR = [
  'src/avatar/parts.js', 'src/avatar/face.js', 'src/avatar/props.js', 'src/avatar/expressions.js', 'src/avatar/avatar.js',
  'src/avatar/motion.js', 'src/avatar/animator.js'
];
var VOICE = ['src/voice/g2p.js', 'src/voice/leonsynth.js', 'src/voice/lipsync.js', 'src/voice/sfx.js', 'src/voice/voice.js'];
var UI = ['src/ui/stage.js', 'src/ui/companion.js'];

module.exports = {
  ENGINE: ENGINE, AVATAR: AVATAR, VOICE: VOICE, UI: UI,
  ALL: ENGINE.concat(AVATAR, VOICE, UI),     /* everything that goes into dist/leon.js */
  APP: 'src/ui/app.js',                      /* demo app logic (index.html) */
  OVERLAY: 'src/ui/overlay.js'               /* floating-dino logic (overlay.html) */
};
