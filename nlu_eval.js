'use strict';
/* Held-out accuracy (phrases that are NOT in the training data) + leave-one-out over the training data. */
module.exports = function (H, Leon) {
  var N = Leon.NLU, ok = H.ok;
  var HELD = {
    greeting: ['hi po leon', 'hello there', 'kumusta na', 'magandang umaga leon', 'yow', 'hey leon andiyan ka ba', 'uy kumusta', 'good evening po', 'oy gising ka ba'],
    farewell: ['bye na', 'sige ingat ka', 'alis na muna ako leon', 'see you later leon', 'paalam na po', 'mauna na ako ha', 'uwi na muna ako'],
    goodnight: ['good night leon', 'matutulog na ako', 'tulog na ako leon', 'gn po', 'sleep na ako', 'night night leon'],
    thanks: ['salamat leon', 'thank you po', 'thanks a lot', 'maraming salamat', 'salamat sa tulong', 'thanks leon ang bait mo'],
    how_are_you: ['kumusta ka', 'how are you', 'ayos ka lang ba', 'how are you doing leon', 'kamusta ka naman', 'okay ka lang ba diyan'],
    doing: ['ano ginagawa mo', 'what are you doing', 'anong ginagawa mo ngayon', 'busy ka ba'],
    feel_sad: ['malungkot ako', 'i feel so sad today', 'ang lungkot ko ngayon', 'sad ako leon', 'umiiyak ako', 'i am feeling down', 'nalulungkot ako', 'ang bigat ng pakiramdam ko'],
    feel_tired: ['pagod na ako', 'i am so tired', 'pagod ako grabe', 'ang pagod ko today', 'inaantok na ako', 'drained na ako'],
    feel_anxious: ['kinakabahan ako', 'i am so anxious', 'nag-aalala ako sa exam', 'stressed na ako', 'sobrang kabado ako', 'i feel nervous about tomorrow'],
    feel_angry: ['galit ako', 'naiinis ako', 'i am so angry', 'nakakainis ang araw ko', 'badtrip ako', 'inis na inis ako'],
    feel_happy: ['masaya ako', 'i am so happy today', 'ang saya ko ngayon', 'good vibes ako', 'happy ako leon', 'nakakatuwa ang araw ko'],
    user_bored: ['bored ako', 'i am so bored', 'ang boring', 'wala akong magawa', 'nabo-bore ako', 'nakakabagot'],
    joke_request: ['joke naman', 'tell me a joke', 'magjoke ka', 'patawanin mo ako', 'may joke ka ba', 'pa-joke naman'],
    quote_request: ['quote naman', 'give me a quote', 'may quote ka ba', 'sabihan mo ako ng quote', 'magbigay ka ng quote'],
    fact_request: ['fun fact', 'tell me a fun fact', 'may alam ka bang fact', 'random fact naman', 'share ka ng fact'],
    science_question: ['bakit asul ang langit', 'how do airplanes fly', 'why is the ocean salty', 'ano ang gravity', 'what is a black hole', 'paano nabubuo ang bahaghari', 'bakit may thunder'],
    roast_me: ['roast me', 'i-roast mo ako', 'asarin mo ako', 'roast mo ako leon'],
    compliment: ['ang cute mo', 'you are so cool', 'ang galing mo leon', 'you are awesome', 'ang talino mo'],
    insult_mild: ['ang ingay mo', 'ang kulit mo', 'you talk too much', 'ang daldal mo', 'madaldal ka masyado'],
    insult_harsh: ['bobo ka', 'you are stupid', 'walang kwenta ka', 'you are useless', 'tanga ka ba'],
    food_hungry: ['gutom na ako', 'i am hungry', 'ano masarap kainin', 'what should i eat', 'kain tayo', 'nagugutom ako'],
    identity: ['sino ka', 'who are you', 'ano ka ba', 'ano ang pangalan mo', 'what are you', 'taga saan ka'],
    what_is_yarn: ['ano yung yarn', 'what does yarn mean', 'bakit mo laging sinasabi yarn', 'anong ibig sabihin ng yarn'],
    about_offline: ['offline ka ba', 'do you need internet', 'may wifi ka ba', 'gumagana ka ba kahit walang internet'],
    ask_ai: ['are you an ai', 'robot ka ba', 'are you a real person', 'tao ka ba'],
    capabilities: ['ano ang kaya mo', 'what can you do', 'anong pwede mong gawin', 'ano ang mga kaya mo gawin'],
    love_you: ['i love you', 'mahal kita leon', 'love you leon', 'love kita'],
    apology: ['sorry leon', 'pasensya na', 'sorry po', 'patawad'],
    realtime_info: ['what is the weather today', 'ano ang balita ngayon', 'ano ang score ng game', 'magkano ang bitcoin ngayon', 'ulan ba bukas'],
    yes: ['oo', 'sige po', 'yes', 'sige na', 'game'],
    no: ['hindi', 'ayoko', 'no thanks', 'hindi po', 'wag na'],
    laugh: ['hahaha', 'lol', 'hehe', 'hahahaha'],
    again: ['isa pa', 'another one', 'one more', 'again', 'pa-isa nga'],
    mute_threat: ['i will mute you', 'imumute kita', 'ima-mute na kita', 'i-mute na kita'],
    silence_request: ['tumahimik ka muna', 'shut up', 'be quiet please', 'i need silence', 'tahimik muna']
  };
  var total = 0, right = 0, wrong = [];
  Object.keys(HELD).forEach(function (label) {
    HELD[label].forEach(function (t) {
      total++;
      var got = N.intent(t).label;
      /* yes/no/laugh are caught by rules in the brain, so accept either path */
      var rule = (label === 'yes' && N.isYes(Leon.Util.normalize(t))) || (label === 'no' && N.isNo(Leon.Util.normalize(t))) || (label === 'laugh' && N.isLaugh(t, Leon.Util.normalize(t)));
      var q = (label === 'silence_request' && N.wantsQuiet(Leon.Util.normalize(t))) || (label === 'science_question' && !!N.kb(t, N.cfg.kbFromIntent));
      if (got === label || rule || q) right++; else wrong.push(label + ' <- "' + t + '" got ' + got);
    });
  });
  var acc = right / total;
  console.log('  held-out accuracy: ' + right + '/' + total + ' = ' + (acc * 100).toFixed(1) + '%');
  wrong.forEach(function (w) { console.log('    miss: ' + w); });
  ok(acc >= 0.88, 'held-out intent accuracy >= 88%', (acc * 100).toFixed(1) + '%');

  /* leave-one-out over the HAND-WRITTEN examples (template-generated ones stay in the model, but are not graded) */
  var I = Leon.Data.intents, BC = Leon.Data.intentsBaseCount, ex = [];
  Object.keys(I).forEach(function (c) { I[c].forEach(function (t, k) { ex.push({ t: t, c: c, base: k < (BC[c] || 0) }); }); });
  var M = new Leon.Matcher(ex), loo = 0, graded = 0, miss = {};
  ex.forEach(function (e, i) {
    if (!e.base) return;
    graded++;
    var r = M.classify(e.t, i), lab = (!r.label || r.score < N.cfg.minScore) ? 'unknown' : r.label;
    if (lab === e.c || (e.c === 'science_question' && !!N.kb(e.t, N.cfg.kbFromIntent))) loo++; else (miss[e.c] = miss[e.c] || []).push(e.t + ' -> ' + lab);
  });
  var looAcc = loo / graded;
  console.log('  leave-one-out accuracy (hand-written examples): ' + loo + '/' + graded + ' = ' + (looAcc * 100).toFixed(1) + '%');
  ok(looAcc >= 0.55, 'leave-one-out accuracy >= 55% (strict: each sentence is hidden from the model)', (looAcc * 100).toFixed(1) + '%');

  /* out-of-domain gibberish should fall to unknown, not hallucinate an intent */
  var gib = ['asdkjh qwe', 'xyzzy plugh', 'lorem ipsum dolor sit amet', 'purple monkey dishwasher', 'zzzzzz', 'qwertyuiop'];
  var unk = gib.filter(function (t) { return N.intent(t).label === 'unknown'; }).length;
  ok(unk >= gib.length - 1, 'gibberish -> unknown', unk + '/' + gib.length);
};
