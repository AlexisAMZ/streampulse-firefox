# Organisation des assets : StreampulseFirefox

Produit : StreamPulse (port Firefox) · bibliothèque marketing : `~/dev/_Vault/StreamPulse/` · audit du 2026-10-29.
À lire avant de déplacer, renommer ou ajouter une image, une vidéo, un logo ou un texte de fiche.

## Où sont les ressources

- Captures de la fiche AMO : `images/cws_screenshots/<LANGUE>/` (15 langues, suivies par Git), générées par `npm run store:assets` (`scripts/make-store-assets.mjs`, `scripts/store-assets/`).
- Petite tuile : `images/promo/small_tile.png` (suivie).
- Logos : `images/photos/` ; plateformes : `images/platforms/`, `images/social/`.
- Marketing indépendant StreamPulse : `~/dev/_Vault/StreamPulse/` (commun à l'extension Chrome).

## À garder dans le dépôt (assets d'exécution)

- `images/social/*.png` : référencés par `js/platforms.js`.
- `images/photos/`, `images/icons/`, `images/platforms/` : chargés par l'extension.

## Ne pas déplacer ni restructurer sans audit des dépendances

- `images/cws_screenshots/` et `images/promo/` : sortie de `npm run store:assets`, lus par `~/dev/StreamPulseExtension/DevKit/scripts/publish-firefox-screenshots.mjs`. `scripts/build-zip.mjs` les exclut du zip.
- Le zip est écrit dans `~/Desktop/dev/ZIPS` (`STREAMPULSE_ZIP_DIR` pour changer).

## Exceptions constatées

- Rien n'a été déplacé : toutes les images sont suivies par Git ou lues par un script.
- Ce dépôt n'a pas de `DevKit/` : l'outillage de publication Firefox est dans `~/dev/StreamPulseExtension/DevKit/scripts/`.

## Règles durables

- Le code et les ressources nécessaires à l'exécution restent dans ce dépôt.
- Les ressources marketing indépendantes vont dans `~/dev/_Vault/StreamPulse/` (règles complètes : `~/dev/_Vault/MEMORY.md`).
- `~/dev/_Vault/_shared/` ne reçoit que ce qui sert réellement à plusieurs produits.
- Un fichier utilisé par le code, servi par URL ou écrit par un script n'est jamais déplacé ni renommé sans rechercher toutes ses références (code, CSS, HTML, scripts, `package.json`, docs, fichiers `*ignore`). Une recherche sans résultat ne prouve pas qu'il est inutilisé (chargement dynamique, URL publique) : dans le doute, il reste et on le note ici.
- Aucun fichier suivi par Git n'est sorti vers `_Vault` (non versionné : l'historique serait perdu).
- Langues dans `_Vault` : codes `fr-FR`, `en-US`, `de-DE`... uniquement pour les langues produites. Les kits générés dans le dépôt gardent leurs codes d'origine.
- Nommage : minuscules et tirets, préfixe `01-`, `02-` quand l'ordre compte, mêmes noms et même ordre entre les langues, dimensions en suffixe (`tile-440x280.png`), jamais `final`, `v2-new`, `copie`.
- Une ressource n'a qu'une copie modifiable. Toute copie volontaire est notée ici avec la copie qui fait foi.

## Ajouter une ressource marketing

1. Lue par le code, servie par le site ou produite par un script du dépôt ? Elle reste dans le dépôt, à l'emplacement listé ci-dessus.
2. Sinon : `~/dev/_Vault/StreamPulse/Brand/...` ou `~/dev/_Vault/StreamPulse/Marketing/<Canal>/<langue>/<Type>/`, puis mettre à jour `~/dev/_Vault/StreamPulse/MEMORY.md` (le créer s'il n'existe pas encore).
