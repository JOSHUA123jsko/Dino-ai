/* Leon Offline — expressions.js
 * The 25 expressions from the character sheet (+ neutral, sob, nerd) as plain data.
 * Each one picks: eyes, brows, mouth, cheek blush, arm pose, head props, held props, floating effects.
 * To invent a new expression, add an entry here, no drawing code needed. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var A = L.Avatar = L.Avatar || {};

  /* arm poses: hand position (h), elbow bend (e), hand shape (mitt). front:true = drawn over the face. */
  A.POSES = {
    down:      { L: { h: [120, 368], e: [108, 336] }, R: { h: [280, 368], e: [292, 336] } },
    belly:     { L: { h: [168, 356], e: [124, 352] }, R: { h: [232, 356], e: [276, 352] } },
    cheer_one: { L: { h: [120, 368], e: [108, 336] }, R: { h: [346, 198], e: [348, 280] }, front: true },
    up_both:   { L: { h: [54, 188], e: [52, 276] }, R: { h: [346, 188], e: [348, 276] }, front: true },
    wave:      { L: { h: [120, 368], e: [108, 336] }, R: { h: [350, 204], e: [352, 286] }, front: true },
    cheeks:    { L: { h: [112, 248], e: [96, 298] }, R: { h: [288, 248], e: [304, 298] }, front: true },
    cheeks_low:{ L: { h: [148, 284], e: [112, 308] }, R: { h: [252, 284], e: [288, 308] }, front: true },
    cover:     { L: { h: [164, 246], e: [102, 302] }, R: { h: [236, 246], e: [298, 302] }, front: true },
    cross:     { L: { h: [238, 338], e: [168, 332] }, R: { h: [162, 346], e: [236, 352] } },
    chin:      { L: { h: [170, 356], e: [126, 352] }, R: { h: [228, 286], e: [294, 322], }, front: true },
    heart:     { L: { h: [152, 362], e: [118, 346] }, R: { h: [248, 362], e: [282, 346] } },
    fists_up:  { L: { h: [92, 252], e: [70, 306], mitt: 'fist' }, R: { h: [308, 252], e: [330, 306], mitt: 'fist' }, front: true },
    clasp:     { L: { h: [187, 302], e: [128, 334] }, R: { h: [213, 302], e: [272, 334] }, front: true },
    eat:       { L: { h: [120, 368], e: [108, 336] }, R: { h: [262, 290], e: [304, 336] }, front: true },
    star:      { L: { h: [120, 368], e: [108, 336] }, R: { h: [306, 296], e: [300, 340] } },
    pillow:    { L: { h: [146, 366], e: [114, 350] }, R: { h: [254, 366], e: [286, 350] }, front: true },
    thumbs:    { L: { h: [70, 300], e: [70, 350], mitt: 'thumb' }, R: { h: [280, 368], e: [292, 336] }, front: true },
    kiss_hand: { L: { h: [120, 368], e: [108, 336] }, R: { h: [246, 286], e: [296, 324] }, front: true },
    shrug:     { L: { h: [78, 308], e: [94, 360] }, R: { h: [322, 308], e: [306, 360] } },
    point_mouth:{ L: { h: [120, 368], e: [108, 336] }, R: { h: [230, 280], e: [294, 322], mitt: 'point' }, front: true },
    hold_head: { L: { h: [120, 368], e: [108, 336] }, R: { h: [296, 150], e: [344, 238] }, front: true },
    index_up:  { L: { h: [120, 368], e: [108, 336] }, R: { h: [330, 250], e: [336, 312], mitt: 'point' }, front: true },
    slump:     { L: { h: [112, 396], e: [100, 360] }, R: { h: [288, 396], e: [300, 360] } }
  };

  /* head: tilt in degrees, dy = body squash offset.  fxBack are drawn behind the character. */
  var E = A.EXPRESSIONS = {
    neutral:    { eyes: 'open',   brows: null,              mouth: 'smile_small', cheeks: 0.6, arms: 'down' },
    happy:      { eyes: 'happy',  brows: null,              mouth: 'grin',        cheeks: 1,   arms: 'cheer_one', fx: ['excl'], tilt: -3 },
    laughing:   { eyes: 'laugh',  brows: null,              mouth: 'laugh',       cheeks: 1,   arms: 'belly', fx: ['tears_joy', 'sparkles'], tilt: -9 },
    angry:      { eyes: 'angry',  brows: [16, -16, 0],      mouth: 'yell',        cheeks: 0.45, arms: 'cross', headProps: ['anger'], fx: ['puff'] },
    sad:        { eyes: 'sad',    brows: [-14, 14, 2],      mouth: 'wobble',      cheeks: 0.6, arms: 'cheeks_low', fx: ['tears', 'broken_heart'], tilt: 3 },
    excited:    { eyes: 'laugh',  brows: null,              mouth: 'grin',        cheeks: 1,   arms: 'up_both', fx: ['excl', 'sparkles'] },
    shy:        { eyes: 'half',   brows: [-6, 6, 4],        mouth: 'ww',          cheeks: 1.25, arms: 'belly', fx: ['hearts_small'], tilt: 5 },
    surprised:  { eyes: 'wide',   brows: [-8, 8, -8],       mouth: 'o_small',     cheeks: 0.8, arms: 'cheeks', fx: ['excl_q'] },
    sleepy:     { eyes: 'closed', brows: null,              mouth: 'nibble',      cheeks: 0.6, arms: 'pillow', headProps: ['nightcap'], bodyProps: ['pillow'], fx: ['zzz'], tilt: 9 },
    thinking:   { eyes: 'think',  brows: [0, -14, -2, 0, -4], mouth: 'hmm',       cheeks: 0.7, arms: 'chin', fx: ['question'], tilt: -4 },
    pouty:      { eyes: 'half',   brows: [12, -12, 0],      mouth: 'pout',        cheeks: 1.1, arms: 'cross', fx: ['puff_small'], tilt: 2 },
    love:       { eyes: 'happy',  brows: null,              mouth: 'smile_open',  cheeks: 1.15, arms: 'heart', bodyProps: ['heart_big'], fx: ['hearts'] },
    kiss:       { eyes: 'wink_r', brows: null,              mouth: 'kiss',        cheeks: 1,   arms: 'kiss_hand', fx: ['kiss_heart', 'hearts_small'], tilt: -4 },
    wink:       { eyes: 'wink_r', brows: null,              mouth: 'smile_open',  cheeks: 0.95, arms: 'thumbs', fx: ['sparkles'], tilt: 3 },
    embarrassed:{ eyes: 'half',   brows: [-10, 10, 3],      mouth: 'zigzag',      cheeks: 1.3, cheekLines: true, arms: 'cover', fx: ['sweat'], tilt: 4 },
    proud:      { eyes: 'happy',  brows: null,              mouth: 'smirk',       cheeks: 0.9, arms: 'cross', headProps: ['crown'], fx: ['sparkles'], tilt: -2 },
    scared:     { eyes: 'scared', brows: [-12, 12, -4],     mouth: 'tremble',     cheeks: 0.7, arms: 'cheeks', fx: ['shiver', 'sweat'] },
    tired:      { eyes: 'flat',   brows: [-8, 8, 6],        mouth: 'flat',        cheeks: 0.55, arms: 'slump', fx: ['sigh'], tilt: 6, dy: 14, squash: 0.92 },
    hurt:       { eyes: 'sad',    brows: [-14, 14, 2],      mouth: 'tremble',     cheeks: 0.7, arms: 'hold_head', headProps: ['bandage'], fx: ['tears_one', 'question'], tilt: -5 },
    cool:       { eyes: 'shades', brows: null,              mouth: 'smirk',       cheeks: 0.6, arms: 'belly', headProps: ['shades'], fx: ['sparkles'], tilt: -3 },
    angry2:     { eyes: 'squint', brows: [18, -18, -2],     mouth: 'scream',      cheeks: 0.4, arms: 'fists_up', headProps: ['anger'], fx: ['puff'], shake: true },
    cheerful:   { eyes: 'happy',  brows: null,              mouth: 'smile_open',  cheeks: 1,   arms: 'star', midProps: ['star_wand'], fx: ['sparkles'], tilt: 3 },
    hungry:     { eyes: 'wide',   brows: [-4, 4, -2],       mouth: 'drool',       cheeks: 0.9, arms: 'eat', midProps: ['burger'], look: [4, 6] },
    confused:   { eyes: 'uneven', brows: [0, -18, -3, 0, -6], mouth: 'zigzag',    cheeks: 0.7, arms: 'cheeks_low', fx: ['question', 'swirl'], tilt: 5 },
    begging:    { eyes: 'big',    brows: [-14, 14, 0],      mouth: 'wobble',      cheeks: 0.95, arms: 'clasp', fx: ['sparkles'] },
    goodbye:    { eyes: 'happy',  brows: null,              mouth: 'grin',        cheeks: 1,   arms: 'wave', fx: ['bubble_bye', 'hearts_small'], tilt: -3 },
    sob:        { eyes: 'squint', brows: [-16, 16, 2],      mouth: 'cry',         cheeks: 0.8, arms: 'cheeks_low', fx: ['tears_big'], tilt: 2 },
    nerd:       { eyes: 'open',   brows: [0, -8, -2, 0, -3], mouth: 'smile_open',  cheeks: 0.8, arms: 'index_up', headProps: ['glasses'], fx: ['sparkles'], look: [3, -2], tilt: -3 }
  };

  /* the 25 on the sheet, in order */
  A.SHEET = ['happy', 'laughing', 'angry', 'sad', 'excited', 'shy', 'surprised', 'sleepy', 'thinking', 'pouty', 'love', 'kiss', 'wink',
    'embarrassed', 'proud', 'scared', 'tired', 'hurt', 'cool', 'angry2', 'cheerful', 'hungry', 'confused', 'begging', 'goodbye'];
  A.NAMES = A.SHEET.concat(['neutral', 'sob', 'nerd']);

  /* tolerant lookup: "Angry 2", "angry_2" -> angry2 */
  A.resolveExpr = function (name) {
    var n = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (E[n]) return n;
    if (n === 'angrytwo') return 'angry2';
    return 'neutral';
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
