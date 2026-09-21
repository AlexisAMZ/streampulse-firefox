# Portage de StreampulseFirefox 26.9.17 → 26.9.21

> **Pour les agents :** SOUS-COMPÉTENCE REQUISE : utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**But :** amener le port Firefox au niveau fonctionnel de la version Chrome 26.9.21, avec YouTube comme troisième plateforme, sans copier les choix d'architecture qui ne valent que pour Chrome.

**Architecture :** le dépôt Firefox n'est pas un miroir du dépôt Chrome, c'est un port avec ses propres adaptations : page d'arrière-plan MV3 (`background.scripts`, `type: module`) au lieu d'un service worker, pas de permission `offscreen` (le son passe par `html/audio-handler.html`), et quatre fichiers qui n'existent que côté Firefox. Le portage se fait **version par version** (26.9.18, puis .19, .20, .21), chaque phase se terminant par un build vérifié et publiable. On ne fait jamais un `cp -r` du dépôt Chrome.

**Pile technique :** WebExtension MV3 Firefox (`strict_min_version: 128.0`), ES modules sans build, ESLint, `node --test`, `scripts/verify.mjs`, publication AMO par API v5 (`scripts/publish-firefox.mjs` dans le dépôt Chrome).

**Spec :** ce plan est sa propre spec. La source de vérité du comportement attendu est le dépôt `~/dev/StreamPulseExtension` au commit `fc81e5b` et ses notes de version dans `js/changelog-data.js` pour 26.9.18 à 26.9.21.

---

## Contraintes globales

- **Dépôt de travail :** `~/dev/StreampulseFirefox`. Dépôt de référence, en lecture seule : `~/dev/StreamPulseExtension` (désigné ci-dessous par `$C`).
- **Ne jamais écraser les fichiers propres à Firefox :** `html/embed-player.html`, `js/embed-player.js`, `js/autoClipDetector.js`, `js/utils.js`. Ils n'existent pas côté Chrome ; un portage par copie de dossier les supprimerait.
- **Ne jamais copier `manifest.json` depuis `$C`.** Le manifeste Firefox diverge volontairement : `background.scripts` + `type: module`, `browser_specific_settings.gecko`, pas d'`offscreen`, `web_accessible_resources` propres.
- **hls.js reste déclaré dans `content_scripts`.** Chrome est passé à un `import()` dynamique depuis le monde isolé pour économiser 354 Ko par page ; **Firefox ne supporte pas l'`import()` dynamique dans les content scripts**. Le port garde le chargement déclaratif, donc ni permission `scripting`, ni `web_accessible_resources` pour hls.js. Cette divergence est assumée et doit être écrite dans `BUILD.md` (tâche 12).
- **Langues publiées : 11** — `fr, en, es, pt-BR, de, it, pl, tr, ru, ja, ko`. Les quatre dossiers `_locales/cs`, `_locales/id`, `_locales/nl`, `_locales/sv` sont supprimés (tâche 2).
- **Toute modification visible par l'utilisateur va dans `js/changelog-data.js`**, dans les 11 langues, dans le même commit. `npm run verify` échoue sinon.
- **Style de rédaction française :** jamais de tiret cadratin (`—`). Utiliser deux-points ou virgule.
- **Après chaque tâche :** `npm run lint && npm test && npm run verify` doivent passer avant le commit.

---

## Structure des fichiers

Fichiers créés dans le dépôt Firefox au cours du portage, avec leur responsabilité :

| Fichier | Responsabilité | Phase |
|---|---|---|
| `js/preferences-data.js` | Table des préférences et leur normalisation, extraite de `background.js` | 2 |
| `js/raidWatcher.js` | Détection des raids entrants côté page Twitch | 2 |
| `js/eventsubRaid.js` | Abonnement EventSub pour être prévenu du raid 90 s plus tôt | 2 |
| `js/inject/dom.js` | Utilitaires DOM partagés par les scripts injectés | 2 |
| `js/inject/player-tip.js` | Bulle d'aide sur le lecteur | 2 |
| `js/inject/playerQuality.js` | Maintien de la qualité vidéo en arrière-plan | 2 |
| `js/twitchPlayerButtons.js` | Boutons ajoutés à la barre du lecteur Twitch | 2 |

Fichiers modifiés en profondeur, dans l'ordre de dépendance : `js/platforms.js` (socle des plateformes), puis `js/background.js` (sondage, statuts, badge), puis `js/ui.js` et `js/popup.js` (rendu), enfin `i18n/translations.js` et `js/changelog-data.js` (textes).

---

## Phase 0 : préparer le terrain

### Tâche 1 : brancher le portage et figer la référence

**Fichiers :**
- Aucun fichier modifié ; opération git uniquement.

**Interfaces :**
- Produit : la branche `port/26.9.21` et la variable d'environnement `SP_CHROME_REF`, utilisées par toutes les tâches suivantes.

