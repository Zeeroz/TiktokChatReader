'use strict';

// ----------------------------- Raccourcis DOM --------------------------------
const $ = (id) => document.getElementById(id);

const usernameInput = $('username');
const connectBtn = $('connectBtn');
const statusPill = $('statusPill');
const statusText = $('statusText');

const chatFeed = $('chatFeed');
const chatCount = $('chatCount');
const autoscrollEl = $('autoscroll');

const giftFeed = $('giftFeed');
const giftCount = $('giftCount');
const donorsList = $('donorsList');

const messageInput = $('messageInput');
const sendBtn = $('sendBtn');

const settingsBtn = $('settingsBtn');
const settingsOverlay = $('settingsOverlay');
const settingsClose = $('settingsClose');
const settingsSave = $('settingsSave');
const settingsSaved = $('settingsSaved');
const setSignKey = $('setSignKey');
const setSessionId = $('setSessionId');
const setTtIdc = $('setTtIdc');

const toastEl = $('toast');

// Mise à jour
const updateBanner = $('updateBanner');
const updateText = $('updateText');
const updateInstallBtn = $('updateInstallBtn');
const updateDismiss = $('updateDismiss');
const appVersion = $('appVersion');
const checkUpdateBtn = $('checkUpdateBtn');
const updateCheckNote = $('updateCheckNote');

// Compteurs de stats
const elViewers = $('statViewers');
const elLikes = $('statLikes');
const elDiamonds = $('statDiamonds');
const elGifts = $('statGifts');
const elMessages = $('statMessages');
const elFollows = $('statFollows');
const elShares = $('statShares');
const elJoins = $('statJoins');
const elUptime = $('statUptime');

// ------------------------------- État ----------------------------------------
let isConnected = false;
let currentUser = '';
let uptimeTimer = null;
let uptimeStart = 0;

const stats = {
  viewers: 0, likesReported: 0, likesCounted: 0,
  diamonds: 0, gifts: 0, messages: 0, follows: 0, shares: 0, joins: 0,
};
const donors = new Map(); // userId -> { name, avatar, diamonds }

// ----------------------------- Utilitaires -----------------------------------
function fmt(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(Math.round(n));
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function avatarEl(url, extraCls) {
  const a = el('div', 'avatar' + (extraCls ? ' ' + extraCls : ''));
  if (url) a.style.backgroundImage = `url("${url}")`;
  return a;
}

function clearChildren(node) { while (node.firstChild) node.removeChild(node.firstChild); }

function isNearBottom(node) {
  return node.scrollHeight - node.scrollTop - node.clientHeight < 90;
}

function trimFeed(node, max) {
  while (node.childElementCount > max) node.removeChild(node.firstElementChild);
}

let toastTimer = null;
function toast(msg, kind) {
  toastEl.textContent = msg;
  toastEl.className = 'toast' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 4200);
}

// ------------------------ Rendu du chat (par lots) ---------------------------
const chatQueue = [];
let chatFlushScheduled = false;

function queueChatNode(node) {
  chatQueue.push(node);
  if (!chatFlushScheduled) {
    chatFlushScheduled = true;
    requestAnimationFrame(flushChat);
  }
}

function flushChat() {
  chatFlushScheduled = false;
  if (!chatQueue.length) return;
  const stick = autoscrollEl.checked && isNearBottom(chatFeed);
  const frag = document.createDocumentFragment();
  for (const n of chatQueue) frag.appendChild(n);
  chatQueue.length = 0;
  removeEmptyState(chatFeed);
  chatFeed.appendChild(frag);
  trimFeed(chatFeed, 250);
  if (stick) chatFeed.scrollTop = chatFeed.scrollHeight;
}

function removeEmptyState(node) {
  const es = node.querySelector('.empty-state');
  if (es) es.remove();
}

