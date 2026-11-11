/* Leon Offline — intents_templates.js
 * Grows the intent examples by combining sentence frames with word lists, so Leon recognises
 * "i am so anxious" and "sobrang kabado ako" without anyone typing 300 near-duplicates.
 * Load this AFTER intents.js. To teach Leon a new emotion word, add it to the list and rebuild. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var I = L.Data.intents;
  L.Data.intentsBaseCount = {};                 /* how many hand-written examples each label had (used by the tests) */
  Object.keys(I).forEach(function (k) { L.Data.intentsBaseCount[k] = I[k].length; });

  function add(label, list) { (I[label] = I[label] || []).push.apply(I[label], list); }
  function expand(label, frames, words) {
    var out = [];
    words.forEach(function (w) { frames.forEach(function (f) { out.push(f.replace(/\{w\}/g, w)); }); });
    add(label, out);
  }

  var EN = ['i am so {w}', 'i feel {w}', 'im {w} today', 'feeling {w}', 'so {w} right now', 'i feel so {w} leon', 'ugh im {w}'];
  var TL = ['{w} ako', '{w} na ako', 'sobrang {w} ko', '{w} ako ngayon', '{w} ako leon', '{w} po ako', 'feeling ko {w} ako'];
  var ROOT = ['ang {w} ko', 'ang {w} ko today', 'sobrang {w} ko ngayon'];

  expand('feel_sad', EN, ['sad', 'lonely', 'down', 'depressed', 'heartbroken', 'miserable', 'upset', 'empty', 'hurt']);
  expand('feel_sad', TL, ['malungkot', 'nalulungkot', 'nasasaktan', 'umiiyak', 'naiiyak', 'heartbroken', 'sad', 'mag-isa', 'down']);
  expand('feel_sad', ROOT, ['lungkot', 'bigat ng dibdib', 'sakit']);
  add('feel_sad', ['namimiss ko siya', 'nag-away kami ng jowa ko', 'iniwan niya ako', 'wala akong kasama', 'ang lungkot ng gabi', 'gusto ko lang umiyak']);

  expand('feel_tired', EN, ['tired', 'exhausted', 'sleepy', 'drained', 'burnt out', 'worn out', 'wiped out', 'beat']);
  expand('feel_tired', TL, ['pagod', 'napapagod', 'inaantok', 'puyat', 'hapong-hapo', 'lupaypay', 'burnout', 'drained']);
  expand('feel_tired', ROOT, ['pagod', 'antok', 'puyat']);

  expand('feel_anxious', EN, ['anxious', 'nervous', 'worried', 'stressed', 'scared', 'panicking', 'overthinking', 'afraid', 'uneasy', 'on edge', 'stressed out']);
  expand('feel_anxious', TL, ['kabado', 'kinakabahan', 'nag-aalala', 'natatakot', 'balisa', 'ninenerbyos', 'stressed', 'nagpa-panic', 'nag-ooverthink', 'overthinking']);
  expand('feel_anxious', ROOT, ['kaba', 'takot', 'stress', 'kabado']);
  add('feel_anxious', ['i have an exam tomorrow and i am scared', 'may interview ako bukas kinakabahan ako', 'my heart is racing', 'hindi ako makatulog sa kaba', 'i feel nervous about tomorrow', 'i cant stop overthinking']);

  expand('feel_angry', EN, ['angry', 'mad', 'annoyed', 'furious', 'pissed', 'irritated', 'frustrated']);
  expand('feel_angry', TL, ['galit', 'naiinis', 'badtrip', 'inis na inis', 'asar', 'bwisit', 'frustrated', 'nanggigigil']);
  expand('feel_angry', ROOT, ['inis', 'galit', 'bwisit']);

  expand('feel_happy', EN, ['happy', 'excited', 'great', 'amazing', 'proud', 'joyful', 'pumped', 'thrilled', 'so good']);
  expand('feel_happy', TL, ['masaya', 'tuwang-tuwa', 'excited', 'proud', 'good vibes', 'masiglang-masigla', 'sobrang saya']);
  expand('feel_happy', ROOT, ['saya', 'tuwa', 'excited']);
  add('feel_happy', ['pumasa ako', 'i passed the exam', 'nakuha ko yung trabaho', 'i got the job', 'ang ganda ng araw ko', 'best day ever']);

  expand('user_bored', EN, ['bored', 'so bored', 'bored out of my mind']);
  expand('user_bored', TL, ['bored', 'nababagot', 'naiinip', 'nabo-bore', 'walang magawa']);
  add('user_bored', ['nakakabagot', 'nakakaburyo', 'ang boring', 'wala akong magawa', 'i have nothing to do', 'entertain me', 'libangin mo ako']);

  expand('food_hungry', EN, ['hungry', 'starving', 'famished']);
  expand('food_hungry', TL, ['gutom', 'nagugutom', 'gutom na gutom', 'takam na takam']);
  add('food_hungry', ['i want to eat', 'i want food', 'ano ulam', 'ano kakainin ko', 'what should we eat', 'kain na tayo', 'gusto ko ng merienda', 'what to eat for dinner']);

  add('greeting', ['yow', 'yo leon', 'hii', 'heyy', 'helloo po', 'musta na', 'kamusta na', 'oy leon kumusta', 'hey hey', 'yooo', 'hola', 'hoy']);
  add('quote_request', ['give me a quote', 'gimme a quote', 'sabihan mo ako ng quote', 'may quote ka ba', 'quote of the day', 'pa-quote naman', 'inspire me', 'motivate me', 'bigyan mo ako ng quote', 'magbigay ka ng quote', 'quote mo naman', 'any quote for me']);
  add('joke_request', ['joke naman', 'give me a joke', 'may joke ka ba', 'pa-joke', 'magjoke ka', 'patawanin mo ako', 'tell me something funny', 'dad joke please', 'math joke', 'science joke', 'pinoy joke']);
  add('fact_request', ['fun fact', 'give me a fact', 'random fact', 'may alam ka bang fact', 'alam mo ba', 'share a fact', 'ano ang fun fact', 'tell me something interesting', 'sabihan mo ako ng fact']);
  add('compliment', ['you are so cool', 'youre amazing', 'you are the best', 'ang galing mo', 'ang astig mo', 'idol kita', 'ang cute mo', 'lodi', 'ang talino mo', 'ang bait mo', 'you are so smart', 'you are so funny', 'ang cute cute mo', 'galing mo leon', 'you are adorable']);
  add('insult_mild', ['you talk too much', 'you are so noisy', 'ang ingay mo', 'ang daldal mo', 'madaldal ka', 'you never stop talking', 'ang kulit mo', 'nakakainis ka', 'you are annoying', 'tigilan mo na ang kadaldalan mo']);
  add('about_offline', ['may wifi ka ba', 'may internet ka ba', 'kailangan mo ba ng internet', 'online ka ba', 'naka-offline ka ba', 'are you connected to the internet', 'do you use the cloud', 'are you chatgpt', 'do you need wifi', 'walang signal gumagana ka ba', 'does this work without data']);
  add('mute_threat', ['imumute kita', 'i-mute na kita', 'ima-mute na kita', 'mute kita', 'i will mute you', 'im going to mute you', 'muting you now', 'papatayin ko ang sound mo', 'pipindutin ko ang mute', 'mamute na kita']);
  add('thanks', ['thanks leon', 'thank you leon', 'salamat leon', 'ty', 'thanks po', 'thx', 'maraming salamat po', 'salamat sa tulong mo']);
  add('farewell', ['bye leon', 'bye na', 'una na ako', 'sige alis na ako', 'see you', 'ciao', 'bye bye', 'balik ako mamaya', 'paalam na']);
  add('love_you', ['i love you leon', 'mahal kita', 'love you', 'love kita', 'ily', 'i like you leon', 'gusto kita leon', 'you are my best friend']);
  add('ask_ai', ['are you an ai', 'ai ka ba', 'robot ka ba', 'are you a robot', 'are you human', 'tao ka ba', 'are you real', 'totoo ka ba', 'are you a real person', 'are you a bot', 'bot ka ba', 'is this a person', 'are you alive', 'buhay ka ba']);
  add('science_question', ['bakit may thunder', 'why is there thunder', 'bakit kumikidlat', 'how does lightning work', 'paano nabubuo ang ulap', 'why do we have seasons', 'bakit may gabi at araw']);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
