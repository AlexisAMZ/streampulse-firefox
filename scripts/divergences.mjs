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
 * js/changelog-data.js était ici tant que l'entrée 26.9.21 divergeait ; cette
 * entrée n'existe plus (historique réduit), le fichier est donc recopié tel quel.
 */
export const NEVER_COPY = ["manifest.json"];

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
  "js/inject/points-bonus-inline.js",
  "scripts/build-inline-points-bonus.mjs",
  "tests/points-bonus-inline.test.mjs",
];

/** Régénérés après la copie, jamais recopiés tels quels. */
export const GENERATED = [
  { file: "js/inject/i18n-inline.js", script: "scripts/build-inline-i18n.mjs" },
  { file: "js/inject/predictions-data-inline.js", script: "scripts/build-inline-predictions.mjs" },
  { file: "js/inject/points-bonus-inline.js", script: "scripts/build-inline-points-bonus.mjs" },
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
      // Extension rechargée sans rafraîchir l'onglet : pas de vendor, lecteur natif.
      if (!(chrome.runtime && chrome.runtime.id)) return Promise.resolve(null);
      hlsPromise = import(chrome.runtime.getURL("js/vendor/hls.light.min.js"))
        .then(() => NS.Hls || globalThis.Hls || null)
        .catch((error) => {
          console.warn("[StreamPulse] aperçus : lecteur HLS indisponible", error?.message || error);
          return null;
        });
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
    file: "js/sw/notifications.js",
    why: "chrome.offscreen n'existe pas sur Firefox. Inutile ici : la page d'arriere-plan Firefox est une vraie page, elle a un DOM et joue le son elle-meme (meme lecteur que le document hors ecran de Chrome).",
    edits: [
      {
        find: `import { DEFAULT_SOUND, SMART_SOUND, resolveSmartSound, resolveSound } from "../notification-sounds.js";`,
        replace: `import { DEFAULT_SOUND, SMART_SOUND, resolveSmartSound, resolveSound } from "../notification-sounds.js";
import { playNotificationSound } from "../notification-sound-player.js";`,
      },
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
          preset,
          dataUrl,
          volume: 1.0,
        },
      });
    } catch (error) {
      console.warn("Audio playback error:", error.message);
    }`,
        replace: `    // Chrome n'a pas de DOM dans son service worker et passe par un document
    // offscreen. La page d'arriere-plan Firefox est une vraie page : on joue
    // le son sur place, avec le meme lecteur (fichier ou synthese Web Audio).
    try {
      await playNotificationSound(preset, { volume: 1, dataUrl, getUrl: (path) => chrome.runtime.getURL(path) });
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
    .catch((error) => console.warn("[StreamPulse] prédictions : module indisponible", error?.message || error));`,
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
  {
    file: "js/channelPointsClaimer.js",
    why: "Même raison : la règle de la caisse de bonus est livrée en jumeau classique, généré par scripts/build-inline-points-bonus.mjs.",
    edits: [
      {
        find: `  /** Module js/points-bonus.js, chargé plus bas par import() dynamique. */`,
        replace: `  /** Règles de js/points-bonus.js, posées par points-bonus-inline.js (voir plus bas). */`,
      },
      {
        find: `  import(chrome.runtime.getURL("js/points-bonus.js"))
    .then((module) => {
      bonusRules = module;
    })
    .catch((error) => {
      // Sans ces règles, les points ne sont plus récupérés ; les Drops continuent.
      console.warn("[StreamPulse] règles de la caisse de bonus indisponibles", error);
    });`,
        replace: `  // js/inject/points-bonus-inline.js est declare juste avant ce fichier dans
  // content_scripts : il pose window.__SP_POINTS_BONUS__. Firefox refuse
  // l'import() dynamique dans un content script, la recuperation des points ne
  // demarrerait jamais. Sans ces regles, Drops et Moments continuent.
  bonusRules = window.__SP_POINTS_BONUS__ || null;
  if (!bonusRules) console.warn("[StreamPulse] points-bonus-inline.js absent, recuperation des points desactivee.");`,
      },
    ],
  },
  {
    file: "js/chzzk.js",
    why: "CHZZK : la regle d'en-tete cible l'initiateur par l'identifiant de l'extension (32 lettres a-p) sur Chrome. Sur Firefox, runtime.id est l'identifiant gecko (streampulse@alexisamz.fr) et l'origine d'une page d'extension est un moz-extension://<uuid> aleatoire : initiatorDomains ne peut pas viser l'extension. On cible les requetes sans onglet (tabIds -1, celles de la page d'arriere-plan), donc jamais celles de chzzk.naver.com ouvert dans un onglet.",
    edits: [
      {
        find: `  if (typeof extensionId !== "string" || !/^[a-p]{32}$/.test(extensionId)) return null;`,
        replace: `  if (typeof extensionId !== "string" || extensionId === "") return null;`,
      },
      {
        find: `condition: { urlFilter: "||api.chzzk.naver.com/", resourceTypes: ["xmlhttprequest"], initiatorDomains: [extensionId] },`,
        replace: `condition: { urlFilter: "||api.chzzk.naver.com/", resourceTypes: ["xmlhttprequest"], tabIds: [-1] },`,
      },
      {
        // Firefox refuse declarativeNetRequestWithHostAccess en optional_permissions (web-ext lint :
        // « Invalid optional_permissions »). Elle reste donc obligatoire dans le manifeste du port, sans
        // aucun avertissement pour l'utilisateur (MDN : seule declarativeNetRequest en affiche un) ; la
        // demande ne porte plus que sur l'hôte CHZZK.
        find: `export const CHZZK_API_PERMISSIONS = ["declarativeNetRequestWithHostAccess"];`,
        replace: `export const CHZZK_API_PERMISSIONS = [];`,
      },
    ],
  },
  {
    file: "js/twitch-follows-import.js",
    why: "Firefox : identity ne peut pas etre facultative (declaree au manifeste) et la fenetre de connexion native de launchWebAuthFlow est lisible, contrairement a celle de Chrome.",
    edits: [
      {
        find: `const REDIRECT_ORIGIN = "https://*.chromiumapp.org/*";
const AUTH_WINDOW = { width: 560, height: 820 };

/**
 * Fenêtre de connexion Twitch à nous : celle de launchWebAuthFlow est minuscule
 * sous Chrome et cache le bouton Autoriser. Rend l'adresse de retour (avec le
 * jeton dans le fragment) dès que Twitch y redirige, puis referme la fenêtre.
 */
async function openAuthWindow(url, redirectUri) {
  const win = await chrome.windows.create({ url, type: "popup", focused: true, ...AUTH_WINDOW });
  const tabId = win.tabs?.[0]?.id;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (settle, value) => {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.windows.onRemoved.removeListener(onRemoved);
      settle(value);
    };
    const onUpdated = (id, info, tab) => {
      const current = info.url || tab?.url;
      if (id !== tabId || !current?.startsWith(redirectUri)) return;
      finish(resolve, current);
      chrome.windows.remove(win.id).catch(() => {});
    };
    const onRemoved = (id) => {
      if (id === win.id) finish(reject, typedError("denied"));
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.windows.onRemoved.addListener(onRemoved);
  });
}

