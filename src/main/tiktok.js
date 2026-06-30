// Wrapper autour de tiktok-live-connector (v2, ESM).
// Le main process Electron est en CommonJS, donc on charge la lib via import() dynamique.
// On normalise chaque événement TikTok en un objet simple et léger envoyé au renderer.
const { EventEmitter } = require('events');

let libPromise = null;
function getLib() {
  // Import dynamique d'un module ESM depuis du CommonJS.
  if (!libPromise) libPromise = import('tiktok-live-connector');
  return libPromise;
}

// --- Normalisation des structures protobuf en objets simples ------------------

function firstUrl(image) {
  return image && Array.isArray(image.urlList) && image.urlList.length
    ? image.urlList[0]
    : null;
}

function normUser(u) {
  if (!u) return { id: '', name: 'Inconnu', uniqueId: '', avatar: null, verified: false };
  return {
    id: String(u.id || ''),
    name: u.nickname || u.displayId || 'Inconnu',
    uniqueId: u.displayId || '',
    avatar: firstUrl(u.avatarThumb) || firstUrl(u.avatarMedium),
    verified: !!u.verified,
  };
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

class TikTokService extends EventEmitter {
  constructor() {
    super();
    this.connection = null;
    this.username = null;
    this.roomId = null;
  }

  get isConnected() {
    return !!(this.connection && this.connection.isConnected);
  }

  async connect(username, creds = {}) {
    if (!username || !String(username).trim()) {
      throw new Error('Indique le @pseudo du créateur.');
    }
    if (this.connection) await this.disconnect();

    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = await getLib();
    const { signApiKey, sessionId, ttTargetIdc } = creds;

    const options = {
      processInitialData: true,
      fetchRoomInfoOnConnect: true,   // lève UserOfflineError si le créateur n'est pas en live
      enableExtendedGiftInfo: false,  // évite un appel réseau supplémentaire au moment du connect
    };
    if (signApiKey) options.signApiKey = signApiKey;
    if (sessionId) {
      // Bundle de session : permet d'ENVOYER des messages (et d'accéder aux events authentifiés).
      options.session = {
        cookie: {
          type: 'cookie',
          value: { sessionId, ttTargetIdc: ttTargetIdc || '' },
        },
      };
    }

    const conn = new TikTokLiveConnection(String(username).trim(), options);
    this.connection = conn;
    this.username = String(username).trim();
    this._wire(conn, WebcastEvent, ControlEvent);

    await conn.connect();
    this.roomId = conn.roomId;

    return {
      roomId: conn.roomId,
      username: this.username,
    };
  }

  async disconnect() {
    const conn = this.connection;
    this.connection = null;
    this.username = null;
    this.roomId = null;
    if (conn) {
      try { conn.removeAllListeners(); } catch {}
      try { await conn.disconnect(); } catch {}
    }
  }

  async sendMessage(text) {
    if (!this.connection || !this.isConnected) {
      throw new Error('Non connecté à un live.');
    }
    const content = String(text || '').trim();
    if (!content) throw new Error('Message vide.');
    return this.connection.sendMessage(content);
  }

  // --- Câblage des événements -------------------------------------------------

  _wire(conn, WebcastEvent, ControlEvent) {
    const emit = (payload) => this.emit('event', payload);

    conn.on(WebcastEvent.CHAT, (d) => emit({
      kind: 'chat',
      user: normUser(d.user),
      content: d.content || '',
    }));

    conn.on(WebcastEvent.GIFT, (d) => {
      const giftType = d.gift && typeof d.gift.type === 'number' ? d.gift.type : null;
      const repeatEnd = d.repeatEnd === 1 || d.repeatEnd === true;
      // Pour les cadeaux « combo » (type 1), on n'additionne qu'à la fin du streak
      // afin de ne pas compter plusieurs fois les mêmes diamants.
      const streakInProgress = giftType === 1 && !repeatEnd;
      const count = toNumber(d.repeatCount) || 1;
      const diamondsEach = d.gift ? toNumber(d.gift.diamondCount) : 0;
      emit({
        kind: 'gift',
        user: normUser(d.user),
        giftId: String(d.giftId || (d.gift && d.gift.id) || ''),
        giftName: (d.gift && d.gift.name) || 'Cadeau',
        giftImage: d.gift ? (firstUrl(d.gift.image) || firstUrl(d.gift.icon)) : null,
        count,
        diamondsEach,
        diamondsTotal: diamondsEach * count,
        streakInProgress,
      });
    });

    conn.on(WebcastEvent.LIKE, (d) => emit({
      kind: 'like',
      user: normUser(d.user),
      count: toNumber(d.count),
      totalLikes: toNumber(d.total),
    }));

    conn.on(WebcastEvent.MEMBER, (d) => emit({
      kind: 'member',
      user: normUser(d.user),
    }));

    conn.on(WebcastEvent.FOLLOW, (d) => emit({
      kind: 'follow',
      user: normUser(d.user),
      followCount: toNumber(d.followCount) || null,
    }));

    conn.on(WebcastEvent.SHARE, (d) => emit({
      kind: 'share',
      user: normUser(d.user),
    }));

    conn.on(WebcastEvent.ROOM_USER, (d) => emit({
      kind: 'viewers',
      viewerCount: toNumber(d.total) || toNumber(d.totalUser),
      top: Array.isArray(d.ranks)
        ? d.ranks.slice(0, 8).map((r) => ({
            user: normUser(r.user),
            score: toNumber(r.score),
            rank: toNumber(r.rank),
          }))
        : [],
    }));

    // Abonnements (subs) — événement présent dans l'énumération, peut ne jamais se déclencher.
    try {
      conn.on(WebcastEvent.SUB_NOTIFY, (d) => emit({
        kind: 'subscribe',
        user: normUser(d.user),
      }));
    } catch {}

    // --- Événements de contrôle ---
    const status = (payload) => this.emit('status', payload);

    conn.on(ControlEvent.CONNECTED, () => status({ type: 'connected', roomId: conn.roomId, username: this.username }));
    conn.on(ControlEvent.DISCONNECTED, (d) => status({ type: 'disconnected', code: d && d.code, reason: d && d.reason }));
    conn.on(ControlEvent.ERROR, (err) => status({ type: 'error', message: errMessage(err) }));
    conn.on(WebcastEvent.STREAM_END, () => status({ type: 'streamEnd' }));
  }
}

function errMessage(err) {
  if (!err) return 'Erreur inconnue';
  return err.message || String(err);
}

module.exports = { TikTokService };
