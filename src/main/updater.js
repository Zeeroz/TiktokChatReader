// Mise à jour automatique via electron-updater + GitHub Releases.
// Ne fonctionne QUE sur la version installée (NSIS), pas en dev ni en portable.
const { app } = require('electron');
const { autoUpdater } = require('electron-updater');

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // re-vérifie toutes les 30 min

function initAutoUpdate(getWindow) {
  // En développement (non empaqueté), electron-updater ne peut rien appliquer.
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const send = (payload) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send('update:status', payload);
  };

  autoUpdater.on('checking-for-update', () => send({ state: 'checking' }));
  autoUpdater.on('update-available', (info) => send({ state: 'available', version: info && info.version }));
  autoUpdater.on('update-not-available', () => send({ state: 'none' }));
  autoUpdater.on('download-progress', (p) => send({ state: 'downloading', percent: Math.round(p && p.percent || 0) }));
  autoUpdater.on('update-downloaded', (info) => send({ state: 'downloaded', version: info && info.version }));
  autoUpdater.on('error', (err) => send({ state: 'error', message: err ? (err.message || String(err)) : 'inconnue' }));

  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => { autoUpdater.checkForUpdates().catch(() => {}); }, CHECK_INTERVAL_MS);
}

// Vérification manuelle (bouton dans les réglages)
async function checkForUpdates() {
  if (!app.isPackaged) return { state: 'dev' };
  try {
    await autoUpdater.checkForUpdates();
    return { state: 'checking' };
  } catch (err) {
    return { state: 'error', message: err ? (err.message || String(err)) : 'inconnue' };
  }
}

function quitAndInstall() {
  if (!app.isPackaged) return;
  autoUpdater.quitAndInstall();
}

module.exports = { initAutoUpdate, checkForUpdates, quitAndInstall };
