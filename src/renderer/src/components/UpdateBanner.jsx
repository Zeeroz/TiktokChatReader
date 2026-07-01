import { ArrowUpCircle, RotateCw, X } from 'lucide-react';

export default function UpdateBanner({ state, onInstall, onDismiss }) {
  if (!state || !state.visible) return null;
  return (
    <div className="update-banner">
      <ArrowUpCircle size={17} />
      <span>{state.text}</span>
      {state.ready && (
        <button className="btn btn-primary" onClick={onInstall}>
          <RotateCw size={14} /> Redémarrer pour installer
        </button>
      )}
      <button className="btn btn-ghost icon-btn" onClick={onDismiss} title="Masquer">
        <X size={15} />
      </button>
    </div>
  );
}
