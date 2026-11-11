/* Leon Offline — nlu.js
 * Glue between raw text and Leon's models: intent matcher, science/math knowledge matcher,
 * quick detectors (yes/no/laugh/question/topic) and tiny memory extractors (name, hometown, food...). */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var U = L.Util;
  var im = null, km = null;

  function build() {
    if (im && km) return;
    var ex = [], I = L.Data.intents;
    Object.keys(I).forEach(function (label) { I[label].forEach(function (t) { ex.push({ t: t, c: label }); }); });
    im = new L.Matcher(ex);
    var kb = [];
    L.Data.knowledge.forEach(function (e) { e.q.forEach(function (t) { kb.push({ t: t, c: e.id }); }); });
    km = new L.Matcher(kb);
  }

  var YES = /^(?:oo|opo|oo naman|oo nga|yes|yep|yeah|yup|sige|sige na|sige po|go|go lang|game|tara|pwede|pwede po|pwede naman|ok|okay|okey|okay lang|okay po|sure|sure po|syempre|tama|ayos|payag|ge)(?: (?:po|naman|lang|na|sige|leon|please|pls))*$/;
  var NO = /^(?:hindi|hindi po|di|di po|ayoko|ayaw ko|ayoko po|ayaw|no|no po|nope|nah|wag|huwag|wag na|huwag na|wag muna|huwag muna|hindi muna|hindi pa|hindi na|mamaya na|next time|not now|no thanks|hindi salamat)(?: (?:po|na|muna|lang|naman|leon|salamat|thanks|ako|talaga))*$/;
  var LAUGH = /^(?:(?:ha|he|hi|ho|ja|kek|lol|lmao|rofl|wkwk|xd)+)$/;
  var WH = /^(?:what|why|how|when|where|who|which|bakit|paano|ano|sino|saan|kailan|ilan|magkano|totoo ba|pwede ba|is|are|can|do|does|did)\b/;
  var QUIET = /\b(?:tumahimik ka|tumahimik muna|tahimik muna|manahimik ka|shut up|be quiet|stop talking|quiet please|silence please|i need silence|i need quiet|need silence|need quiet|real silence|silence for real|wag ka muna magsalita|huwag ka muna magsalita|wag kang maingay|huwag kang maingay|tigil muna|stop mo muna|tahimik na talaga)\b/;
  var QUIET_REAL = /\b(?:for real|real silence|talaga|seryoso|i need)\b/;
  var WAKE = /\b(?:okay na|ok na|pwede na|pwede ka nang magsalita|magsalita ka na|you can talk|you can speak|leon)\b/;

  var JOBS = 'student|estudyante|nurse|teacher|guro|engineer|developer|programmer|doctor|driver|cashier|freelancer|artist|designer|accountant|lawyer|chef|cook|barista|vendor|seaman|seafarer|call center agent|pharmacist|architect|mechanic|electrician|farmer|magsasaka';
  var NAME_STOP = /^(?:kuya|ate|boss|bes|pare|sir|maam|madam|tired|sad|pagod|gutom|happy|bored|masaya|malungkot|leon|na|po|si|ang|ay|ako|ikaw|siya|hindi|not|so|very|just|here|dito|okay|ok|fine|good|bad)$/i;
  var PLACE_STOP = /^(?:work|school|home|bahay|trabaho|office|class|the|a|an|there|dito|doon|na|po|ako|ka|siya|school|palengke|mall|gym)$/i;

  var STRESS = [
    [/\b(?:board exam|exam|exams|test|quiz|finals?|midterms?)\b/, 'exam mo'],
    [/\b(?:deadline|due)\b/, 'deadline mo'],
    [/\binterview\b/, 'interview mo'],
    [/\b(?:presentation|report|defense|pitch)\b/, 'presentation mo'],
    [/\bthesis\b/, 'thesis mo'],
    [/\b(?:work|trabaho|boss|shift)\b/, 'trabaho mo']
  ];


  /* ---- keyword cues: the safety net under the example matcher ----
   * The matcher generalises from examples; these cues catch emotion/content words it has never seen in a
   * sentence frame. Order = priority (sadness beats tiredness). Guards keep "are YOU sad?" and "I'm not sad" out. */
  var NEG = /\b(?:hindi|di|not|never|walang|wala|dont|isnt|aint|ayaw|ayoko)\b/;
  var FIRST = /\b(?:ako|ko|i|im|me|my|akin|kami|natin|namin|kita)\b/;
  var SECOND = /\b(?:ka|you|youre|ikaw|mo|your|kayo|niyo)\b/;
  var REQUEST = /\b(?:give|tell|share|may|pa|naman|please|pls|another|isa pa|gimme|bigyan|magbigay|sabihan|bring|any)\b/;
  var EMO_CUES = [
    ['feel_sad', /\b(?:sad|malungkot|nalulungkot|lungkot|lonely|heartbroken|miserable|depressed|umiiyak|naiiyak|iyak|nasasaktan|brokenhearted)\b/],
    ['feel_anxious', /\b(?:anxious|anxiety|nervous|nerbyos|ninenerbyos|kabado|kinakabahan|kaba|worried|nag aalala|nagaalala|natatakot|takot|balisa|panic|panicking|nagpapanic|overthink|overthinking|nag ooverthink|stressed|stress|uneasy)\b/],
    ['feel_angry', /\b(?:angry|mad|galit|naiinis|inis|badtrip|bwisit|furious|pissed|irritated|frustrated|asar|nanggigigil)\b/],
    ['feel_tired', /\b(?:tired|pagod|napapagod|exhausted|drained|burnout|burnt out|inaantok|sleepy|puyat|hapo)\b/],
    ['feel_happy', /\b(?:happy|masaya|tuwang tuwa|excited|proud|thrilled|joyful|saya|good vibes)\b/],
    ['user_bored', /\b(?:bored|boring|nababagot|naiinip|nabobore|bagot)\b/],
    ['food_hungry', /\b(?:hungry|starving|gutom|nagugutom|famished)\b/]
  ];
  var CONTENT_CUES = [
    ['quote_request', /\b(?:quotes?|inspire me|motivate me)\b/],
    ['joke_request', /\b(?:jokes?|patawa|patawanin|magjoke|pajoke|pa joke)\b/],
    ['fact_request', /\b(?:fun fact|facts?|alam mo ba)\b/]
  ];
  var EMO_SET = { feel_sad: 1, feel_anxious: 1, feel_angry: 1, feel_tired: 1, feel_happy: 1, user_bored: 1, food_hungry: 1 };
  var GREET_ONLY = /^(?:yo+|yow|sup|hi+|hello+|hey+|hoy|oy|uy|hola|musta|kumusta|kamusta)(?: (?:leon|po|na|guys|there|everyone|naman))*$/;
  var THANKS_START = /^(?:thanks|thank you|thankyou|ty|tysm|thx|salamat|maraming salamat)\b/;
  var BYE_START = /^(?:bye|goodbye|paalam|ciao|babay|see you)\b/;

  function emotionCue(norm, isQ) {
    var hasFirst = FIRST.test(norm), hasSecond = SECOND.test(norm);
    if (hasSecond && !hasFirst) return null;               /* "are you tired?" is about Leon */
    if (isQ && !hasFirst) return null;                     /* "what is anxiety?" is a science question */
    for (var i = 0; i < EMO_CUES.length; i++) {
      var m = EMO_CUES[i][1].exec(norm);
      if (!m) continue;
      var before = norm.slice(Math.max(0, m.index - 22), m.index);
      if (NEG.test(before)) continue;                       /* "hindi ako malungkot" */
      return EMO_CUES[i][0];
    }
    return null;
  }
  function contentCue(norm) {
    if (norm.split(' ').length > 9) return null;
    if (SECOND.test(norm) && !REQUEST.test(norm)) return null;   /* "ang corny ng joke mo" */
    for (var i = 0; i < CONTENT_CUES.length; i++) if (CONTENT_CUES[i][1].test(norm)) return CONTENT_CUES[i][0];
    return null;
  }

  var NLU = {
    cfg: { minScore: 0.40, kbMin: 0.45, kbFromIntent: 0.34 },

    intent: function (text) {
      build();
      var r = im.classify(text), norm = U.normalize(text);
      var out = { label: r.label, score: r.score, margin: r.margin, ranked: (r.ranked || []).slice(0, 3), nearest: r.nearest, low: false, cue: null };
      if (!r.label || r.score < NLU.cfg.minScore) { out.label = 'unknown'; out.low = true; }
      var weak = out.low || r.score < 0.6, cur = out.label;
      var emo = emotionCue(norm, NLU.isQuestion(text, norm));
      if (GREET_ONLY.test(norm)) { out.label = 'greeting'; out.cue = 'greeting'; out.low = false; }
      else if (emo && emo !== cur && (weak || EMO_SET[cur])) { out.label = emo; out.cue = emo; out.low = false; }
      else {
        var cc = contentCue(norm);
        if (cc && cc !== cur && (out.low || r.score < 0.7) && !EMO_SET[cc]) { out.label = cc; out.cue = cc; out.low = false; }
        else if (THANKS_START.test(norm) && cur !== 'thanks' && !emo && r.score < 0.85) { out.label = 'thanks'; out.cue = 'thanks'; out.low = false; }
        else if (BYE_START.test(norm) && cur !== 'farewell' && !emo && r.score < 0.85) { out.label = 'farewell'; out.cue = 'farewell'; out.low = false; }
      }
      return out;
    },

    /* science / math knowledge lookup -> {entry, score} or null */
    kb: function (text, minScore) {
      build();
      var r = km.classify(text);
      if (!r.label || r.score < (minScore === undefined ? NLU.cfg.kbMin : minScore)) return null;
      var entry = null;
      L.Data.knowledge.forEach(function (e) { if (e.id === r.label) entry = e; });
      return entry ? { entry: entry, score: r.score } : null;
    },

    isYes: function (norm) { return YES.test(norm); },
    isNo: function (norm) { return NO.test(norm); },
    isLaugh: function (raw, norm) { return LAUGH.test(norm) || /\uD83D[\uDE02\uDE06\uDE04]|\uD83E\uDD23/.test(raw); },
    isQuestion: function (raw, norm) { return /\?/.test(raw) || WH.test(norm); },
    wantsQuiet: function (norm) { return QUIET.test(norm); },
    quietIsReal: function (norm) { return QUIET_REAL.test(norm); },
    isWake: function (norm) { return WAKE.test(norm); },

    topic: function (norm) {
      if (/\b(math|mathematics|algebra|number|numbers|calculus|geometry|equation|prime|pi)\b/.test(norm)) return 'math';
      if (/\b(science|physics|chem|chemistry|atom|biology|space|planet)\b/.test(norm)) return 'science';
      if (/\b(dino|dinosaur|dinosaurs|t rex|trex)\b/.test(norm)) return 'dino';
      if (/\b(pinoy|filipino|jeep|jeepney|barkada|pilipinas)\b/.test(norm)) return 'ph';
      if (/\b(dad|dad joke|pun)\b/.test(norm)) return 'dad';
      return null;
    },

    /* very small memory extractor. Returns only fields it is confident about. */
    extract: function (raw) {
      var t = String(raw || '').trim(), out = {}, m;
      if ((m = /\b(?:call me|tawagin mo (?:akong|ako))\s+(kuya|ate|boss|bes|pare|sir|ma'?am|maam)\b/i.exec(t))) {
        out.call = m[1].toLowerCase().replace("'", '');
        if (out.call === 'maam') out.call = "ma'am";
      } else if ((m = /\b(?:my name is|my name's|i am called|i'?m called|call me|ako si|ako po si|pangalan ko(?: ay)?|ang pangalan ko(?: ay)?|tawagin mo (?:akong|ako))\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]{1,19})/i.exec(t))) {
        if (!NAME_STOP.test(m[1])) out.name = U.titleCase(m[1]);
      }
      if ((m = /\b(?:taga[\s-]+|i'?m from |i am from |galing ako sa |nakatira ako sa |nakatira po ako sa )([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.-]*(?: [A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.-]*)?)/i.exec(t))) {
        var place = m[1].replace(/\s+(?:ako|po|ka|na|lang)$/i, '').trim();
        if (place && !PLACE_STOP.test(place)) out.hometown = U.titleCase(place);
      }
      if ((m = /\b(?:favou?rite|paboritong|paborito kong|fave)\s+(?:food|ulam|pagkain|merienda|snack)\s*(?:ko)?\s*(?:is|ay|na|:)?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\- ]{1,24})/i.exec(t))) {
        out.food = m[1].replace(/\s+(?:po|ko|ay|lang|talaga)$/i, '').trim().toLowerCase();
      }
      var jobRe = new RegExp("\\b(?:i'?m (?:an? )?|i am (?:an? )?|i work as (?:an? )?)(" + JOBS + ")\\b|\\b(" + JOBS + ") (?:ako|po ako)\\b", 'i');
      if ((m = jobRe.exec(t))) out.job = (m[1] || m[2]).toLowerCase();
      var n = U.normalize(t);
      for (var i = 0; i < STRESS.length; i++) {
        if (STRESS[i][0].test(n) && /\b(?:may|have|has|bukas|tomorrow|next|kinakabahan|nervous|stress|stressed|anxious|worried|natatakot|kaba|due)\b/.test(n)) { out.stress = STRESS[i][1]; break; }
      }
      if (/\b(?:po|opo)\b/i.test(t)) out.usedPo = true;
      return out;
    },

    /* for the "may data ako sayo" debug panel and tests */
    _build: build
  };

  L.NLU = NLU;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