- [ ] **Étape 1 : vérifier que l'arbre est propre**

```bash
cd ~/dev/StreampulseFirefox && git status --porcelain
```

Attendu : aucune sortie. S'il y a des modifications, les committer ou les remiser avant de continuer.

- [ ] **Étape 2 : créer la branche de portage**

```bash
cd ~/dev/StreampulseFirefox && git checkout -b port/26.9.21
```

- [ ] **Étape 3 : figer le commit de référence côté Chrome**

```bash
cd ~/dev/StreamPulseExtension && git rev-parse --short HEAD
```

Attendu : `fc81e5b` ou plus récent. Noter la valeur : c'est la seule version du dépôt Chrome à laquelle se référer pendant tout le portage, pour éviter de porter une moitié d'un état et une moitié d'un autre.

- [ ] **Étape 4 : établir la mesure de départ**

```bash
cd ~/dev/StreampulseFirefox && npm run lint && npm test && npm run verify
```

Attendu : tout passe. Si `verify` échoue déjà avant toute modification, corriger d'abord : on ne porte pas sur une base cassée.

- [ ] **Étape 5 : commit du point de départ**

```bash
cd ~/dev/StreampulseFirefox && git commit --allow-empty -m "chore: ouvrir le portage vers 26.9.21

Référence figée : StreamPulseExtension @ fc81e5b."
```

---

### Tâche 2 : réduire de 15 à 11 langues

**Fichiers :**
- Supprimer : `_locales/cs/`, `_locales/id/`, `_locales/nl/`, `_locales/sv/`
- Modifier : `i18n/translations.js` (retirer les quatre blocs de langue et leur entrée dans `AVAILABLE_LANGUAGES`)
- Modifier : `js/changelog-data.js` (retirer les quatre clés de chaque entrée `text`)
- Régénérer : `js/inject/i18n-inline.js`

**Interfaces :**
- Produit : `AVAILABLE_LANGUAGES` à 11 entrées, consommé par le sélecteur de langue du popup et par `verify.mjs`.

- [ ] **Étape 1 : constater l'état actuel**

```bash
cd ~/dev/StreampulseFirefox && ls _locales/ && grep -c '"cs"' i18n/translations.js
```

Attendu : 15 dossiers, et un compte non nul pour `cs`.

- [ ] **Étape 2 : supprimer les dossiers de locale**

```bash
cd ~/dev/StreampulseFirefox && git rm -r -q _locales/cs _locales/id _locales/nl _locales/sv
```

- [ ] **Étape 3 : retirer les quatre langues de `i18n/translations.js`**

Le fichier est un objet dont chaque langue est un bloc de premier niveau. Repérer les bornes de chaque bloc puis les retirer :

```bash
cd ~/dev/StreampulseFirefox && grep -n '^  "\(cs\|id\|nl\|sv\)":' i18n/translations.js
```

Supprimer chaque bloc de sa ligne d'ouverture jusqu'à l'accolade fermante de même indentation, puis retirer les quatre codes de `AVAILABLE_LANGUAGES`.

- [ ] **Étape 4 : vérifier qu'il ne reste aucune trace**

```bash
cd ~/dev/StreampulseFirefox && node -e 'import("./i18n/translations.js").then(m=>{const l=m.AVAILABLE_LANGUAGES.map(x=>x.code||x);console.log(l.length,l.join(","));})'
```

Attendu : `11 fr,en,es,pt-BR,de,it,pl,tr,ru,ja,ko`

- [ ] **Étape 5 : retirer les quatre langues du changelog**

```bash
cd ~/dev/StreampulseFirefox && grep -c '"cs":' js/changelog-data.js
```

Supprimer chaque ligne `cs:`, `id:`, `nl:`, `sv:` (et leur variante entre guillemets) dans tous les blocs `text` et `title`. Recompter ensuite : attendu `0`.

- [ ] **Étape 6 : régénérer les chaînes injectées**

```bash
cd ~/dev/StreampulseFirefox && node scripts/build-inline-i18n.mjs
```

Attendu : une ligne confirmant 11 langues.

- [ ] **Étape 7 : vérifier**

```bash
cd ~/dev/StreampulseFirefox && npm run lint && npm test && npm run verify
```

Attendu : tout passe, et `verify` annonce 11 langues partout. S'il annonce encore 15 quelque part, c'est qu'une liste est codée en dur : la corriger plutôt que d'ajuster le test.

- [ ] **Étape 8 : commit**

```bash
cd ~/dev/StreampulseFirefox && git add -A && git commit -m "chore: réduire à 11 langues publiées

Les locales cs, id, nl et sv sont retirées, comme côté Chrome : elles
n'étaient plus maintenues et la fiche annonce 11 langues."
```

---

## Phase 1 : porter 26.9.18, moins de permissions