// ------------------------------ Événements -----------------------------------
function onChat(d) {
  stats.messages++;
  elMessages.textContent = fmt(stats.messages);

  const line = el('div', 'chat-line');
  line.appendChild(avatarEl(d.user.avatar));
  const body = el('div', 'chat-body');
  const name = el('span', 'chat-name', d.user.name);
  if (d.user.verified) {
    const v = el('span', 'verified', ' ✔');
    name.appendChild(v);
  }
  body.appendChild(name);
  body.appendChild(el('span', 'chat-text', d.content));
  line.appendChild(body);
  queueChatNode(line);

  chatCount.textContent = fmt(stats.messages);
}

function sysLine(kind, who, action) {
  const line = el('div', 'sys-line ' + kind);
  line.appendChild(el('span', 'who', who));
  line.appendChild(el('span', null, ' ' + action));
  queueChatNode(line);
}

function onGift(d) {
  // On ne compte (et n'affiche) qu'à la fin d'un combo pour ne pas compter en double.
  if (d.streakInProgress) return;

  stats.gifts++;
  stats.diamonds += d.diamondsTotal;
  elGifts.textContent = fmt(stats.gifts);
  elDiamonds.textContent = fmt(stats.diamonds);

  // Donateurs (cumul de la session)
  if (d.diamondsTotal > 0 && d.user && d.user.id) {
    const cur = donors.get(d.user.id) || { name: d.user.name, avatar: d.user.avatar, diamonds: 0 };
    cur.diamonds += d.diamondsTotal;
    cur.name = d.user.name;
    cur.avatar = d.user.avatar;
    donors.set(d.user.id, cur);
    scheduleDonors();
  }

  // Carte cadeau (la plus récente en haut)
  removeEmptyState(giftFeed);
  const card = el('div', 'gift-card');
  card.appendChild(giftImgEl(d.giftImage));
  const info = el('div', 'gift-info');
  info.appendChild(el('div', 'gift-who', d.user.name));
  info.appendChild(el('div', 'gift-name', d.giftName));
  card.appendChild(info);
  const meta = el('div', 'gift-meta');
  meta.appendChild(el('div', 'gift-count', '×' + d.count));
  if (d.diamondsTotal > 0) meta.appendChild(el('div', 'gift-dia', '💎 ' + fmt(d.diamondsTotal)));
  card.appendChild(meta);

  giftFeed.insertBefore(card, giftFeed.firstChild);
  while (giftFeed.childElementCount > 60) giftFeed.removeChild(giftFeed.lastElementChild);

  giftCount.textContent = fmt(stats.gifts);
}

function giftImgEl(url) {
  const g = el('div', 'gift-img');
  if (url) g.style.backgroundImage = `url("${url}")`;
  return g;
}

function onLike(d) {
  stats.likesCounted += d.count;
  if (d.totalLikes) stats.likesReported = Math.max(stats.likesReported, d.totalLikes);
  elLikes.textContent = fmt(Math.max(stats.likesReported, stats.likesCounted));
}

function onViewers(d) {
  stats.viewers = d.viewerCount;
  elViewers.textContent = fmt(stats.viewers);
}

function onFollow(d) {
  stats.follows++;
  elFollows.textContent = fmt(stats.follows);
  sysLine('follow', d.user.name, "vient de s'abonner ❤");
}

function onShare(d) {
  stats.shares++;
  elShares.textContent = fmt(stats.shares);
  sysLine('share', d.user.name, 'a partagé le live 🔗');
}

function onSubscribe(d) {
  sysLine('sub', d.user.name, "s'est abonné(e) ⭐");
}

function onMember() {
  stats.joins++;
  elJoins.textContent = fmt(stats.joins);
}

// ------------------------ Rendu des donateurs --------------------------------
let donorsScheduled = false;
function scheduleDonors() {
  if (donorsScheduled) return;
  donorsScheduled = true;
  requestAnimationFrame(renderDonors);
}
function renderDonors() {
  donorsScheduled = false;
  const top = [...donors.values()].sort((a, b) => b.diamonds - a.diamonds).slice(0, 8);
  clearChildren(donorsList);
  if (!top.length) {
    donorsList.appendChild(el('div', 'empty-state small', "Personne pour l'instant."));
    return;
  }
  top.forEach((d, i) => {
    const row = el('div', 'donor');
    row.appendChild(el('div', 'donor-rank', '#' + (i + 1)));
    row.appendChild(avatarEl(d.avatar, 'sm'));
    row.appendChild(el('div', 'donor-name', d.name));
    row.appendChild(el('div', 'donor-dia', '💎 ' + fmt(d.diamonds)));
    donorsList.appendChild(row);
  });
}

