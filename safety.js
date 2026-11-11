/* Leon Offline — safety.js
 * Read-the-room guard. Runs BEFORE any joke logic.
 * If a message sounds like self-harm / hopelessness, Leon drops the act: no jokes, no "yarn", no curses.
 * Detection is rule-based on purpose (high recall, no ML guesswork).
 *
 * !! Hotline numbers below were checked on 2026-11-09 against public listings
 *    (DepEd Lusog-Isip page, TherapyRoute). Numbers change: re-verify before you ship,
 *    and add your own region under Leon.Safety.resources. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  var U = L.Util;

  /* level 2 = explicit; level 1 = hopeless / "tired of life" wording.
   * Patterns run on U.normalize(text): lowercase, no accents or apostrophes, punctuation -> spaces.
   * Recall matters more than precision here: a wrongly gentle reply costs a little awkwardness,
   * a missed one can cost much more. Everyday idioms ("mamatay ako sa hiya") are kept out on purpose. */
  var IDIOM = '(?! sa (?:hiya|kilig|tawa|inis|gutom|antok|init|lamig|sarap|pagod|saya|takot|kaba|ingay|traffic|bagal|sakit|inip|boring|puyat|kakatawa|kakahiya|sobrang))';
  var EXPLICIT = [
    /\bkill(?:ing)? my ?self\b(?! laughing)/, /\bend(?:ing)? my (?:own )?life\b/, /\btake my (?:own )?life\b/, /\bend it all\b/,
    /\bsuicid(?:e|al)\b(?! squad)/, /\bunalive (?:my ?self|me)\b/,
    /\bwant(?:ed)? to die\b(?! (?:laughing|of embarrassment|of shame|from embarrassment|of laughter))/, /\bwanna die\b/, /\bwant to be dead\b/, /\bwish i (?:was|were) dead\b/,
    /\bdont want to (?:live|be alive|exist|be here anymore|wake up)\b/, /\b(?:better|best) off (?:dead|without me)\b/,
    /\bno reason to (?:live|go on)\b/, /\bhurt(?:ing)? my ?self\b/, /\bself ?harm\b/, /\bcut(?:ting)? my ?self\b/,
    /\b(?:take|swallow|drink) (?:all|a bunch of|lots of|too many) (?:my )?(?:pills|meds|medicine|tablets|poison)\b/,
    /\bi (?:will|am going to|want to|wanna) jump (?:off|from)\b/, /\btatalon (?:na )?ako (?:sa|mula)\b/,
    /\bmagpa(?:pa)?kamatay\b/, /\bpagpapakamatay\b/, /\bmagpatiwakal\b/, /\bpatiwakal\b/, /\bpagpapatiwakal\b/,
    new RegExp('\\bgusto (?:ko|kong)? ?(?:nang |na |pang )?(?:lang |nalang |na lang )?mamatay\\b' + IDIOM),
    /\bgusto (?:ko|kong) (?:nang |na )?mawala(?= *$| (?:na )?(?:lang|nalang)\b| sa mundo| ako\b| dito)/,
    /\bayoko (?:nang|na) (?:pang )?mabuhay\b/, /\bayaw ko (?:nang|na) (?:pang )?mabuhay\b/, /\bsawa (?:nang|na) akong mabuhay\b/,
    /\bwala (?:nang|na) (?:akong |ng )?saysay (?:ang |na )?(?:mabuhay|buhay|lahat)\b/,
    /\bwalang saysay (?:ang |na )?(?:mabuhay|mabuhay pa)\b/,
    /\bsasaktan ko (?:ang )?sarili\b/, /\bsaktan ko (?:ang )?sarili ko\b/, /\bsaktan ang sarili ko\b/,
    /\b(?:tapusin|wakasan|tatapusin|wawakasan)\b.{0,25}\b(?:buhay|sarili)\b/,
    new RegExp('\\bmamatay (?:nalang|na lang) ako\\b' + IDIOM),
    /\bmas mabuti pang mawala (?:nalang|na lang) ako\b/, /\bmas gusto ko pang mamatay\b/
  ];
  var SOFT = [
    /\bpagod (?:nang|na) (?:pagod )?(?:ako )?sa (?:buhay|lahat|mundo)\b/, /\bsawa (?:nang|na) (?:ako )?sa (?:buhay|lahat)\b/,
    /\btired of (?:living|life|everything)\b/, /\bcant (?:go on|do this anymore|take (?:it|this) anymore)\b/, /\bhopeless\b/, /\bworthless\b/,
    /\bwala (?:nang|na) (?:akong )?pag ?asa\b/, /\bwala akong silbi\b/, /\bwala akong kwenta\b/, /\bwalang saysay (?:ang )?buhay\b/, /\bwala (?:nang|na) kwenta (?:ang )?buhay\b/,
    /\bburden (?:to|on) (?:everyone|everybody|my family)\b/, /\b(?:feel|am|im|being) (?:like )?(?:a )?burden\b/,
    /\bgusto ko (?:nang|na) sumuko (?:sa buhay)?\b/, /\bayoko (?:nang|na) (?:ng )?lahat\b/, /\bgive up on (?:life|everything)\b/,
    /\b(?:nobody|no one|noone) (?:would|will|wouldnt|will even) (?:even )?(?:miss|notice|care)\b/, /\bif i (?:died|die|disappeared|was gone|were gone|never existed)\b/,
    /\bwish i (?:could )?(?:disappear|vanish|never (?:woke|wake) up|(?:was|were) never born|never existed)\b/, /\bi (?:want|wanna) to (?:disappear|vanish)\b/,
    new RegExp('\\bsana (?:mawala|mamatay) (?:na |nalang |lang )?(?:na lang )?ako\\b' + IDIOM),
    /\bwala (?:nang|na) akong pakialam (?:kung|sa)\b.{0,30}\b(?:mawala|mamatay|mabuhay)\b/,
    /\bsana (?:hindi|di) (?:na )?(?:ako )?(?:nalang |na lang )?(?:magising|ipinanganak|pinanganak)\b/, /\bsana (?:hindi|di) (?:na )?(?:lang |nalang )?ako (?:ipinanganak|pinanganak)\b/,
    /\b(?:hindi|di) na (?:sana )?(?:ako )?magising\b/, /\bkms\b/
  ];

  var Safety = {
    /* Add or replace regions here. Keep lines short: they are read on a phone. */
    resources: {
      PH: {
        emergency: '911',
        lines: [
          { name: 'NCMH Crisis Hotline', numbers: ['1553 (landline)', '0917 899 8727', '0966 351 4518'] },
          { name: 'Hopeline PH', numbers: ['0917 558 4673', '0918 873 4673', '(02) 8804 4673'] }
        ]
      },
      DEFAULT: { emergency: null, lines: [] }
    },

    /* returns {level:0|1|2, hit:string|null} */
    assess: function (text) {
      var n = U.normalize(text);
      if (!n) return { level: 0, hit: null };
      var i;
      for (i = 0; i < EXPLICIT.length; i++) if (EXPLICIT[i].test(n)) return { level: 2, hit: EXPLICIT[i].source };
      for (i = 0; i < SOFT.length; i++) if (SOFT[i].test(n)) return { level: 1, hit: SOFT[i].source };
      return { level: 0, hit: null };
    },

    region: function (cfg) {
      var r = (cfg && cfg.region) || 'PH';
      return Safety.resources[r] || Safety.resources.DEFAULT;
    },

    resourceLine: function (cfg) {
      var res = Safety.region(cfg), parts = [];
      if (res.emergency) parts.push('Emergency: ' + res.emergency);
      res.lines.forEach(function (l) { parts.push(l.name + ': ' + l.numbers.join(' / ')); });
      return parts.join('. ');
    },

    /* Fixed, vetted script. Returns plain beat descriptors (no persona seasoning). */
    script: function (level, cfg, rng) {
      var res = Safety.region(cfg);
      var emergency = res.emergency ? 'tumawag sa ' + res.emergency : 'tumawag sa local emergency number mo';
      var lines = res.lines.map(function (l) { return l.name + ': ' + l.numbers.join(', '); });
      var beats;
      if (level >= 2) {
        beats = [
          { text: 'Huminto muna ang jokes ko. Narinig kita, at salamat sa pagsabi nito sa akin.', expr: 'sad', style: 'soft' },
          { text: 'Hindi mo kailangang buhatin ito mag-isa. Kung nasa panganib ka ngayon, ' + emergency + ' o lumapit sa pinakamalapit na tao, kahit hindi ka magpaliwanag nang mahaba.', expr: 'hurt', style: 'soft', delay: 900 }
        ];
        if (lines.length) beats.push({ text: 'Pwede ka ring tumawag o mag-text. ' + lines.join('. ') + '.', expr: 'sad', style: 'soft', delay: 900 });
        beats.push({ text: 'Nandito ako habang nag-uusap tayo. Pero please, abutin mo rin ang isang tao o hotline ngayon.', expr: 'sad', style: 'soft', delay: 900 });
      } else {
        beats = [
          { text: 'Hindi ko muna ibibiro iyan. Parang bigat na bigat ka na, at salamat sa pagsabi mo.', expr: 'sad', style: 'soft' },
          { text: 'Nandito ako at makikinig. Kung umabot sa punto na naiisip mong saktan ang sarili mo, ' + emergency + (lines.length ? ' o ' + lines[0] : '') + '.', expr: 'hurt', style: 'soft', delay: 900 },
          { text: 'Kung gusto mong magkwento, nandito ako.', expr: 'sad', style: 'soft', delay: 900 }
        ];
      }
      return beats;
    },

    /* Calm follow-ups while the conversation stays serious. */
    followups: [
      'Nandito pa rin ako. Hinga muna tayo nang dahan-dahan: in for 4, hold 4, out for 6.',
      'Hindi ka nag-iisa dito. Kung may kasama ka sa bahay, lumapit ka sa kanya ngayon.',
      'Salamat sa pag-stay at pagkwento. Isang maliit na hakbang lang: tubig, hinga, at lumapit sa taong pinagkakatiwalaan mo.'
    ]
  };

  L.Safety = Safety;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
