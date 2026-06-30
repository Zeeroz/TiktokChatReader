# TikTok Live Viewer

Application Windows (Electron) pour suivre en temps réel un **live TikTok** : chat,
statistiques (spectateurs, likes, cadeaux, abonnés, partages…), cadeaux reçus et
classement des top donateurs. Possibilité d'**écrire dans le chat** si tu connectes ton compte.

> ⚠️ Outil **non officiel** basé sur la bibliothèque open-source
> [`tiktok-live-connector`](https://github.com/zerodytrash/TikTok-Live-Connector),
> qui « rétro-ingénie » le protocole privé de TikTok. C'est contraire aux CGU de TikTok et
> ça peut cesser de fonctionner si TikTok modifie son protocole. À utiliser de façon
> raisonnable, surtout pour l'envoi de messages (risque de blocage du compte si spam).

---

## Lancer l'application

### Option A — l'exécutable (recommandé)
Dans le dossier `dist/` :
- **`TikTokLiveViewer-1.0.0-portable.exe`** → double-clic, aucune installation.
- **`TikTokLiveViewer-Setup-1.0.0.exe`** → installe l'app + raccourci bureau.

> Au premier lancement, Windows SmartScreen peut afficher un avertissement
> (l'app n'est pas signée numériquement). Clique sur **« Informations complémentaires »
> → « Exécuter quand même »**. C'est normal pour une app perso non signée.

### Option B — en développement
```bash
npm install
npm start
```

---

## Utilisation

1. Tape le **@pseudo** d'un créateur **actuellement en live** puis clique **Connecter**.
2. Le chat, les statistiques et les cadeaux s'affichent en direct.
3. **Déconnecter** pour arrêter, ou change de pseudo pour suivre un autre live.

### Réglages (⚙ en haut à droite)

| Champ | À quoi ça sert |
|---|---|
| **Clé API Euler Stream** | Facultative en lecture, mais **recommandée** : augmente la limite de requêtes. Gratuite sur [eulerstream.com](https://www.eulerstream.com/). |
| **Cookie `sessionid`** | **Requis pour ENVOYER des messages.** C'est le cookie de session de ton compte TikTok. |
| **Cookie `tt-target-idc`** | Complète le `sessionid` pour l'envoi (ex. `useast2a`, `alisg`…). |

**Récupérer les cookies** : ouvre `tiktok.com` (connecté) → `F12` → onglet **Application** →
**Cookies** → `https://www.tiktok.com` → copie `sessionid` et `tt-target-idc`.

> 🔒 Ces valeurs restent **en local** sur ta machine (fichier `settings.json` dans le dossier
> de données de l'app) et ne sont envoyées qu'au serveur de signature pour authentifier l'envoi.

---

## Reconstruire les exécutables

```bash
npm run dist     # portable .exe + installeur NSIS (dossier dist/)
npm run pack     # build non empaqueté (dossier dist/win-unpacked, pour tester)
```

---

## Architecture

```
src/
  main/        Processus principal Electron
    main.js      Fenêtre, IPC, relais des événements, messages d'erreur clairs
    tiktok.js    Connexion à TikTok (import() dynamique de la lib ESM) + normalisation des événements
    store.js     Réglages persistés (clé Euler, sessionid…) en JSON
  preload/
    preload.js   Pont sécurisé (contextBridge) entre l'UI et le main
  renderer/      Interface
    index.html   Structure
    styles.css   Thème sombre
    renderer.js  Logique UI, agrégation des stats, rendu chat/cadeaux/donateurs
```

- **Lecture d'un live public = anonyme** : aucune connexion à TikTok requise.
- L'**envoi de messages** nécessite ton `sessionid` + une clé Euler.
- La signature de connexion passe par le serveur **Euler Stream** (palier gratuit suffisant pour un seul live).