// ----------------------- Dispatcher d'événements -----------------------------
window.api.onEvent((p) => {
  switch (p.kind) {
    case 'chat': onChat(p); break;
    case 'gift': onGift(p); break;
    case 'like': onLike(p); break;
    case 'viewers': onViewers(p); break;
    case 'follow': onFollow(p); break;
    case 'share': onShare(p); break;
    case 'subscribe': onSubscribe(p); break;
    case 'member': onMember(p); break;
  }
});

window.api.onStatus((p) => {
  switch (p.type) {
    case 'connected':
      setLive();
      break;
    case 'disconnected':
      if (isConnected) {
        setStatus('idle', 'Déconnecté');
        finishDisconnect();
      }
      break;
    case 'streamEnd':
      toast('Le live est terminé.', 'ok');
      setStatus('idle', 'Live terminé');
      finishDisconnect();
      break;
    case 'error':
      toast(p.message || 'Erreur de connexion', 'err');
      break;
  }
});

// ------------------------------ Connexion ------------------------------------
function setStatus(state, text) {
  statusPill.className = 'status-pill status-' + state;
  statusText.textContent = text;
}

function setLive() {
  if (!isConnected) {
    isConnected = true;
    startUptime();
    enableSend(true);
    updateConnectBtn();
  }
  setStatus('live', 'En direct • @' + currentUser);
}

function finishDisconnect() {
  isConnected = false;
  stopUptime();
  enableSend(false);
  updateConnectBtn();
}

function updateConnectBtn() {
  connectBtn.textContent = isConnected ? 'Déconnecter' : 'Connecter';
  connectBtn.classList.toggle('connected', isConnected);
}

function resetStats() {
  Object.assign(stats, {
    viewers: 0, likesReported: 0, likesCounted: 0,
    diamonds: 0, gifts: 0, messages: 0, follows: 0, shares: 0, joins: 0,
  });
  donors.clear();
  elViewers.textContent = '—';
  [elLikes, elDiamonds, elGifts, elMessages, elFollows, elShares, elJoins].forEach((e) => e.textContent = '0');
  chatCount.textContent = '0';
  giftCount.textContent = '0';
}

function clearFeeds() {
  clearChildren(chatFeed);
  chatFeed.appendChild(el('div', 'empty-state', 'En attente des premiers messages…'));
  clearChildren(giftFeed);
  giftFeed.appendChild(el('div', 'empty-state small', 'Les cadeaux apparaîtront ici.'));
  renderDonors();
}

async function doConnect() {
  const u = usernameInput.value.trim().replace(/^@+/, '');
  if (!u) { toast('Indique le @pseudo du créateur.', 'err'); return; }

  currentUser = u;
  setStatus('connecting', 'Connexion…');
  connectBtn.disabled = true;
  resetStats();
  clearFeeds();

  const res = await window.api.connect(u);
  connectBtn.disabled = false;

  if (!res || !res.ok) {
    setStatus('error', (res && res.error) || 'Échec');
    toast((res && res.error) || 'Échec de la connexion', 'err');
    isConnected = false;
    updateConnectBtn();
    return;
  }
  setLive();
}

async function doDisconnect() {
  connectBtn.disabled = true;
  await window.api.disconnect();
  connectBtn.disabled = false;
  setStatus('idle', 'Déconnecté');
  finishDisconnect();
}

function enableSend(on) {
  messageInput.disabled = !on;
  sendBtn.disabled = !on;
  messageInput.placeholder = on
    ? 'Écris un message dans le chat…'
    : 'Connecte-toi pour écrire dans le chat…';
}

