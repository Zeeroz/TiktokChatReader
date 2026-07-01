import { Trophy, Gem } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { fmt } from '../lib/format.js';

export default function DonorsPanel({ donors }) {
  return (
    <section className="panel donors-panel">
      <div className="panel-head">
        <Trophy size={16} className="head-icon" />
        <h2>Top donateurs</h2>
      </div>
      <div className="donors">
        {donors.length === 0 ? (
          <div className="empty-state small">Personne pour l'instant.</div>
        ) : (
          donors.map((d, i) => (
            <div key={d.id} className="donor">
              <div className="donor-rank">{i + 1}</div>
              <Avatar url={d.avatar} size={26} alt={d.name} />
              <div className="donor-name">{d.name}</div>
              <div className="donor-dia">
                <Gem size={12} /> {fmt(d.diamonds)}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
