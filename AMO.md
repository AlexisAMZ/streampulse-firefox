# Fiche Add-ons Mozilla (AMO) : StreamPulse

> Guide de publication et métadonnées pour addons.mozilla.org

---

## 1. Informations Principales du Module

### Identifiant Unique (Gecko ID)
`streampulse@alexisamz.fr`

### Version
`26.9.9`

### Nom du module (FR)
`StreamPulse : Alertes, Points & Drops Twitch & Kick`

### Name (EN)
`StreamPulse: Twitch & Kick Alerts, Points & Drops`

### Résumé / Summary (FR - max 250 caractères)
`Collecte automatique des Points de chaîne et Drops, alertes de direct en temps réel, prévisualisations vidéo au survol et filtres de chat pour Twitch et Kick. Gratuit, sans compte et sans publicité.`

### Summary (EN - max 250 characters)
`Auto-claim Channel Points & Drops, real-time live stream alerts, hover stream previews, and chat filters for Twitch & Kick. Free, lightweight, no account needed.`

---

## 2. Description Détaillée (Description)

### Français (FR)
```text
StreamPulse est l'extension ultime pour optimiser votre expérience sur Twitch et Kick. Conçue pour être ultra-légère et rapide, elle centralise vos alertes et automatise vos actions sans ralentir votre navigateur.

✨ Entièrement traduite et disponible en 15 langues.

Fonctionnalités principales :
• Récolte automatique des Points & Drops : Récupération automatique en arrière-plan des points de chaîne Twitch, des récompenses Kick et des Twitch Drops dès qu'ils sont disponibles.
• Alertes Live en temps réel : Notifications natives sur votre bureau dès que vos streamers favoris démarrent leur live.
• Prévisualisations vidéo au survol : Prévisualisez un stream d'un simple survol avec la souris, sans quitter votre onglet.
• Panneau de contrôle Twitch & Intégration : Bouton d'ajout rapide directement intégré sur les chaînes et barre d'outils optimisée (latence réduite, anti-pause en arrière-plan).
• Filtre de Chat & Statistiques : Bloquez le spam grâce aux filtres par mots-clés et suivez votre temps de visionnage.
• Tableau de bord unifié : Un pop-up élégant regroupant Twitch et Kick pour voir qui est en direct d'un coup d'œil.

Respect absolu de la vie privée :
StreamPulse ne collecte AUCUNE donnée personnelle, ne nécessite AUCUN compte utilisateur et ne contient AUCUNE publicité ni tracker tiers.
```

### English (EN)
```text
StreamPulse is the all-in-one browser extension to elevate your Twitch and Kick experience. Ultra-lightweight and lightning fast, it automates your stream workflow without slowing down your browser.

✨ Fully localized in 15 languages.

Key Features:
• Auto-Claim Points & Drops: Automatically claims Twitch Channel Points, Kick rewards, and Twitch Drops in the background as you watch.
• Real-Time Live Alerts: Get instant desktop notifications the second your favorite streamers go live.
• Live Hover Previews: Preview any live channel just by hovering over a link, no tab switching required.
• Twitch Control Panel & Quick Follow: Add streamers directly from their channel and enjoy playback stability (anti-pause, low latency).
• Chat Filtering & Watch Time: Block spam using keywords and track your exact watch time.
• Unified Dashboard: A sleek popup bringing Twitch and Kick live streams together at a glance.

Privacy First:
StreamPulse collects ZERO personal data, requires NO account, and contains NO ads or third-party trackers.
```

---

## 3. Justification des Permissions (Reviewer Notes)

| Permission | Raison technique |
| :--- | :--- |
| `storage` | Sauvegarder localement la liste des streamers suivis, les statistiques de visionnage et les préférences utilisateur (`chrome.storage.local`). |
| `alarms` | Programmer la vérification périodique des statuts de direct en arrière-plan (`chrome.alarms`). |
| `notifications` | Afficher les alertes natives de bureau lorsqu'un streamer suivi passe en direct. |
| `tabs` | Détecter les onglets Twitch/Kick ouverts pour injecter les scripts d'optimisation et ouvrir les streams d'un clic. |
| `host_permissions` (`*.twitch.tv`, `*.kick.com`, `alexisamz.fr`) | Interroger les API publiques de direct Twitch & Kick, récupérer la configuration distante non sensible et permettre l'auto-claim des points/drops. |

---

## 4. Procédure de Build & Validation

Pour construire l'archive `.zip` prête à être téléversée sur AMO :

```bash
npm install
npm run verify
npm run build
```

L'archive finale sera générée dans `~/Desktop/dev/ZIPS/StreampulseFirefox_<version>.zip`.
