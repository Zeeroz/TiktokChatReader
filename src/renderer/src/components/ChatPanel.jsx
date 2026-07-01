import { useEffect, useRef, useState } from 'react';
import { Send, Heart, Share2, Star, BadgeCheck, MessageCircle } from 'lucide-react';
import Avatar from './Avatar.jsx';

const SYS = {
  follow: { icon: Heart, cls: 'follow', text: "vient de s'abonner" },
  share: { icon: Share2, cls: 'share', text: 'a partagé le live' },
  sub: { icon: Star, cls: 'sub', text: "s'est abonné(e) ⭐" },
};

export default function ChatPanel({ chat, connected, onSend, messageCount }) {
  const feedRef = useRef(null);
  const [autoscroll, setAutoscroll] = useState(true);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!autoscroll) return;
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, autoscroll]);

  const submit = () => {
    const t = text.trim();
    if (!t || !connected) return;
    onSend(t, () => setText(''));
  };

  return (
    <section className="panel chat-panel">
      <div className="panel-head">
        <MessageCircle size={16} className="head-icon" />
        <h2>Chat</h2>
        <span className="badge">{messageCount}</span>
        <label className="autoscroll">
          <input type="checkbox" checked={autoscroll} onChange={(e) => setAutoscroll(e.target.checked)} />
          défilement auto
        </label>
      </div>

      <div className="feed chat-feed" ref={feedRef}>
        {chat.length === 0 ? (
          <div className="empty-state">
            {connected ? 'En attente des premiers messages…' : 'Connecte-toi à un live pour voir le chat ici.'}
          </div>
        ) : (
          chat.map((m) =>
            m.type === 'chat' ? (
              <div key={m.id} className="chat-line">
                <Avatar url={m.user.avatar} size={30} alt={m.user.name} />
                <div className="chat-body">
                  <span className="chat-name">
                    {m.user.name}
                    {m.user.verified && <BadgeCheck size={13} className="verified" />}
                  </span>
                  <span className="chat-text">{m.content}</span>
                </div>
              </div>
            ) : (
              <SysLine key={m.id} item={m} />
            )
          )
        )}
      </div>

      <div className="send-bar">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={connected ? 'Écris un message dans le chat…' : 'Connecte-toi pour écrire dans le chat…'}
          maxLength={150}
          disabled={!connected}
        />
        <button className="btn btn-primary icon-btn" onClick={submit} disabled={!connected} title="Envoyer">
          <Send size={16} />
        </button>
      </div>
    </section>
  );
}

function SysLine({ item }) {
  const conf = SYS[item.type] || SYS.follow;
  const Icon = conf.icon;
  return (
    <div className={`sys-line ${conf.cls}`}>
      <Icon size={14} />
      <span className="who">{item.user.name}</span>
      <span>{conf.text}</span>
    </div>
  );
}