/**
 * Ouvre la fenêtre Twitch et rend le jeton. La demande de permission vient en
 * premier : Chrome l'exige pendant le clic, avant toute attente.
 */
async function authorize() {
  const granted = await chrome.permissions.request({ permissions: ["identity"], origins: [REDIRECT_ORIGIN] });
  if (!granted) throw typedError("permission");
  const config = await chrome.runtime.sendMessage({ type: "getConfig" });
  const clientId = config?.clientId;
  if (!clientId) throw typedError("config");
  const state = randomState();
  let redirect;
  try {
    const redirectUri = chrome.identity.getRedirectURL();
    redirect = await openAuthWindow(buildAuthorizeUrl({ clientId, redirectUri, state }), redirectUri);
  } catch {
    throw typedError("denied");
  }
  const result = parseAuthRedirect(redirect, state);
  if (!result.ok) throw typedError(result.reason);
  return { token: result.token, clientId };
}

/** La permission ne sert qu'à ce moment-là : on la rend aussitôt. */
function releaseIdentityPermission() {
  chrome.permissions.remove({ permissions: ["identity"], origins: [REDIRECT_ORIGIN] }).catch(() => {});
}`,
        replace: `/**
 * Ouvre la fenêtre Twitch du navigateur et rend le jeton. Firefox n'accepte pas
 * "identity" en permission facultative : elle est déclarée au manifeste, donc
 * rien à demander ni à rendre, et launchWebAuthFlow ouvre une fenêtre lisible.
 */
async function authorize() {
  const config = await chrome.runtime.sendMessage({ type: "getConfig" });
  const clientId = config?.clientId;
  if (!clientId) throw typedError("config");
  const state = randomState();
  let redirect;
  try {
    redirect = await chrome.identity.launchWebAuthFlow({
      url: buildAuthorizeUrl({ clientId, redirectUri: chrome.identity.getRedirectURL(), state }),
      interactive: true,
    });
  } catch {
    throw typedError("denied");
  }
  const result = parseAuthRedirect(redirect, state);
  if (!result.ok) throw typedError(result.reason);
  return { token: result.token, clientId };
}

