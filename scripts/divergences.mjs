/**
 * LA LISTE DES DIVERGENCES ASSUMÉES ENTRE CE PORT ET LA RÉFÉRENCE CHROME.
 *
 * C'est le seul endroit où elles sont écrites. `scripts/sync-from-chrome.mjs`
 * recopie tout le code livré depuis la référence puis réapplique ce qui suit.
 *
 * Chaque correctif porte une ancre. Si la référence change le code sous une
 * ancre, la synchronisation S'ARRÊTE au lieu de produire un port faux en
 * silence : c'est tout l'intérêt du fichier.
 */

/**
 * Jamais recopiés.
 * - manifest.json : le manifeste Firefox n'a rien à voir avec celui de Chrome.
 * - js/changelog-data.js : même historique (12 versions, vérifié), mais l'entrée
 *   26.9.21 diverge volontairement. Elle n'annonce pas les 354 Ko économisés par
 *   le chargement à la demande de hls.js, qui n'existe pas ici, et elle ajoute
 *   trois correctifs propres au port. Maintenu à la main, pas par copie.
 */
export const NEVER_COPY = ["manifest.json", "js/changelog-data.js"];

/**
 * Propres au port, absents de la référence. Listés pour mémoire : la
 * synchronisation ne recopie que des fichiers qui existent côté Chrome, donc
 * elle ne peut pas les effacer. La liste sert de garde-fou au test.
 */
export const PORT_ONLY = [
  "html/embed-player.html",
  "js/embed-player.js",
  "js/autoClipDetector.js",
  "js/utils.js",
  "js/inject/predictions-data-inline.js",
  "scripts/build-inline-predictions.mjs",
  "tests/predictions-inline.test.mjs",
];

/** Régénérés après la copie, jamais recopiés tels quels. */
export const GENERATED = [
  { file: "js/inject/i18n-inline.js", script: "scripts/build-inline-i18n.mjs" },
  { file: "js/inject/predictions-data-inline.js", script: "scripts/build-inline-predictions.mjs" },
];

/**
 * Correctifs réappliqués après la copie. `find` doit apparaître exactement
 * `count` fois (1 par défaut) dans le fichier recopié, sinon on s'arrête.
 */