async function doSend() {
  const text = messageInput.value.trim();
  if (!text || !isConnected) return;
  sendBtn.disabled = true;
  const res = await window.api.sendMessage(text);
  sendBtn.disabled = false;
  if (res && res.ok) {
    messageInput.value = '';
    toast('Message envoyé ✓', 'ok');
  } else {
    toast((res && res.error) || "Échec de l'envoi", 'err');
  }
  messageInput.focus();
}

// ------------------------------- Uptime --------------------------------------
function startUptime() {
  uptimeStart = Date.now();
  stopUptime();
  uptimeTimer = setInterval(tickUptime, 1000);
  tickUptime();
}
function stopUptime() {
  if (uptimeTimer) { clearInterval(uptimeTimer); uptimeTimer = null; }
}
function tickUptime() {
  const s = Math.floor((Date.now() - uptimeStart) / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (x) => String(x).padStart(2, '0');
  elUptime.textContent = (hh > 0 ? pad(hh) + ':' : '') + pad(mm) + ':' + pad(ss);
}

// ------------------------------ Réglages -------------------------------------
async function openSettings() {
  const s = await window.api.getSettings();
  setSignKey.value = s.signApiKey || '';
  setSessionId.value = s.sessionId || '';
  setTtIdc.value = s.ttTargetIdc || '';
  settingsSaved.textContent = '';
  settingsOverlay.classList.remove('hidden');
}
function closeSettings() { settingsOverlay.classList.add('hidden'); }

async function saveSettings() {
  await window.api.saveSettings({
    signApiKey: setSignKey.value.trim(),
    sessionId: setSessionId.value.trim(),
    ttTargetIdc: setTtIdc.value.trim(),
  });
  settingsSaved.textContent = 'Enregistré ✓';
  setTimeout(() => { settingsSaved.textContent = ''; }, 2000);
}

// ------------------------------ Mise à jour ----------------------------------
function showUpdateBanner(text, ready) {
  updateText.textContent = text;
  updateInstallBtn.classList.toggle('hidden', !ready);
  updateBanner.classList.remove('hidden');
}

window.api.onUpdateStatus((p) => {
  switch (p.state) {
    case 'available':
      showUpdateBanner(`Nouvelle version ${p.version || ''} disponible — téléchargement…`, false);
      setCheckNote('Mise à jour trouvée…', 'ok');
      break;
    case 'downloading':
      showUpdateBanner(`Téléchargement de la mise à jour… ${p.percent || 0}%`, false);
      break;
    case 'downloaded':
      showUpdateBanner(`Mise à jour ${p.version || ''} prête à être installée !`, true);
      setCheckNote('Prête à installer', 'ok');
      break;
    case 'none':
      setCheckNote('Tu as déjà la dernière version ✓', 'ok');
      break;
    case 'error':
      setCheckNote('Vérification impossible', 'err');
      break;
  }
});

function setCheckNote(text, kind) {
  updateCheckNote.textContent = text;
  updateCheckNote.className = 'update-check-note' + (kind ? ' ' + kind : '');
}

async function manualCheck() {
  setCheckNote('Vérification…', '');
  const res = await window.api.checkUpdate();
  if (res && res.state === 'dev') setCheckNote('(Mises à jour actives seulement sur la version installée)', '');
  else if (res && res.state === 'error') setCheckNote('Vérification impossible', 'err');
}

// ------------------------------- Câblage UI ----------------------------------
connectBtn.addEventListener('click', () => (isConnected ? doDisconnect() : doConnect()));
usernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !isConnected) doConnect(); });
sendBtn.addEventListener('click', doSend);
messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSend(); });

settingsBtn.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsSave.addEventListener('click', saveSettings);
checkUpdateBtn.addEventListener('click', manualCheck);
updateInstallBtn.addEventListener('click', () => window.api.installUpdate());
updateDismiss.addEventListener('click', () => updateBanner.classList.add('hidden'));
settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) closeSettings(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSettings(); });

// ------------------------------ Initialisation -------------------------------
(async function init() {
  try {
    const s = await window.api.getSettings();
    if (s.lastUsername) usernameInput.value = s.lastUsername;
  } catch {}
  try {
    const v = await window.api.getVersion();
    if (v) appVersion.textContent = v;
  } catch {}
  updateConnectBtn();
})();
