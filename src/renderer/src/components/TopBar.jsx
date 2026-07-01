import { Settings, Plug, PlugZap, Radio } from 'lucide-react';
import Logo from './Logo.jsx';

export default function TopBar({
  username,
  setUsername,
  connected,
  connecting,
  statusState,
  statusText,
  onConnect,
  onDisconnect,
  onOpenSettings,
}) {
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !connected && !connecting) onConnect();
  };

  return (
    <header className="topbar">
      <div className="brand">
        <Logo size={28} />
        <span className="brand-name">TikTok Live Viewer</span>
      </div>

      <div className="connect-box">
        <span className="at">@</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="pseudo du créateur"
          spellCheck={false}
          autoComplete="off"
          disabled={connected}
        />
        {connected ? (
          <button className="btn btn-soft" onClick={onDisconnect}>
            <Plug size={16} /> Déconnecter
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onConnect} disabled={connecting}>
            <PlugZap size={16} /> {connecting ? 'Connexion…' : 'Connecter'}
          </button>
        )}
      </div>

      <div className="topbar-right">
        <div className={`status-pill status-${statusState}`}>
          <span className="status-led" />
          {statusState === 'live' && <Radio size={13} />}
          <span>{statusText}</span>
        </div>
        <button className="btn btn-ghost icon-btn" title="Réglages" onClick={onOpenSettings}>
          <Settings size={17} />
        </button>
      </div>
    </header>
  );
}
