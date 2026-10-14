/* ---------------------------------------------------------------
   heure.js — les heures à travailler, et le français pour les dire.

   Deux choses vivent ici, comme Jeu.Nombres vit dans data/nombres.js :
   les heures retenues palier par palier, et la façon correcte de les
   nommer. Le vocabulaire est la vraie difficulté de cette leçon, bien
   plus que la lecture du cadran : il est donc écrit une seule fois,
   à un seul endroit, et vérifiable tout seul.

   Deux registres, et pas un de plus :

   - le registre courant, celui qu'on entend à la maison :
     « trois heures et quart », « quatre heures moins le quart »,
     « midi et demi ». C'est lui qui porte les pièges du français ;
   - le registre officiel, en 24 h, celui des horaires de train :
     « quinze heures quarante-cinq ». Il arrive au dernier palier.

   Les pièges, tous tenus ici :

   - « et demie » avec un e derrière « heures », qui est féminin ;
     mais « midi et demi » et « minuit et demi » sans e, parce que
     midi et minuit sont masculins. C'est la faute la plus fréquente ;
   - « une heure » au singulier, et « zéro heure » au singulier ;
   - les minutes sont féminines : « quinze heures vingt-et-une » ;
   - « moins le quart », jamais « moins quart » ;
   - midi et minuit ne prennent jamais le mot « heures » ;
   - un cadran à aiguilles ne distingue pas midi de minuit, ni le
     matin de l'après-midi. Les heures dont le nom tombe sur midi ou
     minuit sont donc écartées de tout exercice de lecture pure :
     elles ne se travaillent qu'en plaçant les aiguilles, ou avec un
     moment de la journée annoncé.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Data = Jeu.Data || {};

Jeu.Heure = (function () {

  /* ------------------------------------------------------------------
     1. LES MOTS
     ------------------------------------------------------------------ */

  /* « un » devient « une » devant heure et devant minute, qui sont
     féminins : une heure, vingt-et-une minutes, trente-et-une. */
  function feminin(mot) {
    return String(mot).replace(/un$/, 'une');
  }

  function nombre(n) {
    return feminin(Jeu.Nombres.enLettres(n));
  }

  /* Le socle du registre courant : ce qui vient avant les minutes.
     Midi et minuit ne prennent pas « heures ». */
  function socle(h) {
    h = ((h % 24) + 24) % 24;
    if (h === 12) return 'midi';
    if (h === 0) return 'minuit';
    var h12 = h % 12;
    return nombre(h12) + ' heure' + (h12 >= 2 ? 's' : '');
  }

  /* Vrai quand le nom de l'heure est « midi » ou « minuit », donc
     masculin : « et demi », sans e. */
  function masculin(h) {
    h = ((h % 24) + 24) % 24;
    return h === 12 || h === 0;
  }

  /* L'heure à laquelle se rattache la phrase. Pour « quatre heures
     moins le quart », c'est quatre heures, pas trois. */
  function heureDeReference(h, m) {
    return (m === 45 || m >= 35) ? ((h + 1) % 24) : (((h % 24) + 24) % 24);
  }

  /* Le registre courant. On dit « moins » à partir de trente-cinq :
     avant, « trois heures trente-quatre » se dit beaucoup mieux que
     « quatre heures moins vingt-six ». */
  function enMots(h, m) {
    h = ((h % 24) + 24) % 24;
    m = ((m % 60) + 60) % 60;

    if (m === 0) return socle(h);
    if (m === 15) return socle(h) + ' et quart';
    if (m === 30) return socle(h) + (masculin(h) ? ' et demi' : ' et demie');
    if (m === 45) return socle((h + 1) % 24) + ' moins le quart';
    if (m < 35) return socle(h) + ' ' + nombre(m);
    return socle((h + 1) % 24) + ' moins ' + nombre(60 - m);
  }

  /* Le moment de la journée, qui lève l'ambiguïté du cadran. Il se
     rapporte à l'heure de la phrase : « une heure moins vingt de
     l'après-midi » part de treize heures, pas de midi. Midi et
     minuit se passent de précision, ils sont déjà uniques. */
  function moment(h, m) {
    var r = heureDeReference(h, m);
    if (r === 12 || r === 0) return '';
    if (r < 12) return 'du matin';
    if (r < 19) return 'de l\'après-midi';
    return 'du soir';
  }

  function enMotsAvecMoment(h, m) {
    var mot = enMots(h, m);
    var quand = moment(h, m);
    return quand ? mot + ' ' + quand : mot;
  }

  /* Le registre officiel, en 24 h. « zéro heure trente », « une heure
     trente », « quinze heures quarante-cinq ». */
  function enMotsOfficiel(h, m) {
    h = ((h % 24) + 24) % 24;
    m = ((m % 60) + 60) % 60;
    var tete = nombre(h) + ' heure' + (h >= 2 ? 's' : '');
    return m === 0 ? tete : tete + ' ' + nombre(m);
  }

  /* L'horloge à chiffres. En 24 h quand on le demande, sinon sur le
     tour de cadran — c'est ce que l'enfant a sous les yeux. */
  function enChiffres(h, m, vingtQuatre) {
    h = ((h % 24) + 24) % 24;
    m = ((m % 60) + 60) % 60;
    var tete = vingtQuatre ? h : (((h + 11) % 12) + 1);
    return tete + ':' + (m < 10 ? '0' + m : String(m));
  }

  /* Le nom d'une durée, pour les énoncés de la forme « dans… ». */
  function dureeEnMots(minutes) {
    var abs = Math.abs(minutes);
    if (abs === 15) return 'un quart d\'heure';
    if (abs === 30) return 'une demi-heure';
    if (abs === 60) return 'une heure';
    if (abs === 90) return 'une heure et demie';
    if (abs === 120) return 'deux heures';
    if (abs % 60 === 0) return nombre(abs / 60) + ' heures';
    return nombre(abs) + ' minutes';
  }

  /* ------------------------------------------------------------------
     2. LES HEURES À TRAVAILLER, PALIER PAR PALIER

     La progression suit le programme du CE1 et du CE2 : les heures
     pile, puis les demies, puis les quarts, puis les cinq minutes,
     puis la minute et le 24 h.

     `pas` est le pas d'aimantation de la grande aiguille, en minutes.
     Il est large tant que la leçon est large : au premier palier,
     l'aiguille se pose sur un quart de tour, personne n'a besoin de
     viser. Il ne se resserre qu'avec la précision demandée.

     `heures` est le vivier des heures. Midi n'entre qu'au palier 2 et
     minuit au palier 4 : ce sont les deux noms à part, ils arrivent
     quand le reste tient.
     ------------------------------------------------------------------ */

  function suite(de, a, pas) {
    var sortie = [];
    for (var v = de; v <= a; v += pas) sortie.push(v);
    return sortie;
  }

  var PALIERS = [
    {
      rang: 1,
      titre: 'les heures pile',
      minutes: [0],
      heures: suite(1, 11, 1),
      pas: 15,
      h24: false,
      durees: [60, 120]
    },
    {
      rang: 2,
      titre: 'les heures et les demies',
      minutes: [0, 30],
      heures: suite(1, 12, 1),
      pas: 15,
      h24: false,
      durees: [30, 60, 120]
    },
    {
      rang: 3,
      titre: 'les quarts',
      minutes: [0, 15, 30, 45],
      heures: suite(1, 12, 1),
      pas: 5,
      h24: false,
      durees: [15, 30, 60]
    },
    {
      rang: 4,
      titre: 'les cinq minutes',
      minutes: suite(0, 55, 5),
      heures: suite(0, 12, 1),
      pas: 5,
      h24: false,
      durees: [10, 15, 30, 45, 60]
    },
    {
      rang: 5,
      titre: 'toutes les minutes, et le 24 h',
      minutes: suite(0, 59, 1),
      heures: suite(0, 23, 1),
      pas: 1,
      h24: true,
      durees: [5, 10, 15, 20, 30, 45, 60, 90]
    }
  ];

  function palier(rang) {
    var i = Math.max(1, Math.min(PALIERS.length, Math.round(rang || 1)));
    return PALIERS[i - 1];
  }

  /* ------------------------------------------------------------------
     3. TIRER UNE HEURE

     `sansAmbiguite` écarte tout ce qu'un cadran à aiguilles ne permet
     pas de trancher : midi, minuit, et les heures dont le nom tombe
     dessus (onze heures quarante-cinq se dit « midi moins le quart »).
     Tout exercice de lecture pure passe par là.

     `pasAimant` arrondit les minutes au pas du palier : une heure
     qu'on demande de montrer doit pouvoir être montrée exactement.
     ------------------------------------------------------------------ */

  function ambigu(h, m) {
    return masculin(h) || masculin(heureDeReference(h, m));
  }

  function tirer(rang, options) {
    options = options || {};
    var p = palier(rang);
    var heures = options.heures || p.heures;
    var minutes = options.minutes || p.minutes;
    var essais = 0;
    var h, m;

    do {
      h = heures[Math.floor(Math.random() * heures.length)];
      m = minutes[Math.floor(Math.random() * minutes.length)];
      essais += 1;
      if (!options.sansAmbiguite || !ambigu(h, m)) return { h: h, m: m, palier: p.rang };
    } while (essais < 200);

    /* Repli : une heure sûre, jamais ambiguë, toujours montrable. */
    return { h: 3, m: minutes.indexOf(0) >= 0 ? 0 : minutes[0], palier: p.rang };
  }

  /* Toutes les heures d'un palier, utile aux leurres et aux tests. */
  function toutes(rang, options) {
    options = options || {};
    var p = palier(rang);
    var sortie = [];
    p.heures.forEach(function (h) {
      p.minutes.forEach(function (m) {
        if (options.sansAmbiguite && ambigu(h, m)) return;
        sortie.push({ h: h, m: m });
      });
    });
    return sortie;
  }

  return {
    PALIERS: PALIERS,
    palier: palier,
    socle: socle,
    enMots: enMots,
    enMotsAvecMoment: enMotsAvecMoment,
    enMotsOfficiel: enMotsOfficiel,
    enChiffres: enChiffres,
    dureeEnMots: dureeEnMots,
    moment: moment,
    heureDeReference: heureDeReference,
    ambigu: ambigu,
    tirer: tirer,
    toutes: toutes
  };
})();
