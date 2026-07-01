# TikTok Live Viewer

Application Windows (Electron + React) pour suivre en temps réel un **live TikTok** :
chat, statistiques (spectateurs, likes, cadeaux, abonnés, partages…), cadeaux reçus et
classement des top donateurs. Possibilité d'**écrire dans le chat** en connectant ton compte
directement depuis l'app. Mises à jour automatiques via GitHub Releases.

> ⚠️ Outil **non officiel** basé sur la bibliothèque open-source
> [`tiktok-live-connector`](https://github.com/zerodytrash/TikTok-Live-Connector),
> qui « rétro-ingénie » le protocole privé de TikTok. C'est contraire aux CGU de TikTok et
> ça peut cesser de fonctionner si TikTok modifie son protocole. À utiliser de façon
> raisonnable, surtout pour l'envoi de messages (risque de blocage du compte si spam).

---

## Installer / lancer

### Option A — l'exécutable (recommandé)
Télécharge la dernière version depuis les
[**Releases GitHub**](https://github.com/Zeeroz/TiktokChatReader/releases) :
- **`TikTokLiveViewer-Setup-x.y.z.exe`** → installeur (raccourci bureau + **mises à jour auto**).
- **`TikTokLiveViewer-x.y.z-portable.exe`** → portable, double-clic, sans installation (pas d'auto-update).

> Au premier lancement, Windows SmartScreen peut afficher un avertissement (app non signée).
> Clique sur **« Informations complémentaires » → « Exécuter quand même »**.

### Option B — en développement
```bash
npm install
npm run dev     # serveur Vite + rechargement à chaud (dans un terminal)
# ou
npm start       # build du renderer puis lancement d'Electron
```

---

## Utilisation

1. Tape le **@pseudo** d'un créateur **actuellement en live** puis clique **Connecter**.
2. Le chat, les statistiques et les cadeaux s'affichent en direct.
3. **Déconnecter** pour arrêter, ou change de pseudo pour suivre un autre live.

### Bloquer / masquer quelqu'un

Survole un message dans le chat : deux boutons apparaissent.

- **⃠ Masquer dans l'app** : cache **localement** la personne (ses messages, cadeaux et
  événements disparaissent de ta fenêtre). Instantané, sans aucun risque. Gère la liste dans
  ⚙ Réglages → *Utilisateurs bloqués*.
- **Bloquer sur TikTok** : ouvre ton profil TikTok connecté et **bloque réellement** la
  personne sur ton compte (nécessite d'être connecté via ⚙ Réglages → *Se connecter à
  TikTok*). L'app pilote le vrai site pour cliquer « Bloquer » ; si le clic automatique
  échoue, la fenêtre reste ouverte pour finir en 1 clic.

> ⚠️ Le blocage TikTok effectue une **action automatisée sur ton compte**. TikTok peut
> sanctionner les actions automatisées — à utiliser avec parcimonie. Le masquage local, lui,
> est totalement sûr.

### Écrire dans le chat

Ouvre ⚙ **Réglages → « Se connecter à TikTok »** : une fenêtre de login TikTok s'ouvre,
tu te connectes normalement (QR code, e-mail…), et l'app récupère automatiquement ta session.
Aucun mot de passe ne transite par l'application.

> 💡 Alternative pour experts : ⚙ Réglages → *Avancé* permet de coller manuellement les
> cookies `sessionid` / `tt-target-idc`.
>
> 🔒 Ces valeurs restent **en local** (fichier `settings.json` dans le dossier de données de l'app).

### Clé Euler Stream (facultative)
Le serveur **Euler Stream** signe la connexion à TikTok. Le palier anonyme suffit pour un seul
live, mais une **clé gratuite** ([eulerstream.com](https://www.eulerstream.com/)) augmente les
limites — à coller dans ⚙ Réglages.

---

## Mises à jour

La version **installée** vérifie GitHub au démarrage : si une nouvelle Release existe, elle se
télécharge et une bannière propose de redémarrer pour l'installer.

**Publier une nouvelle version** (déclenche le build + la Release via GitHub Actions) :
```bash
npm version patch     # 1.1.0 -> 1.1.1 (+ commit + tag)
git push && git push --tags
```

---

## Scripts

```bash
npm run dev          # dev avec HMR (Vite)
npm start            # build renderer + Electron
npm run dist         # portable .exe + installeur NSIS (dossier dist/)
npm run pack         # build non empaqueté (dist/win-unpacked)
npm run release      # build + publication de la Release GitHub (CI)
node scripts/make-icon.mjs   # régénère l'icône .ico depuis le logo SVG
```

---

## Architecture

```
src/
  main/            Processus principal Electron (CommonJS)
    main.js          Fenêtre, IPC, login TikTok in-app, relais des événements
    tiktok.js        Connexion à TikTok (import() dynamique de la lib ESM) + normalisation
    updater.js       Mises à jour auto (electron-updater)
    store.js         Réglages persistés (JSON)
  preload/
    preload.js       Pont sécurisé (contextBridge)
  renderer/          Interface React (bundlée par Vite dans build/renderer)
    index.html
    src/
      App.jsx        Orchestration (connexion, statut, toasts, MAJ)
      components/    TopBar, ChatPanel, StatsPanel, GiftsPanel, DonorsPanel, SettingsModal…
      hooks/         useLiveData (agrégation throttlée du flux d'événements)
      lib/           formatage
build-resources/     logo.svg + icon.ico (icône de l'app)
.github/workflows/   release.yml (build + Release automatiques sur tag v*)
```

- **Lecture d'un live public = anonyme** : aucune connexion à TikTok requise.
- L'**envoi de messages** nécessite une session TikTok (connexion in-app) + une clé Euler.
- Le renderer est en **React** ; le main/preload restent en CommonJS (la lib TikTok ESM est
  chargée via `import()` dynamique).
