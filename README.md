<h1 align="center">
  <img src="https://www.streampulse.fr/assets/icons/icon128.png" alt="StreamPulse Icon" width="128"><br>
  StreamPulse — Twitch &amp; Kick Firefox Extension
</h1>

<h4 align="center">Live alerts, Channel Points, Drops and viewing comfort — without touching your chat.</h4>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-privacy">Privacy</a> •
  <a href="#-building-from-source">Build</a> •
  <a href="https://www.streampulse.fr/">Website</a>
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-26.9.9-9146FF">
  <img alt="Firefox" src="https://img.shields.io/badge/Firefox-115%2B-FF7139">
  <img alt="Manifest" src="https://img.shields.io/badge/manifest-v3-informational">
</p>

---

**StreamPulse** is a browser extension for Twitch and Kick viewers. It automates repetitive
tasks — clicking Channel Points, claiming Drops — and keeps you up to date on your streamers,
without altering the chat itself.

It sits alongside **BetterTTV**, **FrankerFaceZ** and **7TV** rather than competing with them:
they handle emotes and chat, StreamPulse handles rewards, alerts and player comfort.

## ✨ Features

**Alerts and tracking**
- Desktop notifications the moment a tracked streamer goes live, on **Twitch** or **Kick**
- Category-change alerts
- Watch time tracked per channel, kept on your machine

**Automation**
- Auto-claim Channel Points, with the tab in the background
- Auto-claim Twitch **Drops** and **Moments**
- Auto-reload on player errors `#1000` to `#5000`
- Anti-pause: keeps the stream alive when you switch tabs

**On the Twitch page**
- **Top-bar panel**: time spent on the channel you are watching, a one-click follow, quick
  toggles, and your streamers currently live
- **Hover previews** on the sidebar, directory, clips and search — image or live video,
  in three sizes
- **Community badge**: a StreamPulse mark next to fellow users in chat, tinted to the
  username colour, the Twitch theme, or a colour of your choice
- Fast-forward button to catch up to the live edge
- Chat keyword filtering, automatic raid cancelling, Twitch extension hiding

**Interface**
- 16 languages
- Light and dark themes

## 🚀 Installation

Firefox 115 or later. Install from **[addons.mozilla.org](https://addons.mozilla.org/)** —
no account, no sign-in.

Chrome, Brave, Opera and other Chromium browsers use a separate build:
[streampulse-extension](https://github.com/AlexisAMZ/streampulse-extension).

## 🔒 Privacy

Your streamer list, preferences, watch time and points **stay in your browser** and are never
uploaded.

Two exchanges leave your machine:

1. Calls to the **public Twitch and Kick APIs**, to know who is live.
2. If the **community badge** is enabled, a fingerprint of your Twitch username — a salted,
   truncated SHA-256 computed locally. The username itself is never transmitted, and the
   public list contains no readable names.

We do not present that fingerprint as anonymous: the salt ships inside the extension, so a
third party who already suspects a specific username can compute its fingerprint and check
whether it is present. It is **pseudonymous data**, handled as personal data — which is why
the manifest declares `personallyIdentifyingInfo`. The badge can be turned off at any time in
**Settings → Chat → Community badge**.

Full policy: **[streampulse.fr/privacy](https://www.streampulse.fr/privacy)**

## 🛠 Building from source

No transpilation, no bundler: plain ES modules, HTML and CSS. The only third-party minified
file is `js/vendor/hls.light.min.js`, the official HLS.js v1.5.8 release.

```bash
npm install        # linter and verification tooling only
npm run lint       # ESLint
npm test           # unit tests (node --test, no framework)
npm run verify     # 16 packaging and i18n checks
npm run build      # lint + test + zip into ~/Desktop/dev/ZIPS
```

`BUILD.md` documents the exact reproduction steps for Mozilla reviewers.

### Layout

| Path | Role |
|---|---|
| `js/background.js` | Event page: polling, notifications, preferences |
| `js/popup.js`, `js/ui.js` | Popup and streamer cards |
| `js/inject/` | Content scripts: top bar, quick follow, chat badge |
| `js/previews/` | Hover preview card, sources and observers |
| `i18n/translations.js` | Single source for all 16 languages |
| `scripts/verify.mjs` | Pre-packaging checks |

## ❓ FAQ

**Is it free?** Yes, and ad-free.

**Does it replace BetterTTV or 7TV?** No. They handle emotes and chat rendering; StreamPulse
handles rewards, alerts and player behaviour. They work together.

**Why Manifest V3 on Firefox?** Firefox supports MV3 with an event page instead of a service
worker, which is why the background section and audio handling differ from the Chromium build.

## 🔗 Links

- Website — [streampulse.fr](https://www.streampulse.fr/)
- Chrome build — [Chrome Web Store](https://chromewebstore.google.com/detail/streampulse-multi-streame/ipfhbfabadbpkjimhdcjadopnahdpddh)
- Support — [streampulse.fr/support](https://www.streampulse.fr/support)
- Developer — AlexisAMZ
