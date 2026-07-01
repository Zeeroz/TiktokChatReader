// Persistance simple des réglages dans le dossier userData d'Electron.
// On évite electron-store (ESM) : un petit fichier JSON suffit largement.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const FILE = path.join(app.getPath('userData'), 'settings.json');

const DEFAULTS = {
  signApiKey: '',       // Clé API Euler Stream (facultative en lecture, conseillée)
  sessionId: '',        // Cookie sessionid TikTok (requis pour ENVOYER des messages)
  ttTargetIdc: '',      // Cookie tt-target-idc (ex: useast2a) — utile pour l'envoi
  tiktokConnected: false, // true quand le compte est connecté via la fenêtre de login
  lastUsername: '',     // Dernier @pseudo utilisé
};

function load() {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(patch) {
  const next = { ...load(), ...(patch || {}) };
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
  } catch {}
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

module.exports = { load, save, FILE };
