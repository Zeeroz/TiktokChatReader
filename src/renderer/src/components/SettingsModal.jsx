import { useEffect, useState } from 'react';
import { X, LogIn, LogOut, CheckCircle2, RefreshCw, KeyRound, ChevronDown } from 'lucide-react';

export default function SettingsModal({
  open,
  onClose,
  settings,
  tiktokConnected,
  onSave,
  onLoginTikTok,
  onLogoutTikTok,
  blocked,
  onUnblock,
  version,
  checkNote,
  onCheckUpdate,
}) {
  const [signApiKey, setSignApiKey] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [ttTargetIdc, setTtTargetIdc] = useState('');
  const [saved, setSaved] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    if (open && settings) {
      setSignApiKey(settings.signApiKey || '');
      setSessionId(settings.sessionId || '');
      setTtTargetIdc(settings.ttTargetIdc || '');
      setSaved(false);
    }
  }, [open, settings]);

  if (!open) return null;

  const save = async () => {
    await onSave({ signApiKey: signApiKey.trim(), sessionId: sessionId.trim(), ttTargetIdc: ttTargetIdc.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>Réglages</h2>
          <button className="btn btn-ghost icon-btn" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="modal-body">
          {/* Connexion au compte TikTok */}
          <div className="section-title">Compte TikTok</div>
          <p className="hint">Connecte ton compte pour pouvoir écrire dans le chat des lives. Aucun mot de passe ne transite par l'app.</p>
          {tiktokConnected ? (
            <div className="account-row connected">
              <span className="account-status">
                <CheckCircle2 size={17} /> Compte TikTok connecté
              </span>
              <button className="btn btn-soft" onClick={onLogoutTikTok}>
                <LogOut size={15} /> Se déconnecter
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-block" onClick={onLoginTikTok}>
              <LogIn size={16} /> Se connecter à TikTok
            </button>
          )}

          {/* Clé Euler */}
          <div className="section-title mt">Serveur de signature (Euler Stream)</div>
          <label className="field">
            <span className="field-label">
              <KeyRound size={13} /> Clé API Euler <em>(facultative, recommandée)</em>
            </span>
            <input
              type="password"
              value={signApiKey}
              onChange={(e) => setSignApiKey(e.target.value)}
              placeholder="gratuite sur eulerstream.com"
              autoComplete="off"
            />
          </label>

          {/* Avancé : cookies manuels */}
          <button className="advanced-toggle" onClick={() => setAdvanced((v) => !v)}>
            <ChevronDown size={14} className={advanced ? 'rot' : ''} /> Avancé — saisie manuelle des cookies
          </button>
          {advanced && (
            <div className="advanced">
              <p className="hint">Alternative à la connexion ci-dessus : colle directement les cookies depuis tiktok.com (F12 → Application → Cookies).</p>
              <label className="field">
                <span className="field-label">Cookie sessionid</span>
                <input type="password" value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="valeur du cookie sessionid" autoComplete="off" />
              </label>
              <label className="field">
                <span className="field-label">Cookie tt-target-idc <em>(ex: useast2a)</em></span>
                <input type="text" value={ttTargetIdc} onChange={(e) => setTtTargetIdc(e.target.value)} placeholder="ex: useast2a" autoComplete="off" />
              </label>
            </div>
          )}

          <div className="section-title mt">Utilisateurs bloqués</div>
          {!blocked || blocked.length === 0 ? (
            <p className="hint">Aucun utilisateur bloqué. Survole un message dans le chat et clique sur l'icône pour masquer une personne.</p>
          ) : (
            <div className="blocked-list">
              {blocked.map((b) => (
                <div className="blocked-row" key={b.id || b.uniqueId}>
                  <span className="blocked-name">
                    {b.name}
                    {b.uniqueId ? ` · @${b.uniqueId}` : ''}
                  </span>
                  <button className="btn btn-ghost icon-btn" title="Débloquer" onClick={() => onUnblock(b.id || b.uniqueId)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="update-row">
          <span className="version-label">Version <b>{version || '…'}</b></span>
          {checkNote?.text && <span className={`update-check-note ${checkNote.kind || ''}`}>{checkNote.text}</span>}
          <button className="btn btn-ghost" onClick={onCheckUpdate}>
            <RefreshCw size={14} /> Vérifier les MAJ
          </button>
        </div>

        <div className="modal-foot">
          {saved && <span className="saved-note">Enregistré ✓</span>}
          <button className="btn btn-primary" onClick={save}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