### Tâche 3 : retirer la permission `tabs`

**Fichiers :**
- Modifier : `manifest.json` (tableau `permissions`)
- Modifier : `js/background.js` (tous les appels à `chrome.tabs` / `browser.tabs` qui ne sont pas couverts par une permission d'hôte)
- Modifier : `js/changelog-data.js` (entrée 26.9.18)

**Interfaces :**
- Consomme : rien.
- Produit : un manifeste sans `tabs`, condition d'acceptation de la tâche 4.

- [ ] **Étape 1 : recenser les usages de l'API tabs**

```bash
cd ~/dev/StreampulseFirefox && grep -rn "tabs\." js/ --include=*.js | grep -v "^js/vendor/" | head -40
```

Noter chaque appel. `tabs.create` et `tabs.query` avec une URL couverte par une permission d'hôte ne nécessitent pas la permission `tabs` ; c'est la lecture de `tab.url`, `tab.title` et `tab.favIconUrl` sur des onglets quelconques qui l'exige.

- [ ] **Étape 2 : comparer avec la solution retenue côté Chrome**

```bash
cd ~/dev/StreamPulseExtension && git log --oneline --all -S'"tabs"' -- manifest.json | head -5
```

Lire le diff du commit qui retire `tabs` et reproduire la même approche, sans copier le fichier.

- [ ] **Étape 3 : retirer la permission**

Dans `manifest.json`, retirer `"tabs"` du tableau `permissions`. Le tableau doit devenir exactement :

```json
"permissions": ["storage", "alarms", "notifications"]
```

- [ ] **Étape 4 : vérifier qu'aucun appel ne casse**

```bash
cd ~/dev/StreampulseFirefox && npm run lint && npm run verify
```

Attendu : tout passe. `verify` vérifie que les fichiers référencés par le manifeste existent, pas les permissions : le vrai contrôle est l'étape 5.

- [ ] **Étape 5 : contrôle manuel dans Firefox**

Charger le dépôt via `about:debugging` → « Ce Firefox » → « Charger un module temporaire » → sélectionner `manifest.json`. Ouvrir une page Twitch, ouvrir la popup, vérifier :
- la liste des lives se remplit
- l'icône d'onglet du streamer s'affiche
- la console de l'extension ne montre aucune erreur de permission

Si une erreur `permission denied` apparaît, noter l'appel fautif et le remplacer par une approche sans `tabs`, jamais en remettant la permission.

- [ ] **Étape 6 : note de version dans les 11 langues**

Ajouter en tête de `RELEASES` dans `js/changelog-data.js` une entrée `26.9.18` reprenant les textes déjà rédigés côté Chrome :

```bash
cd ~/dev/StreamPulseExtension && node -e 'import("./js/changelog-data.js").then(m=>{const r=m.RELEASES.find(r=>r.version==="26.9.18");console.log(JSON.stringify(r,null,2));})'
```

Copier le bloc et retirer les quatre langues supprimées en tâche 2.

- [ ] **Étape 7 : vérifier et committer**

```bash
cd ~/dev/StreampulseFirefox && npm run lint && npm test && npm run verify && git add -A && git commit -m "fix: retirer la permission tabs

L'extension n'a plus besoin d'accéder aux onglets du navigateur."
```

---

### Tâche 4 : réparer les aperçus sur les favoris de la barre latérale

**Fichiers :**
- Modifier : `js/inject/sidebar-favorites.js` (45 lignes d'écart avec la référence)
- Modifier : `js/previews/card.js` (21 lignes d'écart)
- Test : contrôle manuel dans Firefox, décrit à l'étape 4

**Interfaces :**
- Consomme : le manifeste sans `tabs` de la tâche 3.
- Produit : les aperçus fonctionnels sur les favoris, condition d'acceptation de la phase 1.

- [ ] **Étape 1 : lire l'écart**

```bash
diff ~/dev/StreampulseFirefox/js/inject/sidebar-favorites.js ~/dev/StreamPulseExtension/js/inject/sidebar-favorites.js
```

- [ ] **Étape 2 : reporter uniquement la partie aperçus**

Le fichier Chrome contient aussi le filtrage des favoris hors ligne, livré en 26.9.21. Ne porter ici que ce qui concerne l'attachement des cibles d'aperçu. Le reste attend la tâche 10.

- [ ] **Étape 3 : reporter l'écart sur `js/previews/card.js`**

```bash
diff ~/dev/StreampulseFirefox/js/previews/card.js ~/dev/StreamPulseExtension/js/previews/card.js
```

**Ne pas porter `ensureHls()`.** Côté Chrome cette fonction fait un `import()` dynamique ; côté Firefox hls.js reste déclaré dans le manifeste, donc `NS.Hls` est déjà disponible et `startPlayback` doit le lire directement.

- [ ] **Étape 4 : contrôle manuel**

Recharger le module temporaire, aller sur Twitch, survoler un favori StreamPulse dans la barre latérale.

Attendu : l'aperçu vidéo démarre. Si seule l'image fixe apparaît, ouvrir la console de la page et vérifier que `Hls` est défini : s'il ne l'est pas, c'est que `hls.light.min.js` a été retiré du manifeste par erreur.

- [ ] **Étape 5 : vérifier et committer**

```bash
cd ~/dev/StreampulseFirefox && npm run lint && npm test && npm run verify && git add -A && git commit -m "fix: aperçus au survol sur les favoris de la barre latérale Twitch"
```

---

## Phase 2 : porter 26.9.19, lecteur et alertes

### Tâche 5 : créer les modules absents du lecteur

**Fichiers :**
- Créer : `js/inject/dom.js`, `js/inject/player-tip.js`, `js/inject/playerQuality.js`, `js/twitchPlayerButtons.js`
- Modifier : `manifest.json` (les déclarer dans le bon bloc `content_scripts`, dans le même ordre que côté Chrome)

**Interfaces :**
- Produit : `js/inject/dom.js` exporte les utilitaires consommés par `player-tip.js` et `playerQuality.js` ; `twitchPlayerButtons.js` s'appuie sur `twitchPlayerEnhancer.js` de la tâche 6.

- [ ] **Étape 1 : copier les quatre fichiers**

```bash
cd ~/dev/StreampulseFirefox && for f in js/inject/dom.js js/inject/player-tip.js js/inject/playerQuality.js js/twitchPlayerButtons.js; do cp ~/dev/StreamPulseExtension/$f $f; done && git add $f
```

- [ ] **Étape 2 : chercher les API absentes de Firefox**

```bash
cd ~/dev/StreampulseFirefox && grep -n "chrome\.\(offscreen\|scripting\|declarativeNetRequest\)" js/inject/dom.js js/inject/player-tip.js js/inject/playerQuality.js js/twitchPlayerButtons.js
```

Attendu : aucune sortie. Toute correspondance doit être réécrite avant de continuer, car ces API ne sont pas disponibles dans ce port.

- [ ] **Étape 3 : déclarer les scripts dans le manifeste**

Relever l'ordre exact côté Chrome :

```bash
cd ~/dev/StreamPulseExtension && python3 -c "
import json;m=json.load(open('manifest.json'))
for cs in m['content_scripts']:
    if 'js/twitchPlayerEnhancer.js' in cs['js']: print(json.dumps(cs['js'], indent=1))"
```

Reproduire le même ordre relatif dans le bloc correspondant du manifeste Firefox. L'ordre compte : `dom.js` doit précéder ses consommateurs.

- [ ] **Étape 4 : vérifier que le manifeste reste cohérent**

```bash
cd ~/dev/StreampulseFirefox && npm run verify
```

Attendu : le contrôle « fichiers référencés par le manifeste » passe, avec un total augmenté de 4.

- [ ] **Étape 5 : commit**

```bash
cd ~/dev/StreampulseFirefox && git add -A && git commit -m "feat: modules du lecteur Twitch absents du port

dom.js, player-tip.js, playerQuality.js et twitchPlayerButtons.js."
```

---

### Tâche 6 : porter l'amélioration du lecteur

**Fichiers :**
- Modifier : `js/twitchPlayerEnhancer.js` (599 lignes d'écart)
- Modifier : `js/inject/preventPause.js` (97 lignes d'écart)

**Interfaces :**
- Consomme : `js/inject/dom.js` et `js/inject/playerQuality.js` de la tâche 5.
- Produit : les préférences `autoRefreshPlayerErrors`, `enableFastForwardButton` et `playerVolumeBoost`, lues par la tâche 8.

- [ ] **Étape 1 : porter la récupération après erreur et la qualité en arrière-plan**

```bash
diff ~/dev/StreampulseFirefox/js/twitchPlayerEnhancer.js ~/dev/StreamPulseExtension/js/twitchPlayerEnhancer.js | head -80
```

Porter la partie « récupération du lecteur » et « latence ». **Ne pas porter l'amplification du volume** : elle appartient à 26.9.21, tâche 9.

- [ ] **Étape 2 : porter l'anti-pause**

```bash
diff ~/dev/StreampulseFirefox/js/inject/preventPause.js ~/dev/StreamPulseExtension/js/inject/preventPause.js
```

- [ ] **Étape 3 : contrôle manuel**

Recharger le module temporaire, ouvrir un live Twitch, puis :
- changer d'onglet et revenir : le flux ne doit pas s'être mis en pause
- dans les réglages, activer « qualité en arrière-plan », changer d'onglet une minute, revenir : la qualité ne doit pas avoir baissé

- [ ] **Étape 4 : vérifier et committer**

```bash
cd ~/dev/StreampulseFirefox && npm run lint && npm test && npm run verify && git add -A && git commit -m "improved: le lecteur Twitch se répare seul et garde sa qualité en arrière-plan"
```

---

### Tâche 7 : porter les alertes par streamer et les raids

**Fichiers :**
- Créer : `js/raidWatcher.js`, `js/eventsubRaid.js`, `js/preferences-data.js`
- Modifier : `js/background.js` (partie préférences et raids uniquement)
- Modifier : `js/popup.js`, `js/ui.js` (réglages d'alerte déplacés sur la carte du streamer)
- Modifier : `manifest.json` (déclarer `raidWatcher.js`)

**Interfaces :**
- Produit : `js/preferences-data.js` exporte `DEFAULT_PREFERENCES`, la table des valeurs par défaut ; `js/background.js` l'importe au lieu de garder la sienne. La normalisation reste dans `background.js`.

- [ ] **Étape 1 : copier les trois nouveaux fichiers**

```bash
cd ~/dev/StreampulseFirefox && for f in js/raidWatcher.js js/eventsubRaid.js js/preferences-data.js; do cp ~/dev/StreamPulseExtension/$f $f; done
```

- [ ] **Étape 2 : vérifier la compatibilité EventSub**

```bash
cd ~/dev/StreampulseFirefox && grep -n "WebSocket\|chrome\.\|browser\." js/eventsubRaid.js | head -20
```

`WebSocket` est disponible dans une page d'arrière-plan Firefox : aucune adaptation nécessaire. Toute API `chrome.*` doit en revanche être vérifiée comme à la tâche 5, étape 2.

- [ ] **Étape 3 : brancher `preferences-data.js` dans le background**

Dans `js/background.js`, remplacer la table de préférences locale par un import :

```js
import { DEFAULT_PREFERENCES } from "./preferences-data.js";
```

C'est le seul export du fichier : la normalisation (`sanitize`) reste dans `background.js`, seule la table des valeurs par défaut est extraite. Supprimer ensuite la table devenue morte dans `background.js`. Ne pas laisser les deux coexister : `verify.mjs` contrôle que chaque préférence survit à `sanitize()`, et deux tables divergentes le feraient échouer silencieusement plus tard.

- [ ] **Étape 4 : porter les réglages d'alerte sur la carte du streamer**

```bash
diff ~/dev/StreampulseFirefox/js/ui.js ~/dev/StreamPulseExtension/js/ui.js | head -60
```

Porter le rendu des réglages par streamer, et retirer les bascules globales correspondantes du panneau de réglages.

- [ ] **Étape 5 : vérifier le contrat des préférences**

```bash
cd ~/dev/StreampulseFirefox && npm run verify 2>&1 | grep -i "preference"
```

Attendu : les deux contrôles « préférences survivent à sanitize » et « updatePreferences délègue la coercition » passent.

- [ ] **Étape 6 : contrôle manuel**

Recharger, ouvrir la popup, ouvrir la carte d'un streamer : les bascules notifications / catégorie / titre doivent y être, et le panneau de réglages ne doit plus les proposer globalement.

- [ ] **Étape 7 : vérifier et committer**

```bash
cd ~/dev/StreampulseFirefox && npm run lint && npm test && npm run verify && git add -A && git commit -m "improved: alertes réglées sur la carte du streamer, et raids détectés 90 s plus tôt"
```

---

## Phase 3 : porter 26.9.20, sondage groupé et résilience

### Tâche 8 : sondage Helix groupé et autoréparation des identifiants

**Fichiers :**
- Modifier : `js/background.js` (fonctions de sondage et de chargement de configuration)

**Interfaces :**
- Consomme : `js/preferences-data.js` de la tâche 7.
- Produit : une fonction de sondage qui interroge jusqu'à 100 chaînes par requête, consommée par l'alarme de sondage.

- [ ] **Étape 1 : lire l'implémentation de référence**

```bash
cd ~/dev/StreamPulseExtension && git show bce7d09 --stat && git show bce7d09 -- js/background.js | head -120
```

- [ ] **Étape 2 : porter le sondage groupé**

Remplacer la boucle « une requête par streamer » par un découpage en lots de 100, avec une seule requête Helix par lot. Conserver le garde-fou de réentrance existant du port : une seule campagne de sondage à la fois.

- [ ] **Étape 3 : porter l'autoréparation des identifiants**

Porter la logique qui, sur un `401`, recharge la configuration distante et rejoue la requête une fois. **Adapter au contexte Firefox** : la page d'arrière-plan se décharge comme un service worker, donc le garde `ensureConfig` reste nécessaire avant chaque point d'entrée réseau.

- [ ] **Étape 4 : vérifier qu'aucun point d'entrée n'est oublié**

```bash
cd ~/dev/StreampulseFirefox && grep -n "api.twitch.tv\|id.twitch.tv" js/background.js
```

Chaque appel listé doit être précédé, dans sa fonction, d'un `await ensureConfig()`.

- [ ] **Étape 5 : contrôle manuel**

Recharger, ajouter une dizaine de streamers Twitch, ouvrir la console de l'extension et observer le sondage : attendu une seule requête Helix, pas une par chaîne.

- [ ] **Étape 6 : vérifier et committer**

```bash
cd ~/dev/StreampulseFirefox && npm run lint && npm test && npm run verify && git add -A && git commit -m "perf+fix: sondage Helix groupé et autoréparation des identifiants"
```

---

## Phase 4 : porter 26.9.21, YouTube et finitions

### Tâche 9 : ajouter YouTube comme troisième plateforme

**Fichiers :**
- Modifier : `js/platforms.js` (52 lignes d'écart)
- Modifier : `js/background.js` (résolution de chaîne et statut YouTube)
- Modifier : `manifest.json` (permission d'hôte `https://www.youtube.com/*`)
- Copier : `images/social/youtube.png` et `images/platforms/youtube.svg` depuis `$C`

**Interfaces :**
- Produit : `PLATFORM_DEFINITIONS.youtube` et `isYoutubeChannelId()`, consommés par la tâche 10.

- [ ] **Étape 1 : porter la définition de plateforme**

```bash
diff ~/dev/StreampulseFirefox/js/platforms.js ~/dev/StreamPulseExtension/js/platforms.js
```

Porter l'intégralité : `sanitizeYoutubeHandle`, `isYoutubeChannelId`, le bloc `youtube` de `PLATFORM_DEFINITIONS`, et la correction de la couleur Kick en `#53fc18`.

- [ ] **Étape 2 : copier les visuels**

```bash
cd ~/dev/StreampulseFirefox && mkdir -p images/platforms && cp ~/dev/StreamPulseExtension/images/social/youtube.png images/social/ && cp ~/dev/StreamPulseExtension/images/platforms/youtube.svg images/platforms/
```

- [ ] **Étape 3 : ajouter la permission d'hôte**

Dans `manifest.json`, ajouter `"https://www.youtube.com/*"` à `host_permissions`.

- [ ] **Étape 4 : porter la détection de live**

```bash
cd ~/dev/StreamPulseExtension && grep -n "getYoutubeStatus\|resolveYoutubeChannel\|loadYoutubeCache" js/background.js
```

Porter ces trois fonctions et leur cache. Elles n'utilisent que `fetch` et `chrome.storage.local` : aucune adaptation Firefox nécessaire.

- [ ] **Étape 5 : test unitaire de normalisation des handles**

Créer `tests/platforms-youtube.test.mjs` :

```js
import test from "node:test";
import assert from "node:assert/strict";
import { PLATFORM_DEFINITIONS, isYoutubeChannelId } from "../js/platforms.js";

const yt = PLATFORM_DEFINITIONS.youtube;

test("un handle @ est replié en minuscules", () => {
  assert.equal(yt.sanitizeHandle("@MaChaine"), "machaine");
});

test("un identifiant de chaîne UC garde sa casse", () => {
  const id = "UCabcdefghij1234567890";
  assert.equal(yt.sanitizeHandle(id), id);
  assert.ok(isYoutubeChannelId(id));
});

test("une URL collée est réduite au handle", () => {
  assert.equal(yt.sanitizeHandle("https://www.youtube.com/@MaChaine"), "machaine");
});

test("l'URL construite distingue handle et identifiant", () => {
  assert.equal(yt.buildUrl("@machaine"), "https://www.youtube.com/@machaine");
  assert.equal(
    yt.buildUrl("UCabcdefghij1234567890"),
    "https://www.youtube.com/channel/UCabcdefghij1234567890",
  );
});
```

- [ ] **Étape 6 : lancer le test et le voir échouer**

```bash
cd ~/dev/StreampulseFirefox && node --test tests/platforms-youtube.test.mjs
```

Attendu si l'étape 1 n'est pas faite : échec sur `yt` indéfini. Si le test passe du premier coup, vérifier qu'il importe bien le fichier modifié.

- [ ] **Étape 7 : lancer le test et le voir passer**

```bash
cd ~/dev/StreampulseFirefox && node --test tests/platforms-youtube.test.mjs
```

Attendu : 4 tests au vert.

- [ ] **Étape 8 : contrôle manuel**

Recharger, ajouter une chaîne YouTube en direct par son `@handle`, puis une autre en collant une URL `youtube.com/channel/UC…`. Attendu : les deux apparaissent avec titre, spectateurs et vignette.

- [ ] **Étape 9 : vérifier et committer**

```bash
cd ~/dev/StreampulseFirefox && npm run lint && npm test && npm run verify && git add -A && git commit -m "feat: YouTube comme troisième plateforme"
```

---

### Tâche 10 : interface, filtre et favoris hors ligne

**Fichiers :**
- Modifier : `html/popup.html` (pastille de filtre YouTube)
- Modifier : `js/popup.js` (288 lignes d'écart), `js/ui.js`, `js/popup-features.js`
- Modifier : `js/inject/sidebar-favorites.js` (partie laissée de côté en tâche 4)

**Interfaces :**
- Consomme : `PLATFORM_DEFINITIONS.youtube` de la tâche 9.

- [ ] **Étape 1 : ajouter la pastille de filtre**

Dans `html/popup.html`, juste après la pastille Kick du groupe `#platform-filter-group` :

```html
<button type="button" class="pf-btn" aria-pressed="false" data-filter="youtube" data-i18n="platforms.youtube">YouTube</button>
```

Ce bug était livré côté Chrome : les pastilles sont codées en dur alors que le sélecteur d'ajout est généré depuis `AVAILABLE_PLATFORMS`. Ne pas le reproduire ailleurs.

- [ ] **Étape 2 : porter le reste de l'interface**

```bash
diff ~/dev/StreampulseFirefox/js/popup.js ~/dev/StreamPulseExtension/js/popup.js | head -60
```

- [ ] **Étape 3 : porter le filtrage des favoris hors ligne**

```bash
cd ~/dev/StreamPulseExtension && git show 42c3cc9 -- js/inject/sidebar-favorites.js
```

- [ ] **Étape 4 : contrôle manuel**

Recharger, ouvrir la popup. Attendu : cinq pastilles de filtre (`Tout`, `Épinglés`, `Twitch`, `Kick`, `YouTube`), trois icônes dans la barre d'ajout, et le filtre YouTube n'affiche que les chaînes YouTube.

- [ ] **Étape 5 : vérifier et committer**

```bash
cd ~/dev/StreampulseFirefox && npm run lint && npm test && npm run verify && git add -A && git commit -m "feat: YouTube dans le filtre du tableau de bord et la barre d'ajout"
```

---

### Tâche 11 : amplification du volume, badge et textes

**Fichiers :**
- Modifier : `js/twitchPlayerEnhancer.js` (partie volume, laissée de côté en tâche 6)
- Modifier : `js/background.js` (classe `ActionBadge`)
- Modifier : `i18n/translations.js` (nouvelles clés et corrections)

**Interfaces :**
- Produit : `ActionBadge.render()`, unique écrivain du badge.

- [ ] **Étape 1 : porter l'amplification du volume**

```bash
cd ~/dev/StreamPulseExtension && grep -n "VOLUME_BOOST_FIELD" -A 4 js/twitchPlayerEnhancer.js | head -12
```

Porter le nœud de gain WebAudio, le bouton et ses interactions. `AudioContext` est disponible dans un content script Firefox : aucune adaptation.

- [ ] **Étape 2 : porter l'écrivain unique du badge**

Porter `ActionBadge.render()` et faire déléguer `syncUpdateBadge()`. La règle : le direct est prioritaire, la pastille des notes de version n'apparaît que si personne n'est en direct, et le compteur est persisté pour survivre au déchargement de la page d'arrière-plan.

- [ ] **Étape 3 : porter les corrections de textes**

Les clés `noChannelsBody` et les deux `emptyBody` étaient en anglais dans les langues non françaises, et trois `welcomeTagline` traduisaient « Chrome » comme le métal. Vérifier l'état du port :

```bash
cd ~/dev/StreampulseFirefox && grep -c "Type a handle or paste" i18n/translations.js
```

Attendu après correction : `2` (anglais seulement). Porter les traductions depuis `$C`. Attention : sur Firefox, la chaîne doit dire « Firefox » et non « Chrome » dans `preventTabDiscardDescription` et `welcomeTagline`.

- [ ] **Étape 4 : retirer les tirets cadratins**

```bash
cd ~/dev/StreampulseFirefox && grep -c "—" i18n/translations.js
```

Attendu après correction : `0`. Remplacer par deux-points. En français, garder l'espace avant les deux-points ; ne pas l'ajouter en anglais.

- [ ] **Étape 5 : régénérer les chaînes injectées**

```bash
cd ~/dev/StreampulseFirefox && node scripts/build-inline-i18n.mjs
```

- [ ] **Étape 6 : vérifier et committer**

```bash
cd ~/dev/StreampulseFirefox && npm run lint && npm test && npm run verify && git add -A && git commit -m "feat+fix: amplification du volume, badge à écrivain unique et textes corrigés"
```

---

### Tâche 12 : version, notes et documentation de la divergence

**Fichiers :**
- Modifier : `manifest.json`, `package.json` (version `26.9.21`)
- Modifier : `js/changelog-data.js` (entrées 26.9.19, .20, .21)
- Modifier : `BUILD.md` (section sur la divergence hls.js)

- [ ] **Étape 1 : aligner les deux versions**

```bash
cd ~/dev/StreampulseFirefox && grep -m1 '"version"' manifest.json package.json
```

Porter les deux à `26.9.21`. Côté Chrome, ces deux fichiers avaient dérivé : ne pas reproduire l'erreur.

- [ ] **Étape 2 : porter les notes de version manquantes**

Ajouter les entrées `26.9.19`, `26.9.20` et `26.9.21` en tête de `RELEASES`, dans les 11 langues, en retirant les quatre langues supprimées. **Retirer de l'entrée 26.9.21 la ligne sur les 354 Ko de hls.js** : elle décrit une optimisation qui n'existe pas dans ce port.

- [ ] **Étape 3 : documenter la divergence**

Ajouter à `BUILD.md` :

```markdown
## Divergence assumée avec le port Chrome

Chrome charge `js/vendor/hls.light.min.js` à la demande, par un `import()`
dynamique depuis le monde isolé, pour éviter 354 Ko sur chaque page Twitch.
Firefox ne supporte pas l'`import()` dynamique dans les content scripts : ce
port garde donc hls.js déclaré dans `content_scripts`. Conséquence directe,
il n'a besoin ni de la permission `scripting`, ni d'exposer hls.js dans
`web_accessible_resources`.

Ne pas « aligner » ce point sur Chrome sans avoir vérifié le support de
l'`import()` dans un content script Firefox.
```

- [ ] **Étape 4 : vérification complète**

```bash
cd ~/dev/StreampulseFirefox && npm run lint && npm test && npm run verify
```

Attendu : tout au vert, `verify` confirmant « notes de version présentes pour 26.9.21 » et « traduites dans les 11 langues publiées ».

- [ ] **Étape 5 : commit**

```bash
cd ~/dev/StreampulseFirefox && git add -A && git commit -m "release: 26.9.21

Notes de version pour 26.9.19, 26.9.20 et 26.9.21, et documentation de la
divergence hls.js avec le port Chrome."
```

---

### Tâche 13 : recette complète avant publication

**Fichiers :**
- Aucun. Recette manuelle et construction du paquet.

- [ ] **Étape 1 : construire le zip**

```bash
cd ~/dev/StreampulseFirefox && npm run build
```

Attendu : un `StreampulseFirefox_26.9.21.zip` dans `~/Desktop/dev/ZIPS/`.

- [ ] **Étape 2 : recette manuelle dans Firefox**

Charger le zip via `about:debugging` et parcourir la liste :

- [ ] la popup s'ouvre et liste les lives des trois plateformes
- [ ] le filtre propose cinq pastilles, dont YouTube, et filtre correctement
- [ ] la barre d'ajout montre trois icônes de plateforme
- [ ] ajouter une chaîne YouTube par handle, puis par URL de chaîne
- [ ] le badge affiche le nombre de streamers en direct, et le garde après un rechargement de l'extension
- [ ] sur Twitch : aperçu au survol animé, bouton d'amplification du volume, anti-pause au changement d'onglet
- [ ] les points de chaîne se récupèrent automatiquement
- [ ] changer la langue de l'extension et vérifier que rien ne reste en anglais dans la popup

- [ ] **Étape 3 : publier sur AMO**

Le script de publication vit dans le dépôt Chrome et lit le zip Firefox :

```bash
cd ~/dev/StreamPulseExtension && npm run publish:firefox
```

- [ ] **Étape 4 : mettre à jour la fiche AMO**

Contrairement au Chrome Web Store, l'API AMO v5 accepte les textes de la fiche. Les descriptions sont disponibles dans `~/Desktop/dev/ZIPS/chrome-kit/<LANGUE>/description.txt`. Remplacer « Chrome » par « Firefox » dans la ligne sur la mise en veille des onglets, une seule occurrence par langue.

- [ ] **Étape 5 : fusionner la branche**

```bash
cd ~/dev/StreampulseFirefox && git checkout main && git merge --no-ff port/26.9.21 -m "merge: portage vers 26.9.21"
```

---

## Ce que ce plan ne fait pas

- **Il ne porte pas l'`import()` dynamique de hls.js.** Firefox ne le supporte pas dans les content scripts. Si une version future de Firefox l'autorise, ce sera un chantier à part, avec sa propre vérification en conditions réelles.
- **Il ne crée pas de script de synchronisation entre les deux dépôts.** Ce serait tentant après quatre versions de dérive, mais les deux manifestes et quatre fichiers divergent volontairement : un script naïf les écraserait. Si la dérive redevient un problème, c'est un projet distinct.
- **Il ne touche pas aux captures ni aux tuiles du store Firefox.** Le dépôt a son propre `scripts/make-store-assets.mjs`, à traiter séparément une fois le code à niveau.
