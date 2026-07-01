import { Users, Heart, Coins, Gift, MessageSquare, UserPlus, Share2, DoorOpen, Clock, BarChart3 } from 'lucide-react';
import { fmt, fmtDuration } from '../lib/format.js';

export default function StatsPanel({ stats, uptime, connected }) {
  const cards = [
    { icon: Users, label: 'Spectateurs', value: connected ? fmt(stats.viewers) : '—' },
    { icon: Heart, label: 'Likes', value: fmt(stats.likes) },
    { icon: Coins, label: 'Pièces', value: fmt(stats.coins) },
    { icon: Gift, label: 'Cadeaux', value: fmt(stats.gifts) },
    { icon: MessageSquare, label: 'Messages', value: fmt(stats.messages) },
    { icon: UserPlus, label: 'Abonnés', value: fmt(stats.follows) },
  ];

  return (
    <section className="panel stats-panel">
      <div className="panel-head">
        <BarChart3 size={16} className="head-icon" />
        <h2>Statistiques</h2>
      </div>
      <div className="stats-grid">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`stat${c.accent ? ' accent' : ''}`}>
              <Icon size={16} className="stat-icon" />
              <div className="stat-val">{c.value}</div>
              <div className="stat-lbl">{c.label}</div>
            </div>
          );
        })}
      </div>
      <div className="stats-sub">
        <span><Share2 size={13} /> {fmt(stats.shares)} partages</span>
        <span><DoorOpen size={13} /> {fmt(stats.joins)} arrivées</span>
        <span><Clock size={13} /> {connected ? fmtDuration(uptime) : '00:00'}</span>
      </div>
    </section>
  );
}