/** Rien à rendre sur Firefox : la permission est au manifeste. */
function releaseIdentityPermission() {}`,
      },
    ],
  },
  {
    file: "tests/chzzk.test.mjs",
    why: "Test de la divergence ci-dessus : l'identifiant Firefox est de la forme nom@domaine et la condition est tabIds -1.",
    edits: [
      {
        find: `  const rule = chzzkOriginRule("abcdefghijklmnopabcdefghijklmnop");`,
        replace: `  const rule = chzzkOriginRule("streampulse@alexisamz.fr");`,
      },
      {
        find: `  assert.deepEqual(rule.condition.initiatorDomains, ["abcdefghijklmnopabcdefghijklmnop"]);`,
        replace: `  assert.deepEqual(rule.condition.tabIds, [-1]);`,
      },
      {
        find: `  for (const bad of ["", null, undefined, "pas un id", 42]) assert.equal(chzzkOriginRule(bad), null);`,
        replace: `  for (const bad of ["", null, undefined, 42]) assert.equal(chzzkOriginRule(bad), null);`,
      },
      {
        find: `permissions: ["declarativeNetRequestWithHostAccess"] });`,
        replace: `permissions: [] });`,
      },
      {
        find: `  assert.ok(!manifest.permissions.includes("declarativeNetRequestWithHostAccess"));
  // identity (import des follows Twitch) est facultative aussi : demandée au clic, jamais à l'installation.
  assert.ok(!manifest.permissions.includes("identity"));
  assert.deepEqual(manifest.optional_permissions, ["declarativeNetRequestWithHostAccess", "identity"]);
  // L'adresse de retour chromiumapp.org sert à lire la réponse de Twitch dans notre propre fenêtre de connexion.
  assert.deepEqual(manifest.optional_host_permissions, [CHZZK_HOST_PERMISSION, "https://*.cloudfront.net/*", "https://*.chromiumapp.org/*"]);
  // La restauration audio VOD (bêta) demande son accès au clic : ni DNR ni CloudFront à l'installation.
  assert.ok(!manifest.permissions.includes("declarativeNetRequest"));
  assert.ok(!manifest.host_permissions.includes("https://*.cloudfront.net/*"));`,
        replace: `  // Firefox : obligatoire (sans avertissement), car le navigateur la refuse en facultative.
  assert.ok(manifest.permissions.includes("declarativeNetRequestWithHostAccess"));
  // identity (import des follows Twitch) : obligatoire aussi, Firefox ne la propose pas en facultative.
  assert.ok(manifest.permissions.includes("identity"));
  assert.equal(manifest.optional_permissions, undefined);
  assert.deepEqual(manifest.optional_host_permissions, [CHZZK_HOST_PERMISSION]);
  // La restauration audio VOD : DNR et CloudFront sont obligatoires sur Firefox, donc déjà accordés.
  assert.ok(manifest.permissions.includes("declarativeNetRequest"));
  assert.ok(manifest.host_permissions.includes("https://*.cloudfront.net/*"));`
      },
      {
        find: `test("manifeste : la règle d'en-tête est une permission facultative, jamais obligatoire"`,
        replace: `test("manifeste Firefox : la règle d'en-tête est obligatoire, sans demande"`,
      },
    ],
  },
  {
    file: "tests/notification-sounds.test.mjs",
    why: "Le son se joue sur place dans la page d'arriere-plan Firefox (voir js/sw/notifications.js) : le test observe la premiere note synthetisee au lieu du message envoye au document hors ecran de Chrome.",
    edits: [
      {
        find: `  async function played(local) {
    const fake = createFakeChrome({ local });
    globalThis.chrome = fake;`,
        replace: `  const firstFrequencies = [];
  globalThis.AudioContext = class {
    currentTime = 0;
    state = "running";
    destination = {};
    createGain() {
      return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({ connect() {} }) };
    }
    createOscillator() {
      return {
        frequency: { setValueAtTime(freq) { this.value = freq; }, exponentialRampToValueAtTime() {} },
        connect: () => ({ connect() {} }),
        start(when) { if (when === 0.02) firstFrequencies.push(this.frequency.value); },
        stop() {},
      };
    }
  };
  const presetOf = (frequency) => Object.keys(SOUND_SYNTH).find((id) => SOUND_SYNTH[id][0].freq === frequency);
  async function played(local) {
    const fake = createFakeChrome({ local });
    globalThis.chrome = fake;
    firstFrequencies.length = 0;`,
      },
      {
        find: `    return fake.calls.filter(([name]) => name === "runtime.sendMessage").map(([, message]) => message?.audioCommand?.preset);`,
        replace: `    return firstFrequencies.map(presetOf);`,
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
  ar: "إضافة FIREFOX · TWITCH · KICK · YOUTUBE",
};

export const LANGUAGES = ["fr", "en", "es", "pt-BR", "de", "it", "pl", "tr", "ru", "ja", "ko", "ar"];
