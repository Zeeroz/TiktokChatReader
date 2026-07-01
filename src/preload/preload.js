// Pont sécurisé entre le renderer (sans accès Node) et le main process.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  connect: (username) => ipcRenderer.invoke('tiktok:connect', { username }),
  disconnect: () => ipcRenderer.invoke('tiktok:disconnect'),
  sendMessage: (text) => ipcRenderer.invoke('tiktok:send', { text }),

  loginTikTok: () => ipcRenderer.invoke('tiktok:login'),
  logoutTikTok: () => ipcRenderer.invoke('tiktok:logout'),
  onLogin: (cb) => {
    const handler = (_e, payload) => cb(payload);
    ipcRenderer.on('tiktok:login', handler);
    return () => ipcRenderer.removeListener('tiktok:login', handler);
  },

  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),

  getVersion: () => ipcRenderer.invoke('app:version'),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (cb) => {
    const handler = (_e, payload) => cb(payload);
    ipcRenderer.on('update:status', handler);
    return () => ipcRenderer.removeListener('update:status', handler);
  },

  // Renvoie une fonction de désinscription.
  onEvent: (cb) => {
    const handler = (_e, payload) => cb(payload);
    ipcRenderer.on('tiktok:event', handler);
    return () => ipcRenderer.removeListener('tiktok:event', handler);
  },
  onStatus: (cb) => {
    const handler = (_e, payload) => cb(payload);
    ipcRenderer.on('tiktok:status', handler);
    return () => ipcRenderer.removeListener('tiktok:status', handler);
  },
});