export const PATCHES = [
  {
    file: "js/previews/card.js",
    why: "Firefox ne supporte pas l'import() dynamique dans un content script : hls.js reste déclaré dans content_scripts.",
    edits: [
      {
        find: `    // hls.js n'est plus charge sur chaque page Twitch (354 Ko pour rien) : il est
    // declare dans web_accessible_resources et importe ici, au premier demarrage
    // reel d'un apercu. Le bundle est un UMD : evalue comme module, il s'accroche
    // a globalThis, donc au global du monde isole. En cas d'echec, on retombe sur
    // le lecteur natif (Safari-like) ou l'image.
    let hlsPromise = null;
    function ensureHls() {
      if (NS.Hls) return Promise.resolve(NS.Hls);
      if (hlsPromise) return hlsPromise;
      hlsPromise = import(chrome.runtime.getURL("js/vendor/hls.light.min.js"))
        .then(() => NS.Hls || globalThis.Hls || null)
        .catch(() => null);
      return hlsPromise;
    }

    async function startPlayback(variantUrl, token, opts) {`,
        replace: `    function startPlayback(variantUrl, token, opts) {`,
      },
      {
        find: `      const Hls = await ensureHls();
      // Le survol a pu prendre fin pendant le chargement du vendor.
      if (token !== playbackToken || !videoEl) return;`,
        replace: `      const Hls = NS.Hls;`,
      },
    ],
  },
  {
    file: "js/background.js",
    why: "chrome.offscreen n'existe pas sur Firefox. Inutile ici : la page d'arriere-plan Firefox est une vraie page, elle a un DOM et joue le son elle-meme.",
    edits: [
      {
        find: `    try {
      await chrome.offscreen.createDocument({
        url: "html/audio-handler.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Lecture d'une notification audio",
      });
    } catch (creationError) {
      if (
        !creationError?.message?.includes("Only a single offscreen") &&
        !creationError?.message?.includes("already created")
      ) {
        console.warn("Offscreen creation error:", creationError.message);
      }
    }

    try {
      await chrome.runtime.sendMessage({
        audioCommand: {
          action: "play",
          file: filePath,
          volume: 1.0,
        },
      });
    } catch (error) {
      console.warn("Audio playback error:", error.message);
    }`,
        replace: `    // Chrome n'a pas de DOM dans son service worker et passe par un document
    // offscreen. La page d'arriere-plan Firefox, elle, est une vraie page :
    // Audio() y est disponible, on joue donc le son sur place. L'appel a
    // chrome.offscreen levait un TypeError avale par le try/catch, puis le
    // sendMessage ne trouvait personne : le son ne sortait jamais.
    try {
      const audio = new Audio(chrome.runtime.getURL(filePath));
      audio.volume = 1;
      await audio.play();
    } catch (error) {
      console.warn("Audio playback error:", error?.message);
    }`,
      },
    ],
  },
  {
    file: "js/inject/predictionsAssist.js",
    why: "Même raison : le module est livré en jumeau classique, généré par scripts/build-inline-predictions.mjs.",
    edits: [
      {
        find: `  import(chrome.runtime.getURL("js/predictions-data.js"))
    .then((module) => {
      data = module;
      setTimeout(tick, 4_000);
    })
    .catch(() => {});`,
        replace: `  // js/inject/predictions-data-inline.js est declare juste avant ce fichier
  // dans content_scripts : il pose window.__SP_PREDICTIONS__. On ne charge
  // plus le module par import() dynamique, que Firefox refuse dans un content
  // script (la promesse etait rejetee et l'assistance ne demarrait jamais).
  data = window.__SP_PREDICTIONS__;
  if (data) setTimeout(tick, 4_000);
  else console.warn("StreamPulse: predictions-data-inline.js absent, assistance desactivee.");`,
      },
    ],
  },
];

/**
 * Textes où le nom du navigateur doit changer. Le remplacement est borné à ces
 * clés : une substitution globale toucherait les notes de version historiques,
 * qui racontent ce qui s'est passé côté Chrome et doivent rester exactes.
 */
export const BROWSER_NAME_KEYS = [
  "preventTabDiscardDescription",
  "liveNotificationsTitle",
  "liveEnabled",
  "liveDisabled",
  "notificationsDisabled",
];

/** welcomeTagline est réécrit en entier : « Chrome » y est décliné par langue. */
export const TAGLINES = {
  fr: "EXTENSION FIREFOX · TWITCH · KICK · YOUTUBE",
  en: "FIREFOX EXTENSION · TWITCH · KICK · YOUTUBE",
  es: "EXTENSIÓN FIREFOX · TWITCH · KICK · YOUTUBE",
  "pt-BR": "EXTENSÃO FIREFOX · TWITCH · KICK · YOUTUBE",
  de: "FIREFOX-ERWEITERUNG · TWITCH · KICK · YOUTUBE",
  it: "ESTENSIONE FIREFOX · TWITCH · KICK · YOUTUBE",
  pl: "ROZSZERZENIE FIREFOX · TWITCH · KICK · YOUTUBE",
  tr: "FIREFOX UZANTISI · TWITCH · KICK · YOUTUBE",
  ru: "РАСШИРЕНИЕ ДЛЯ FIREFOX · TWITCH · KICK · YOUTUBE",
  ja: "Firefox拡張機能 · Twitch · Kick · YouTube",
  ko: "파이어폭스 확장 프로그램 · 트위치 · 킥 · 유튜브",
};

export const LANGUAGES = ["fr", "en", "es", "pt-BR", "de", "it", "pl", "tr", "ru", "ja", "ko"];
