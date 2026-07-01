import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import GiftsPanel from './components/GiftsPanel.jsx';
import DonorsPanel from './components/DonorsPanel.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import UpdateBanner from './components/UpdateBanner.jsx';
import { useLiveData } from './hooks/useLiveData.js';

export default function App() {
  const [blocked, setBlocked] = useState([]);
  const blockedIds = useMemo(
    () => new Set(blocked.flatMap((b) => [b.id, b.uniqueId].filter(Boolean))),
    [blocked]
  );
  const live = useLiveData(blockedIds);

  const [username, setUsername] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatusState] = useState({ state: 'idle', text: 'Déconnecté' });
  const [uptime, setUptime] = useState(0);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [version, setVersion] = useState('');
  const [toast, setToast] = useState(null);
  const [update, setUpdate] = useState({ visible: false, text: '', ready: false });
  const [checkNote, setCheckNote] = useState({ text: '', kind: '' });

  const connectedRef = useRef(false);
  connectedRef.current = connected;
  const toastTimer = useRef(null);

  const setStatus = (state, text) => setStatusState({ state, text });

  const showToast = useCallback((msg, kind) => {
    setToast({ msg, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const tiktokConnected = !!(settings && (settings.tiktokConnected || settings.sessionId));

  // Chargement initial
  useEffect(() => {
    (async () => {
      try {
        const s = await window.api.getSettings();
        setSettings(s);
        setBlocked(s.blockedUsers || []);
        if (s.lastUsername) setUsername(s.lastUsername);
      } catch {}
      try {
        setVersion(await window.api.getVersion());
      } catch {}
    })();
  }, []);

  // Uptime
  useEffect(() => {
    if (!connected) {
      setUptime(0);
      return;
    }
    const start = Date.now();
    setUptime(0);
    const t = setInterval(() => setUptime(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const goLive = useCallback(() => {
    setConnected(true);
    setConnecting(false);
  }, []);

  const endConnection = useCallback(() => {
    setConnected(false);
    setConnecting(false);
  }, []);

  // Événements de statut
  useEffect(() => {
    const offStatus = window.api.onStatus((p) => {
      switch (p.type) {
        case 'connected':
          goLive();
          setStatus('live', 'En direct • @' + (p.username || username));
          break;
        case 'disconnected':
          if (connectedRef.current) {
            endConnection();
            setStatus('idle', 'Déconnecté');
          }
          break;
        case 'streamEnd':
          showToast('Le live est terminé.', 'ok');
          endConnection();
          setStatus('idle', 'Live terminé');
          break;
        case 'error':
          showToast(p.message || 'Erreur de connexion', 'err');
          break;
        default:
          break;
      }
    });

    const offUpdate = window.api.onUpdateStatus((p) => {
      switch (p.state) {
        case 'available':
          setUpdate({ visible: true, text: `Nouvelle version ${p.version || ''} — téléchargement…`, ready: false });
          setCheckNote({ text: 'Mise à jour trouvée…', kind: 'ok' });
          break;
        case 'downloading':
          setUpdate({ visible: true, text: `Téléchargement de la mise à jour… ${p.percent || 0}%`, ready: false });
          break;
        case 'downloaded':
          setUpdate({ visible: true, text: `Mise à jour ${p.version || ''} prête !`, ready: true });
          setCheckNote({ text: 'Prête à installer', kind: 'ok' });
          break;
        case 'none':
          setCheckNote({ text: 'Tu as déjà la dernière version ✓', kind: 'ok' });
          break;
        case 'error':
          setCheckNote({ text: 'Vérification impossible', kind: 'err' });
          break;
        default:
          break;
      }
    });

    const offLogin = window.api.onLogin(async (p) => {
      if (p && p.ok) {
        try {
          setSettings(await window.api.getSettings());
        } catch {}
        showToast('Compte TikTok connecté ✓', 'ok');
      } else if (p && p.cancelled) {
        showToast('Connexion TikTok annulée.', null);
      }
    });

    return () => {
      offStatus && offStatus();
      offUpdate && offUpdate();
      offLogin && offLogin();
    };
  }, [goLive, endConnection, showToast, username]);

  const onConnect = async () => {
    const u = username.trim().replace(/^@+/, '');
    if (!u) {
      showToast('Indique le @pseudo du créateur.', 'err');
      return;
    }
    setUsername(u);
    setConnecting(true);
    setStatus('connecting', 'Connexion…');
    live.reset();
    const res = await window.api.connect(u);
    if (!res || !res.ok) {
      setConnecting(false);
      setStatus('error', (res && res.error) || 'Échec');
      showToast((res && res.error) || 'Échec de la connexion', 'err');
      return;
    }
    goLive();
    setStatus('live', 'En direct • @' + u);
  };

  const onDisconnect = async () => {
    await window.api.disconnect();
    endConnection();
    setStatus('idle', 'Déconnecté');
  };

  const onSend = async (text, clear) => {
    const res = await window.api.sendMessage(text);
    if (res && res.ok) {
      clear();
      showToast('Message envoyé ✓', 'ok');
    } else {
      showToast((res && res.error) || "Échec de l'envoi", 'err');
    }
  };

  const saveSettings = async (patch) => {
    const next = await window.api.saveSettings(patch);
    setSettings(next);
  };

  const checkUpdate = async () => {
    setCheckNote({ text: 'Vérification…', kind: '' });
    const res = await window.api.checkUpdate();
    if (res && res.state === 'dev') setCheckNote({ text: '(MAJ actives seulement sur la version installée)', kind: '' });
    else if (res && res.state === 'error') setCheckNote({ text: 'Vérification impossible', kind: 'err' });
  };

  const loginTikTok = async () => {
    await window.api.loginTikTok();
    showToast('Fenêtre de connexion TikTok ouverte…', null);
  };

  const logoutTikTok = async () => {
    const next = await window.api.logoutTikTok();
    setSettings(next);
    showToast('Compte TikTok déconnecté.', 'ok');
  };

  const blockUser = useCallback(
    (user) => {
      if (!user || (!user.id && !user.uniqueId)) return;
      const already = blocked.some(
        (b) => (user.id && b.id === user.id) || (user.uniqueId && b.uniqueId === user.uniqueId)
      );
      if (already) return;
      const next = [...blocked, { id: user.id || '', uniqueId: user.uniqueId || '', name: user.name || user.uniqueId || 'Inconnu' }];
      setBlocked(next);
      window.api.saveSettings({ blockedUsers: next });
      showToast(`${user.name || '@' + user.uniqueId} bloqué`, null);
    },
    [blocked, showToast]
  );

  const unblockUser = useCallback(
    (key) => {
      const next = blocked.filter((b) => b.id !== key && b.uniqueId !== key);
      setBlocked(next);
      window.api.saveSettings({ blockedUsers: next });
    },
    [blocked]
  );

  return (
    <>
      <TopBar
        username={username}
        setUsername={setUsername}
        connected={connected}
        connecting={connecting}
        statusState={status.state}
        statusText={status.text}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="layout">
        <ChatPanel chat={live.chat} connected={connected} onSend={onSend} onBlock={blockUser} messageCount={live.stats.messages} />
        <aside className="sidecol">
          <StatsPanel stats={live.stats} uptime={uptime} connected={connected} />
          <GiftsPanel gifts={live.gifts} />
          <DonorsPanel donors={live.donors} />
        </aside>
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        tiktokConnected={tiktokConnected}
        onSave={saveSettings}
        onLoginTikTok={loginTikTok}
        onLogoutTikTok={logoutTikTok}
        blocked={blocked}
        onUnblock={unblockUser}
        version={version}
        checkNote={checkNote}
        onCheckUpdate={checkUpdate}
      />

      <UpdateBanner state={update} onInstall={() => window.api.installUpdate()} onDismiss={() => setUpdate((u) => ({ ...u, visible: false }))} />

      {toast && <div className={`toast ${toast.kind || ''}`}>{toast.msg}</div>}
    </>
  );
}
