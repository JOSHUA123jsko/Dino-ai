# Leon the Dino — offline companion kit

Everything Leon needs to live inside your app **with no internet, no API, no account**: his brain (personality + language matcher), his animated face and body, and his own voice. Plain JavaScript (ES5, no dependencies), so it runs in any browser, in an Android/iOS WebView, or in Node for testing.

> **Be clear-eyed about one thing.** "Own model, without API" is delivered as a small on-device language model of my own making (TF-IDF intent matcher + rules + hand-written Taglish content), **not** a large language model. Leon is witty inside what he knows, and says "hindi ko alam" when he doesn't. Section 9 explains how to go further.

---

## 1. Start here (2 minutes)

| I want to… | Do this |
|---|---|
| **See him now** | Double-click `dist/leon-demo.html` (one file, works from your phone's file manager or your PC, no server). Tap "Wake Leon". |
| **Put him in my web app / WebView** | Copy `dist/leon.js` into your project and follow section 2. |
| **Install him as an offline web app** | Host the folder `dist/web/` on any static server (or open it from a WebView). It registers a service worker and keeps working with the server gone. |
| **Make the floating home-screen dino on Android** | Use `android/` (section 5) and `dist/leon-overlay.html`. |
| **Change his personality / jokes / sentences** | Edit files in `src/data/`, then `node tools/build.js` (section 7). |

Rebuild everything with `node tools/build.js` (needs Node 18+, nothing to install). Run all tests with `node tests/run_all.js`.

---

## 2. Use Leon in your own page

```html
<div id="leon" style="width:300px;height:380px"></div>
<div id="bubble"></div>                       <!-- optional speech bubble: gets class "show" and "action" -->
<script src="leon.js"></script>
<script>
  var leon = Leon.Companion.create({
    container: document.getElementById('leon'),   // the avatar is drawn here as SVG (no image files needed)
    bubble:    document.getElementById('bubble'),
    config:    { region: 'PH', profanity: 'on', yarn: 'normal', boredom: 'casual' },
    voice:     { engine: 'auto' }                 // 'auto' | 'device' | 'leon' | 'off' | your own (section 6)
  });

  document.addEventListener('pointerdown', function () { leon.unlock(); }, { once: true });  // browsers keep audio locked until a tap
  leon.start();                    // greeting
  leon.say('kumusta leon');        // what the person typed or said
</script>
```

### The `leon` object

| Call | What it does |
|---|---|
| `say(text)` | Leon understands it, answers, and performs the answer (face, body, voice, lip-sync). Returns a Promise. |
| `speak(text, {expr, gesture, style})` | He says exactly this (e.g. for a notification), bypassing the brain. |
| `poke()` / `wake()` | He reacts to a tap / wakes up. |
| `mute()` / `unmute()` / `toggleMute()` | The mute-button meltdown: confusion → bargaining → crying; unmute → asks permission, whispers, forgets, shouts about science. |
| `quiet()` | "I need silence": he gives one last sob, then respects the silence. |
| `setConfig({...})`, `setVoice({...})` | Change personality or voice settings live. |
| `snapshot()` | `{cfg, state:{profile:{name,hometown,food,job,…}, mood}, session}`: what he remembers. |
| `resetMemory()` | Forget the person (stored only in `localStorage`, key prefix `leon:`). |
| `on(event, fn)` | Events: `user`, `reply`, `beat`, `beatEnd`, `idle`, `cancel`, `mute`, `error`. |
| `brain`, `avatar`, `voice`, `stage` | The parts, if you need them directly. |

Boredom and dozing off run by themselves (a 1-second timer asks the brain; it pauses while the page is hidden). A **beat** is one thing Leon does: `{text, voice, expr, gesture, sfx, style, delay, hold, silent, action, mouth}`; `src/ui/app.js` shows how the demo logs and displays them.

### Config (`Leon.Brain.DEFAULTS`)

`region` `'PH'|'DEFAULT'` crisis numbers · `profanity` `'on'|'off'` (off = kid-safe: curses become "hay naku") · `honorific` `'auto'|'always'|'never'` (po/opo) · `call` `'auto'|'kuya'|'ate'|'boss'|'bes'|'pare'|'sir'|"ma'am"` · `yarn` `'low'|'normal'|'high'` · `boredom` `'off'|'demo'|'casual'|'chill'` · `sleepHours` `[22,6]` · `muteDrama` `'full'|'short'|'off'` · `maxScreams` · `askQuestions` · `seed`.

---

## 3. What Leon does (personality, from your bible)

* "yarn" ends sentences but is seasoning, not noise; Taglish; po/opo respect when the person uses it.
* r-curses (*putragis, tarantado, bruha, sira ulo*) are exclamations and never insults; roasting with them only after trust builds. They switch off in serious moments and with `profanity: 'off'`.
* Reads the room: sad → presence first, jokes only if the person signals it's okay. Offers "explanation o comfort lang?".
* Quotes as tools, math/science lenses with humility, asks permission before personal questions, remembers small details (name, food, hometown, job, what stressed you).
* Boredom stages that end in a theatrical "AHHH", then "Wala lang, na-bore lang ako, yarn."
* Mute button drama (your addendum), including the fail-safe ("I need silence for real" → one last sob, then he respects it) and the unmute whisper that turns into a science shout.
* Built-ins that run **before** any language matching: safety, silence request, a calculator (no `eval`), clock/date, memory extraction, yes/no/laugh.

### Safety behaviour (please read)

If someone says they want to die or hurt themselves (explicit), or shows hopelessness (soft), Leon drops the jokes, "yarn" and curses, and uses fixed, careful scripts. With `region: 'PH'` he shares Philippine hotlines. **The numbers in `Leon.Safety.resources` were checked on 2026-11-09 against two public pages (listed at the bottom) and can go stale. Re-verify them before you ship**, and add your own region by extending `Leon.Safety.resources`. He is a friend-shaped app, not a crisis service, and the app's own screens should say so.

---

## 4. Avatar

A procedural SVG puppet (layered groups, no image assets): 25 expressions from your sheet (happy, laughing, angry, sad, excited, shy, surprised, sleepy, thinking, pouty, love, kiss, wink, embarrassed, proud, scared, tired, hurt, cool, angry2, cheerful, hungry, confused, begging, goodbye) plus `neutral`, `sob`, `nerd`. Idle squash-and-stretch floating, breathing, blinking, wandering eyes, 13 gestures (`bounce shake spin wave legbounce pace scream wiggle nod hop sit shrug point_mouth`), 10 mouth shapes (`X M A E I O U F L S`) for lip-sync.

```js
var av = Leon.Avatar.create(el, { autostart: true, fps: 30, calm: false });
av.setExpression('excited'); av.gesture('wave'); av.setMouth('A', 1); av.lookAt(2, -1); av.blink();
Leon.Avatar.render({ expr: 'happy' })      // one static SVG string (for icons, stickers, tests)
```

`node tools/render_sheet.js out/` writes every expression as SVG/PNG with a contact sheet. `node tools/make_icons.js --android` regenerates the app icons.

---

## 5. Android (floating dino on the home screen)

Work in progress in this draft: see `android/`.

---

## 6. Voice

`Leon.Voice` chooses the sound source and keeps the lips in sync (`engine`):

* **`device`**: the phone's own offline text-to-speech (through the optional Android bridge `window.LeonNative`, or the browser's Web Speech API). Natural, but Filipino pronunciation depends on the voices installed on the phone.
* **`leon`**: Leon's **own built-in voice** (`Leon.LeonSynth`, a formant synthesizer written from scratch: grapheme→phoneme rules for Filipino/English, glottal source, formant/nasal/fricative/burst models, prosody). Always available, fully offline. It sounds **cute and a little robotic**, and it is best on Filipino spelling. I could only measure it numerically (levels, formants, pitch, timing), not listen to it, so please judge the sound yourself and tune `voice: { leon: { pitch: 255, formant: 1.10 } }`.
* **`auto`** (default): device voice if the phone has one, otherwise Leon's own.
* **`off`**: silent, lips still move.
* **Your own**: bundle an offline neural TTS (Piper, Sherpa-ONNX, …) and plug it in:

