import { Gift, Coins } from 'lucide-react';

export default function GiftsPanel({ gifts }) {
  return (
    <section className="panel gifts-panel">
      <div className="panel-head">
        <Gift size={16} className="head-icon" />
        <h2>Cadeaux</h2>
        <span className="badge">{gifts.length}</span>
      </div>
      <div className="feed gift-feed">
        {gifts.length === 0 ? (
          <div className="empty-state small">Les cadeaux apparaîtront ici.</div>
        ) : (
          gifts.map((g) => (
            <div key={g.id} className="gift-card">
              <div className="gift-img">
                {g.giftImage ? <img src={g.giftImage} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <Gift size={18} />}
              </div>
              <div className="gift-info">
                <div className="gift-who">{g.user.name}</div>
                <div className="gift-name">{g.giftName}</div>
              </div>
              <div className="gift-meta">
                <div className="gift-count">×{g.count}</div>
                {g.coins > 0 && (
                  <div className="gift-dia">
                    <Coins size={12} /> {g.coins}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
