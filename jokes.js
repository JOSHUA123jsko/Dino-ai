/* Leon Offline — jokes.js
 * Jokes, quotes and fun facts. All written for Leon (original lines, Taglish, "yarn" as signature).
 * Joke fields: t = the joke, tag = topic, ex = optional one-line explanation Leon may add.
 * Facts are sentences that continue "Alam mo ba, ...". Keep facts TRUE: Leon is humble about certainty. */
(function (root) {
  'use strict';
  var L = root.Leon = root.Leon || {};
  L.Data = L.Data || {};

  L.Data.jokes = [
    // ---- math
    { tag: 'math', t: "Si crush ay parang asymptote: lalapit nang lalapit, pero hindi kailanman aabot, yarn.", ex: "Ang asymptote ay linyang papalapit sa curve pero hindi talaga nahahawakan." },
    { tag: 'math', t: "Ang tampo ay parang limit: palapit nang palapit sa 'okay na,' pero hindi pa rin umaabot hanggang may nag-sorry, yarn.", ex: "Sa limit, pinapalapit mo ang input sa isang value pero hindi mo talaga ito naaabot." },
    { tag: 'math', t: "Ano ang paboritong ulam ng mathematician? Pi, pero hindi niya maubos kasi irrational, yarn.", ex: "Ang pi ay irrational: hindi natatapos ang digits." },
    { tag: 'math', t: "Ang probability na magreply si crush pag nag-seen ka na: 0.0001. Pero ang hope ko ay constant, yarn." },
    { tag: 'math', t: "Ang pila sa jeep ay queueing theory. Ang 'bayad po!' ay message passing sa distributed system, yarn.", ex: "Queueing theory ay pag-aaral kung paano gumagalaw ang mga pila." },
    { tag: 'math', t: "Ang baon budget ay linear programming with emotional damage: maximize merienda, minimize hiya, yarn.", ex: "Sa linear programming, hinahanap mo ang pinakamagandang resulta kahit may limitasyon." },
    { tag: 'math', t: "Ano ang sabi ng derivative sa function? 'Wag kang mag-alala, ako ang bahala sa slope mo.' Supportive friend, yarn." },
    { tag: 'math', t: "Ang imaginary numbers ay parang 'On the way na': hindi totoo, pero kailangan sa solution, yarn.", ex: "Ang imaginary number i ay √(-1): wala sa number line, pero gamit na gamit sa engineering." },
    { tag: 'math', t: "Ang zero ang pinaka-honest na number: pag sinabi niyang wala, wala talaga, yarn." },
    { tag: 'math', t: "Bakit mahilig sa graphs ang estudyante tuwing exam? Kasi puro 'x' ang hinahanap pero 'y' ang tanong ng lahat, yarn." },
    { tag: 'math', t: "Pag sinabing '3 PM tayo' sa group chat, ang mean arrival time ay 4:15. Ang standard deviation ay depende sa traffic at hiya, yarn.", ex: "Mean ang average; standard deviation ang sukat ng kalat ng data." },
    { tag: 'math', t: "Bakit hindi nag-aaway ang parallel lines? Kasi wala silang common ground, pero hindi rin sila nagkikita, kaya peace, yarn." },
    // ---- science
    { tag: 'science', t: "Ang entropy ang dahilan kung bakit magulo ang kwarto ko. Hindi ako tamad, thermodynamics lang, yarn." },
    { tag: 'science', t: "Ang Newton's third law ng barkada: kapag may nang-asar, may resbak. Equal and opposite, yarn." },
    { tag: 'science', t: "Ang Wi-Fi ko ay parang neutrino: dumadaan sa lahat ng pader pero walang nakakahuli, yarn.", ex: "Ang neutrino ay particle na halos hindi tumatama sa kahit ano." },
    { tag: 'science', t: "Ano ang sabi ng atom sa kapwa atom? 'Nawawala ang electron ko!' 'Sigurado ka?' 'Oo, positive ako,' yarn.", ex: "Kapag nawalan ng electron, nagiging positive ang charge ng atom." },
    { tag: 'science', t: "Bakit hindi mapagkakatiwalaan ang mga atom? Kasi sila ang gumagawa ng lahat ng bagay, pati ng gulo, yarn." },
    { tag: 'science', t: "Ang kape ay hindi catalyst kasi nauubos. Kaya paulit-ulit mong binibili, yarn.", ex: "Ang catalyst ay nagpapabilis ng reaction pero hindi nauubos." },
    { tag: 'science', t: "Ang 'Pwede na 'yan' ay superposition: hindi pa sigurado kung okay o hindi hangga't hindi mo tinitingnan, yarn.", ex: "Sa quantum physics, ang superposition ay maraming posibleng estado nang sabay hanggang masukat." },
    { tag: 'science', t: "Ang 'On the way na' ay Schrodinger's state: nasa bahay pa rin habang hindi mo pa naoobserbahan, yarn." },
    { tag: 'science', t: "Sabi ng physicist sa crush: 'Attraction at gravity ang alam ko, pero ghosting, hindi pa na-solve ng science,' yarn." },
    { tag: 'science', t: "Ang buwan ay laging may phase. Hindi siya moody, orbital mechanics lang, yarn." },
    // ---- dino
    { tag: 'dino', t: "Ano ang tawag sa dino na magaling sa math? Dino-mial, yarn.", ex: "Ang polynomial ay expression na maraming terms, gaya ng x² + 3x + 2." },
    { tag: 'dino', t: "Ano ang tawag sa dino na laging late? Tardy-saurus, yarn." },
    { tag: 'dino', t: "Bakit mahilig sa geometry si Triceratops? Kasi may tatlong sungay: tri-angle na agad, yarn." },
    { tag: 'dino', t: "Bakit palaging talo sa push-up ang T. rex? Kasi maiikli ang braso, pero panalo sa pagyakap sa sarili, yarn." },
    { tag: 'dino', t: "Bakit hindi nagpa-reunion ang mga dinosaur? Kasi lahat sila na-ghost ng meteor, yarn." },
    // ---- Filipino social
    { tag: 'ph', t: "Ang 'Sige, mauna na ako' ay may tatlong stage: paalam, kwentuhan sa pinto, at 'ay teka, may sasabihin pa pala ako,' yarn." },
    { tag: 'ph', t: "Ang lola mo ay kayang i-compute ang tamang timpla ng sinigang nang walang calculator. Respeto sa estimation skills, yarn." },
    { tag: 'ph', t: "Ang 'bayad po' sa jeep ay relay race: pinapasa ang barya nang walang nahuhulog. 99.9% accuracy, yarn." },
    { tag: 'ph', t: "Ang 'tabi-tabi po' ay unit of respect: hindi nasusukat, pero ramdam, yarn." },
    { tag: 'ph', t: "Ang 'ano ulam?' ay pinakamalalim na philosophical question ng bawat bahay, yarn." },
    // ---- dad
    { tag: 'dad', t: "Ano ang sabi ng zero sa eight? 'Ang ganda ng belt mo!' Classic, yarn." },
    { tag: 'dad', t: "Sabi ng isang pilosopo: 'Nag-iisip ako, kaya ako umiiral.' Sabi ko naman: 'Umutot ako, kaya humihingi ako ng sorry po,' yarn." },
    { tag: 'dad', t: "Bakit nahihiya ang calculator? Kasi lagi siyang pinipindot ng kung sino-sino, yarn." }
  ];

  L.Data.quotes = [
    "Math is just feelings with rules, yarn.",
    "Science is curiosity wearing safety goggles, yarn.",
    "Ang buhay ay parang probability distribution: hindi mo kontrolado lahat, pero pwede kang mag-adjust ng sample size, yarn.",
    "Correlation is not causation, pero ang red flag ay red flag, yarn.",
    "Entropy increases, so please clean your room, yarn.",
    "Every action has an equal and opposite reaction, kaya mag-sorry ka, yarn.",
    "Hindi pa final answer ang isang mistake, may revisions pa, yarn.",
    "Breathe, revise, retry. Science tayo, hindi quitter, yarn.",
    "Ang tampo ay hidden variable: hanapin mo muna bago mo i-solve, yarn.",
    "Ang pakikisama ay original group project: lahat nagpapakita, yarn.",
    "Ang bawat 'ewan' ay hypothesis na hindi pa na-test, yarn.",
    "Ang pag-asa ay constant: hindi nagbabago kahit anong variable ang ipasok mo, yarn.",
    "Ang pagkakamali ay data. Ang pag-ulit ng pagkakamali? Data pa rin, may kasama lang na 'sana all,' yarn.",
    "Ang bawat 'hindi ko alam' ay unang hakbang ng experiment, yarn.",
    "Ang katahimikan ay hindi vacuum: nandiyan pa rin ang hangin, tsaka ako, yarn.",
    "Ang pila ay unibersal na wika: lahat tayo naghihintay, lahat tayo may pag-asa, yarn.",
    "Ang pinakamahusay na formula: kain + tulog + tawa. Dimensional analysis: gumagana, yarn.",
    "Huwag mong ikumpara ang chapter 3 mo sa chapter 20 ng iba, yarn.",
    "Kapag kulang ang data, humble pie muna: hindi ako sure, pero best estimate ko ito, yarn.",
    "Ang adobo ay proof na ang patience ay isang ingredient, yarn.",
    "Basta, universe is weird and I love it, yarn.",
    "Ang lahat ng malaking problema ay maliliit na problema na nagpanggap lang, yarn.",
    "Minsan ang pinakamalaking breakthrough ay isang magandang tulog at isang masarap na ulam, yarn.",
    "Ang 'sorry' at ang 'salamat' ay maliliit na salita na may malaking derivative, yarn.",
    "Ang pagkabored ay input na hindi pa dumarating, yarn.",
    "Cogito, ergo sum: nag-iisip ako, kaya ako umiiral. Umutot ako, kaya... sorry po, yarn.",
    "Ang tiwala ay parang battery: mabagal i-charge, mabilis maubos, yarn.",
    "Kung walang tanong, walang science. Kung walang kain, walang scientist, yarn."
  ];

  L.Data.facts = [
    "ang honey, kapag selyado at maayos ang pagkakaimbak, halos hindi nasisira. Mababa ang tubig at acidic kaya nahihirapan ang bacteria, yarn.",
    "ang octopus ay may tatlong puso, yarn.",
    "ang saging ay botanically berry, pero ang strawberry hindi. Science is weird and I love it, yarn.",
    "sa Venus, mas mahaba ang isang araw kaysa isang taon niya. Mas matagal siyang umikot sa sarili kaysa umikot sa Araw, yarn.",
    "ang liwanag ng Araw ay inaabot ng mga 8 minuto at 20 segundo bago makarating sa Earth, yarn.",
    "ang tae ng wombat ay hugis cube. Oo, cube, yarn.",
    "may mga 206 na buto ang adult na tao, pero mas marami (mga 270 o higit pa) ang baby kasi nagsasama-sama pa ang iba paglaki, yarn.",
    "mas mainit ang kidlat kaysa surface ng Araw, mga limang beses pa, pero panandalian lang, yarn.",
    "ang Pilipinas ay may 7,641 na isla. Ang daming pwedeng i-explore, yarn.",
    "lumalawak ang tubig kapag nagyeyelo, kaya pumuputok ang bote ng tubig na nilagay mo sa freezer, yarn.",
    "walang tunog sa space dahil walang hangin na magdadala ng vibration, yarn.",
    "ang isang kutsarita ng neutron star material ay tumitimbang ng bilyun-bilyong tonelada, yarn.",
    "ang Fibonacci numbers ay madalas lumitaw sa spiral ng sunflower at pinecone, yarn.",
    "ang pi ay hindi natatapos at walang umuulit na pattern. Kaya may Pi Day tuwing March 14, yarn.",
    "lumalayo ang buwan sa Earth ng mga 3.8 sentimetro kada taon, halos kasing bilis ng pagtubo ng kuko mo, yarn.",
    "ang utak mo ay gumagamit ng mga 20% ng enerhiya ng katawan mo. Kaya nagugutom ka kapag nag-iisip ka nang todo, yarn.",
    "ang diamond at ang graphite ng lapis ay parehong carbon. Magkaiba lang ang pagkakaayos ng atoms, yarn.",
    "ang bilis ng pag-ikot ng Earth sa equator ay mga 1,670 km/h, at hindi mo ramdam, yarn.",
    "mas matanda ang lahi ng mga pating kaysa sa mga puno, yarn.",
    "ang jeepney ay nagsimula sa mga sobrang military jeep ng mga Amerikano pagkatapos ng World War II. Ginawa itong pampasahero ng mga Pilipino, yarn.",
    "ang Philippine tarsier ay isa sa pinakamaliliit na primate, at ang mata niya ay halos kasing laki ng utak niya, yarn.",
    "halos perpektong cone ang hugis ng Mayon Volcano, yarn.",
    "ang ube ay purple dahil sa anthocyanins, pigment na nasa maraming purple na pagkain, yarn.",
    "ang halamang saging ay malaking herb, hindi tunay na puno. Walang kahoy ang tangkay niya, yarn.",
    "halos 99.9% pareho ang DNA nating mga tao, yarn.",
    "kapag nasa eroplano ka, minsan nakikita mo ang rainbow na buong bilog, yarn.",
    "bilangin mo ang segundo mula kidlat hanggang kulog, hatiin sa 3, at kilometro ang layo ng kidlat, yarn.",
    "mas mababa ang boiling point ng tubig sa bundok kaysa sa dagat, kaya mas matagal maluto ang kanin doon, yarn.",
    "ang average reaction time ng tao ay mga 0.2 segundo. Kaya pag nag-text ka ng 'musta,' expect delay, charot, yarn.",
    "may waggle dance ang honeybees para sabihin sa kapwa bubuyog kung nasaan ang bulaklak, yarn."
  ];
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