```js
leon.voice.registerEngine('piper', function (text, o) {        // o = { style, rate, pitch, lang }
  return myOfflineTts.synthesize(text, o).then(function (audio) {   // a value or a Promise
    return { pcm: audio.samples /* Float32Array, mono, -1..1 */, sampleRate: audio.sampleRate };
  });
});
leon.setVoice({ engine: 'piper' });
```
Leon plays the audio, mutes it with the mute button, and lip-syncs it (see `registerEngine` in `src/voice/voice.js`).

Lip-sync works for every engine: Leon's own voice from the exact phoneme timeline, device voices from an estimated timeline stretched to the real duration and re-synced on word boundaries.

**Speech recognition (listening)** is not built in: the browser's recognizer needs the internet. On Android you can feed an offline recognizer into `Leon.host.say(text)` (see `android/`).

---

## 7. Teach Leon new things

* **Sentences → intents**: `src/data/intents.js` (a few example sentences per intent; the matcher generalizes).
* **Words that expand into many sentences**: `src/data/intents_templates.js`.
* **What he answers**: `src/data/lines.js` (lines per situation), `src/data/jokes.js` (jokes, quotes, facts), `src/data/knowledge.js` (science/math facts and explanations), handlers in `src/engine/brain.js`.
* Rebuild with `node tools/build.js`, run `node tests/run_all.js`. `node tests/nlu_eval.js`-style accuracy checks live in `tests/nlu_eval.js` (held-out sentences + leave-one-out).

Measured quality of the matcher on my held-out sentences: about 99%; strict leave-one-out over the training data about 60% (many near-duplicate intents confuse it). Unknown input falls back to an honest "hindi ko alam", not a made-up answer.

---

## 8. Tests

`node tests/run_all.js` (about 90 seconds with the browser suites; `--no-browser` for 12 seconds):
engine/brain/NLU (196 checks) · voice (142) · stage/companion (47) · build and script order (53) · avatar in headless Chromium (134) · whole demo app in headless Chromium incl. chat, mute drama, settings, memory, overlay with a fake Android bridge, one-file builds, offline PWA (113). `npm run lint` (ESLint) enforces ES5 syntax and undefined-variable checks.

---

## 9. Honest limits

* **Not an LLM.** Open-ended conversation outside what is in `src/data/` gets "hindi ko alam". To go further: fine-tune a small on-device model with `training/` (persona prompt + generated chat examples) and put it behind the rule layers (safety first), or add an engine of your own to `Leon.Brain`.
* **His own voice is robotic-cute and unheard by me.** Use the device voice for natural speech.
* **The Android template was written but never compiled** in my environment (no Android SDK). Treat it as a reference implementation of the bridge.
* **Hotline numbers need re-verifying** before release.
* **Your original art**: the avatar is my own SVG drawing in the style of your references, not your exact artwork (your sheet has a busy sticker background that cannot be cut out cleanly by code). Section 4 / `assets/sprites/` explains how to drop in your own transparent PNGs.

---

Sources for the crisis numbers (checked 2026-11-09):
* https://www.therapyroute.com/article/suicide-hotlines-and-crisis-lines-in-the-philippines
* https://lusog-isip.deped.gov.ph/?p=936
