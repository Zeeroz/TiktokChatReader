const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const store = require('./store');
const { TikTokService } = require('./tiktok');
const updater = require('./updater');

let win = null;
const service = new TikTokService();

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: '#0e0e13',
    title: 'TikTok Live Viewer',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.removeMenu();
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Ouvrir les liens externes (profils, etc.) dans le navigateur, jamais dans l'app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// --- Relais des événements du service vers le renderer ------------------------

function forward(channel, payload) {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
}
service.on('event', (p) => forward('tiktok:event', p));
service.on('status', (p) => forward('tiktok:status', p));

// --- Traduction des erreurs en messages clairs -------------------------------

function friendlyError(err) {
  const name = (err && (err.name || (err.constructor && err.constructor.name))) || '';
  const msg = (err && err.message) ? String(err.message) : String(err || '');
  const low = (name + ' ' + msg).toLowerCase();

  if (low.includes('useroffline') || low.includes('not live') || low.includes('offline')) {
    return "Ce créateur n'est pas en live actuellement.";
  }
  if (low.includes('invaliduniqueid') || low.includes('unique id') || low.includes('not found') || low.includes('user_not_found')) {
    return "Pseudo introuvable. Vérifie l'orthographe du @pseudo.";
  }
  if (low.includes('ratelimit') || low.includes('rate limit') || low.includes('429')) {
    return "Limite de requêtes atteinte. Ajoute une clé API Euler gratuite dans les réglages pour augmenter la limite.";
  }
  if (low.includes('sign') || low.includes('signature') || low.includes('500')) {
    return "Échec de la signature de connexion (serveur Euler). Réessaie dans un instant, ou ajoute une clé API Euler dans les réglages.";
  }
  if (low.includes('premium') || low.includes('payment') || low.includes('subscription')) {
    return "Cette action nécessite une clé Euler Stream payante.";
  }
  if (low.includes('session') || low.includes('cookie') || low.includes('unauthor') || low.includes('401')) {
    return "Action non autorisée : vérifie ton sessionid TikTok dans les réglages (requis pour envoyer des messages).";
  }
  return msg || 'Erreur inconnue';
}

// --- IPC ----------------------------------------------------------------------

ipcMain.handle('settings:get', () => store.load());

ipcMain.handle('settings:save', (_e, patch) => {
  return store.save(patch || {});
});

ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('update:check', () => updater.checkForUpdates());
ipcMain.handle('update:install', () => updater.quitAndInstall());

ipcMain.handle('tiktok:connect', async (_e, args) => {
  const username = args && args.username;
  try {
    const s = store.load();
    if (username) store.save({ lastUsername: String(username).trim() });
    const res = await service.connect(username, {
      signApiKey: s.signApiKey,
      sessionId: s.sessionId,
      ttTargetIdc: s.ttTargetIdc,
    });
    return { ok: true, ...res };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
});

ipcMain.handle('tiktok:disconnect', async () => {
  try {
    await service.disconnect();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
});

ipcMain.handle('tiktok:send', async (_e, args) => {
  try {
    await service.sendMessage(args && args.text);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
});

// --- Cycle de vie -------------------------------------------------------------

app.whenReady().then(() => {
  createWindow();
  updater.initAutoUpdate(() => win);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  try { await service.disconnect(); } catch {}
});
