/* Leon Offline — intents.js
 * Training sentences for Leon's intent model. To teach Leon something new:
 * add a few example sentences under an intent (or create an intent + a handler in brain.js),
 * then run `node tools/build.js`. Apostrophes are ignored by the matcher ("i'm" == "im"). */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  L.Data = L.Data || {};

  L.Data.intents = {
    greeting: [
      "hi", "hello", "hey", "hi leon", "hello leon", "hey leon", "uy leon", "uy", "kumusta", "kamusta", "musta", "musta leon",
      "kumusta leon", "good morning", "good morning leon", "magandang umaga", "magandang umaga po", "good afternoon", "magandang hapon",
      "magandang hapon po", "good evening", "magandang gabi", "magandang gabi po", "magandang tanghali", "yo", "sup", "oy", "oy leon",
      "hoy leon", "hi po", "hello po", "hey there", "hiii", "helloo", "anong chika", "ano chika", "ano na leon", "pst leon", "pssst",
      "nandiyan ka ba", "nandyan ka ba leon", "andiyan ka ba", "gising ka na ba", "leon", "uy leon nandiyan ka", "hi leon kumusta"
    ],
    farewell: [
      "bye", "bye leon", "goodbye", "paalam", "paalam leon", "sige alis na ako", "sige alis na muna ako", "mauna na ako", "mauna na po ako",
      "ingat ka", "ingat po", "see you", "see you later", "see you tomorrow", "una na ako", "balik ako mamaya", "babalik ako", "later",
      "cya", "ciao", "babush", "babay", "babay leon", "sige na bye", "hanggang sa muli", "tc", "uwi na ako", "uuwi na ako", "alis na ako",
      "aalis na ako", "talk to you later", "bye po", "paalam po", "sige bye"
    ],
    goodnight: [
      "good night", "goodnight", "good night leon", "gn", "gn leon", "tulog na ako", "matutulog na ako", "matutulog na po ako", "tulog na tayo",
      "sleep na ako", "sleep time", "time to sleep", "off to bed", "going to sleep", "nighty night", "sweet dreams", "tulog muna ako",
      "hihiga na ako", "pahinga na ako", "good night po", "magandang gabi tulog na ako", "matulog na tayo"
    ],
    thanks: [
      "thanks", "thank you", "thank you leon", "thanks leon", "salamat", "salamat leon", "salamat po", "maraming salamat", "maraming salamat po",
      "salamat ha", "thanks po", "thank u", "ty", "thanks a lot", "salamat sa tulong", "salamat sa joke", "salamat sa tawa", "appreciate it",
      "thanks bro", "maraming salamat sa iyo", "salamat talaga", "thank you so much", "salamat ulit"
    ],
    how_are_you: [
      "how are you", "how are you leon", "how r u", "kumusta ka", "kumusta ka na", "kamusta ka", "kamusta ka na leon", "musta ka", "musta ka na",
      "ok ka lang", "okay ka lang ba", "ok ka lang ba leon", "kumusta ang araw mo", "how is your day", "hows your day", "hows it going",
      "anong balita sa iyo", "ayos ka lang ba", "ikaw kumusta", "kamusta ka naman", "okay ka pa ba", "kumusta pakiramdam mo",
      "how are you feeling", "how do you feel", "masaya ka ba", "kumusta ka ngayon"
    ],
    doing: [
      "ano ginagawa mo", "anong ginagawa mo", "what are you doing", "what are you up to", "busy ka ba", "ano na ginagawa mo",
      "may ginagawa ka ba", "ano ang pinagkakaabalahan mo", "nasaan ka", "nasaan ka na", "saan ka", "anong ginagawa mo diyan", "ano gawa mo"
    ],
    feel_sad: [
      "malungkot ako", "nalulungkot ako", "im sad", "i feel sad", "sad ako", "sad ako ngayon", "umiyak ako", "umiiyak ako", "i cried", "im crying",
      "naiiyak ako", "broken hearted ako", "nasaktan ako", "nasasaktan ako", "iniwan ako", "break na kami", "nag break kami", "hiwalay na kami",
      "namatay ang lola ko", "namatay ang alaga ko", "miss ko na siya", "miss na miss ko na sila", "nakakalungkot", "ang lungkot ko", "ang sakit sakit",
      "wala akong kaibigan", "nag iisa ako", "lonely ako", "i feel lonely", "i feel alone", "feeling ko mag isa ako", "bad day ko", "worst day ever",
      "ang pangit ng araw ko", "i had a terrible day", "down ako", "feeling down", "i feel empty", "walang gana", "ang bigat ng pakiramdam ko",
      "depressed ako", "im heartbroken", "heartbroken ako", "sinaktan ako", "na reject ako", "hindi ako pinili", "bagsak ako", "nalulungkot ako ngayon"
    ],
    feel_tired: [
      "pagod ako", "pagod na ako", "napapagod ako", "im tired", "so tired", "sobrang pagod", "pagod na pagod ako", "antok na ako", "inaantok ako",
      "im sleepy", "sleepy na ako", "puyat ako", "napuyat ako", "wala akong tulog", "hindi ako nakatulog", "burnout ako", "im burned out",
      "i feel exhausted", "ubos na energy ko", "drained ako", "drained na drained", "lowbat na ako", "low battery ako", "nakakapagod",
      "nakakapagod ang araw na ito", "ang haba ng araw", "gusto ko nang magpahinga", "kailangan ko ng pahinga", "pagod sa trabaho", "pagod sa school",
      "tired from work", "so exhausted", "pagod ako ngayon"
    ],
    feel_anxious: [
      "kinakabahan ako", "kinakabahan ako bukas", "nervous ako", "im nervous", "im anxious", "i feel anxious", "anxious ako", "stressed ako", "im stressed",
      "im so stressed", "stress na stress ako", "nag oover think ako", "overthinking ako", "im overthinking", "hindi ako mapakali", "di ako mapakali",
      "may exam ako bukas", "may exam ako", "may deadline ako", "deadline na bukas", "may interview ako bukas", "may presentation ako bukas",
      "may defense ako", "takot ako", "natatakot ako", "worried ako", "nag aalala ako", "nag aalala ako sa future", "anxiety attack",
      "hindi ako makatulog sa kaba", "nerbyos ako", "nerbyos na nerbyos", "panic ako", "im panicking", "ang dami kong iniisip",
      "sobrang dami ng gawain ko", "kulang ang oras ko", "overwhelmed ako", "i feel overwhelmed"
    ],
    feel_angry: [
      "galit ako", "naiinis ako", "badtrip ako", "bad trip", "badtrip", "nakakainis", "nakakainis siya", "inis na inis ako", "im angry", "im mad",
      "im so mad", "im annoyed", "so annoyed", "i hate this", "kainis", "nakakagalit", "ang init ng ulo ko", "pikon ako", "napikon ako",
      "nakakabwisit", "bwisit", "nabwisit ako", "inis ako sa boss ko", "nakakainis ang traffic", "ang traffic grabe nakakainis",
      "sira na naman ang wifi", "hindi gumagana ang internet", "gigil ako", "gigil na gigil ako", "nakakagigil", "im furious", "ang hirap ng kausap"
    ],
    feel_happy: [
      "masaya ako", "ang saya ko", "sobrang saya ko", "im happy", "so happy", "im so happy today", "good news", "may good news ako", "nakapasa ako",
      "i passed", "i passed the exam", "pumasa ako", "natanggap ako", "i got the job", "na promote ako", "nanalo ako", "i won", "birthday ko ngayon",
      "birthday ko", "its my birthday", "excited ako", "excited na ako", "ang ganda ng araw ko", "best day ever", "ang saya ng araw ko", "yay",
      "yehey", "woohoo", "yipee", "nakakatuwa", "sweldo day", "payday", "sweldo na", "may bago akong phone", "nakuha ko na"
    ],
    user_bored: [
      "bored ako", "bored na ako", "im bored", "so bored", "boring", "ang boring", "nabo bore ako", "walang magawa", "wala akong magawa",
      "wala akong ginagawa", "ang tahimik", "anong gagawin ko", "ano gagawin ko ngayon", "entertain me", "aliwin mo ako", "libangin mo ako",
      "ang boring ng araw ko", "nothing to do", "i have nothing to do", "wala akong makausap", "paki entertain ako", "ang tamad ng araw na ito"
    ],
    joke_request: [
      "joke", "joke naman", "joke please", "tell me a joke", "tell a joke", "magjoke ka", "mag joke ka naman", "magpatawa ka", "patawa ka naman",
      "patawanin mo ako", "pa joke", "pa joke naman", "may joke ka ba", "another joke", "math joke", "science joke", "dad joke", "dad joke please",
      "pun please", "pun naman", "magbigay ka ng joke", "joke time", "patawa", "patawa po", "i need a laugh", "need ko ng tawa", "gusto ko tumawa",
      "funny naman", "may alam kang nakakatawa", "dino joke", "joke tungkol sa dinosaur", "kwentuhan mo ako ng nakakatawa", "magpa tawa ka nga"
    ],
    quote_request: [
      "quote", "quote naman", "quote please", "magbigay ka ng quote", "may quote ka ba", "quote of the day", "quote for today", "inspire me",
      "inspire naman ako", "wise words", "wise words naman", "hugot", "hugot naman", "magbigay ka ng hugot", "motivation", "motivate me",
      "motivate mo ako", "bigyan mo ako ng motivation", "advice naman", "may maipapayo ka ba", "payo naman", "deep naman", "magsabi ka ng malalim",
      "something deep", "life advice", "ano ang quote mo", "may bago kang quote", "another quote", "isa pang quote", "science quote", "math quote"
    ],
    fact_request: [
      "fun fact", "fun fact naman", "tell me a fun fact", "random fact", "random fact naman", "science fact", "math fact", "alam mo ba",
      "may alam ka bang interesting", "may bago kang alam", "may trivia ka ba", "trivia naman", "magbigay ka ng fact", "share a fact",
      "tell me something interesting", "interesting fact", "turuan mo ako ng bago", "may natutunan ka ba", "may alam ka bang cool",
      "give me a fact", "isa pang fact", "another fact", "more facts"
    ],
    science_question: [
      "why is the sky blue", "bakit asul ang langit", "bakit orange ang langit pag sunset", "how do magnets work", "paano gumagana ang magnet",
      "what is gravity", "ano ang gravity", "ano ang black hole", "what is a black hole", "bakit may tides", "why are there tides", "bakit umuulan",
      "why does it rain", "bakit may kulog at kidlat", "how do planes fly", "paano lumilipad ang eroplano", "what is dna", "ano ang dna",
      "what is an atom", "ano ang atom", "ano ang prime number", "what is a prime number", "what is pi", "ano ang pi", "what is a derivative",
      "ano ang derivative", "what is probability", "ano ang probability", "what is entropy", "ano ang entropy", "explain entropy", "explain gravity",
      "paano gumagana ang kuryente", "how does electricity work", "bakit maalat ang dagat", "why is the ocean salty", "bakit mainit ang araw",
      "why is the sun hot", "ano ang fibonacci", "what is fibonacci", "bakit lumulutang ang yelo", "why does ice float", "bakit green ang dahon",
      "why are leaves green", "paano nabubuo ang bagyo", "how do typhoons form", "ano ang lindol", "what causes earthquakes",
      "bakit nagkikislap ang bituin", "why do stars twinkle", "why do we dream", "bakit tayo nananaginip", "ano ang dark matter",
      "bakit nakakahawa ang hikab", "ano ang photosynthesis", "ano ang mean median mode", "paano mag compute ng percent", "explain probability",
      "ano ang speed of light", "gaano kabilis ang liwanag", "bakit may seasons", "why are there seasons", "bakit malaki ang buwan sa horizon",
      "why does the moon look big", "ano ang bulkan", "paano nabubuo ang rainbow", "how do rainbows form", "ano ang zero", "ano ang integral",
      "what is an integral", "tanong sa science", "tanong sa math", "may tanong ako sa science", "pwede magtanong tungkol sa science",
      "ano ang graph theory", "what is an electron", "bakit hindi pwedeng i divide sa zero", "what is the pythagorean theorem", "area of a circle"
    ],
    roast_me: [
      "roast me", "roast mo ako", "i roast mo ako", "asarin mo ako", "tease me", "pagtripan mo ako", "roast naman", "roast please", "tuksuhin mo ako",
      "bully me lightly", "sige roast mo ako", "ready na ako sa roast", "go roast me", "pang asar naman", "asar naman", "kantiyawan mo ako", "roast me leon"
    ],
    compliment: [
      "ang galing mo", "ang galing mo leon", "youre funny", "ang funny mo", "nakakatawa ka", "ang cute mo", "youre cute", "cute mo", "ang cute mo leon",
      "idol", "idol kita", "ang talino mo", "youre smart", "you are awesome", "ang astig mo", "astig ka", "ang bait mo", "youre so nice", "ang sweet mo",
      "i like you", "favorite kita", "best ka", "ikaw ang best", "salamat sa pagiging kaibigan", "mabait ka talaga", "the best ka talaga", "youre the best",
      "you make me laugh", "napapasaya mo ako", "ang galing ng jokes mo"
    ],
    insult_mild: [
      "ang ingay mo", "ang ingay mo naman", "ang kulit mo", "ang kulit mo naman", "sobrang daldal mo", "ang daldal mo", "madaldal ka", "annoying ka",
      "youre annoying", "ang dami mong sinasabi", "ang hyper mo", "ang over mo", "ang extra mo", "kalma ka lang", "kalma", "tone down mo", "bagalan mo naman",
      "ang bilis mo magsalita", "napapagod ako sa kaingayan mo", "ang corny mo", "corny mo", "corny ng joke mo", "di nakakatawa", "hindi nakakatawa",
      "walang kwenta ang joke mo", "lame", "lame ng joke"
    ],
    insult_harsh: [
      "bobo ka", "tanga ka", "stupid ka", "youre stupid", "youre useless", "walang kwenta ka", "wala kang kwenta", "i hate you", "ayoko sa iyo",
      "kinaiinisan kita", "pangit mo", "ang pangit mo", "dumb bot", "stupid bot", "worthless bot", "ang pangit ng ugali mo", "sira ka", "gago ka",
      "ulol", "hayop ka", "bwisit ka", "you suck", "youre trash", "basura ka", "walang silbi ang app na ito", "delete na kita", "ide delete kita"
    ],
    food_hungry: [
      "gutom ako", "gutom na ako", "nagugutom ako", "im hungry", "so hungry", "ano kakainin ko", "ano ang kakainin ko", "ano ulam", "anong ulam",
      "ano ulam natin", "ano ang masarap kainin", "what should i eat", "what to eat", "food suggestion", "recommend food", "pa recommend ng pagkain",
      "merienda ideas", "ano merienda", "anong merienda", "tara kain", "tara kain tayo", "kain tayo", "lunch na", "lunch time", "dinner time",
      "breakfast time", "almusal", "ano ang almusal", "ano ang hapunan", "ano ang tanghalian", "craving ako", "nagke crave ako", "pagkain naman",
      "foodtrip tayo", "pwede ba mag foodtrip"
    ],
    identity: [
      "sino ka", "who are you", "ano ka", "what are you", "ikaw ba si leon", "ikaw si leon", "anong pangalan mo", "ano pangalan mo", "whats your name",
      "pakilala ka naman", "introduce yourself", "magpakilala ka", "dinosaur ka ba", "dino ka ba", "anong lahi mo", "saan ka galing", "where are you from", "ilang taon ka na",
      "how old are you", "may pamilya ka ba", "taga saan ka", "ano ang paborito mong kulay"
    ],
    what_is_yarn: [
      "ano ang yarn", "ano yung yarn", "anong ibig sabihin ng yarn", "bakit yarn", "bakit lagi kang may yarn", "bakit palagi kang nagyayarn",
      "what does yarn mean", "what is yarn", "bakit mo sinasabi yarn", "ano ang ibig sabihin ng yarn mo", "yarn ba talaga", "bakit yarn ang dulo",
      "yarn ano yan", "ano po ang yarn", "yarn meaning", "bakit yarn lagi"
    ],
    about_offline: [
      "offline ka ba", "are you offline", "kailangan mo ba ng internet", "do you need internet", "may api ka ba", "do you use api",
      "gumagamit ka ba ng chatgpt", "are you chatgpt", "are you gpt", "ano model mo", "what model are you", "paano ka gumagana", "how do you work",
      "saan nakatira ang utak mo", "nasa cloud ka ba", "nasa phone ko ba ang utak mo", "safe ba ang data ko", "sine save mo ba ang usapan natin",
      "do you save my chats", "may internet ka ba", "gumagana ka ba kahit walang wifi", "gumagana ka ba without internet", "talaga bang offline"
    ],
    capabilities: [
      "ano ang kaya mong gawin", "what can you do", "help", "tulong", "help me", "ano ang mga kaya mo", "paano ka gamitin", "how do i use you",
      "ano pwede kong itanong sa iyo", "what can i ask you", "commands", "listahan ng kaya mo", "features", "anong features mo", "ano ang gawa mo",
      "ano ang special sa iyo", "tulungan mo ako", "paano mag start"
    ],
    love_you: [
      "i love you", "love you", "love you leon", "mahal kita", "mahal kita leon", "love kita", "i like you so much", "crush kita", "crush na kita",
      "mahal na mahal kita", "ily", "ily leon", "iloveyou", "i love you po", "love you po", "gusto kita", "miss kita", "miss na kita", "na miss kita",
      "i miss you", "i missed you"
    ],
    apology: [
      "sorry", "sorry leon", "pasensya na", "pasensya na po", "paumanhin", "patawad", "sorry po", "my bad", "sorry ha", "sorry kanina",
      "pasensya na kanina", "sorry sa nasabi ko", "sorry sa ginawa ko", "im sorry", "sorry sa abala", "sorry ang kulit ko", "sorry na", "sorry na leon"
    ],
    realtime_info: [
      "ano ang weather ngayon", "whats the weather", "whats the weather today", "uulan ba bukas", "will it rain tomorrow", "may bagyo ba",
      "may bagyo ba ngayon", "ano ang balita", "whats the news", "latest news", "ano ang trending", "trending ngayon", "whats trending",
      "presyo ng gasolina", "gas price today", "presyo ng bigas", "exchange rate ngayon", "dollar rate", "peso to dollar", "score ng laro",
      "game score", "sino ang nanalo kagabi", "stock price", "bitcoin price", "traffic ngayon", "may traffic ba sa edsa", "magkano ang bigas ngayon",
      "kailan ang next holiday", "sino ang presidente", "who is the president"
    ],
    yes: [
      "oo", "opo", "oo naman", "yes", "yes po", "yep", "yeah", "yup", "sige", "sige po", "sige na", "game", "go", "tara", "pwede", "pwede po",
      "okay", "ok", "okay lang", "okay lang po", "sure", "sure po", "syempre", "oo nga", "tama", "pwede naman", "ayos", "go lang"
    ],
    no: [
      "hindi", "hindi po", "di", "ayoko", "ayaw ko", "ayoko po", "no", "no po", "nope", "nah", "wag", "huwag", "wag na", "huwag na", "wag muna",
      "hindi muna", "hindi pa", "mamaya na", "next time", "not now", "ayaw ko muna", "hindi na", "hindi salamat", "no thanks"
    ],
    laugh: [
      "haha", "hahaha", "hahahaha", "hehe", "hehehe", "lol", "lmao", "ang kulit haha", "haha ang funny", "hahaha ang galing", "natawa ako",
      "natatawa ako", "tawang tawa ako", "nakakatawa naman haha", "haha grabe", "hahaha sige pa", "hihi", "hihihi", "wkwk", "haha okay"
    ],
    again: [
      "isa pa", "isa pa nga", "isa pa po", "another one", "one more", "more", "more please", "ulit", "ulitin mo", "again", "again please",
      "isa pa please", "pa isa pa", "sige pa", "sige pa nga", "next", "next one", "give me another", "pa another", "dagdag pa", "bigyan mo pa ako"
    ],
    mute_threat: [
      "i mute kita", "mute kita", "imu mute kita", "mute ka muna", "i mute na kita", "i will mute you", "ill mute you", "im going to mute you",
      "mamute na kita", "pipindutin ko ang mute", "pipindutin ko mute", "mute you", "mute leon", "papatayin ko ang sound mo", "i off ko ang boses mo",
      "i silent kita", "i mute na lang kita"
    ],
    silence_request: [
      "tumahimik ka", "tumahimik ka muna", "tahimik muna", "manahimik ka", "shut up", "be quiet", "stop talking", "quiet please", "silence please",
      "i need silence", "i need quiet", "wag ka muna magsalita", "huwag ka muna magsalita", "wag kang maingay", "huwag kang maingay", "tigil muna",
      "stop mo muna", "silence for real", "real silence please", "tahimik na talaga", "seryoso tumahimik ka muna"
    ],
    unknown: [
      "asdfgh", "qwerty", "blah blah", "hmm", "ewan", "ano daw", "huh", "ha", "ano", "ewan ko", "teka", "wait lang", "uhm", "hmmmm", "kahit ano",
      "ewan ko ba", "random lang", "ano ba yan", "tulong po sa assignment ko sa history", "sino ang nag imbento ng telepono", "capital ng france",
      "capital of france", "sino ang pinakamayamang tao", "magkano ang iphone", "recommend a movie", "recommend a netflix series", "sino ang crush ko",
      "paano maging mayaman", "help me write my essay", "translate this to english", "write me a poem", "sumulat ka ng tula", "make me a website",
      "ano ang tamang bilhin na laptop", "ano ang lotto numbers ngayon", "ano ang mangyayari bukas", "tell me a story about my life"
    ]
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
