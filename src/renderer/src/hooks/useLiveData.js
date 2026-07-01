import { useEffect, useRef, useState } from 'react';

const MAX_CHAT = 200;
const MAX_GIFTS = 40;
const FLUSH_MS = 180;

// Agrège le flux d'événements TikTok et le pousse dans l'état React de façon throttlée
// (les likes/chat peuvent arriver très vite → on tamponne puis on met à jour ~5 fois/s).
export function useLiveData() {
  const [chat, setChat] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [donors, setDonors] = useState([]);
  const [stats, setStats] = useState(emptyStats());

  const buf = useRef({ chat: [], gifts: [], dirty: false });
  const acc = useRef(emptyAcc());
  const donorMap = useRef(new Map());
  const idRef = useRef(0);

  useEffect(() => {
    const unsub = window.api.onEvent(handleEvent);

    const timer = setInterval(() => {
      const b = buf.current;
      if (!b.dirty) return;
      b.dirty = false;

      if (b.chat.length) {
        const batch = b.chat;
        b.chat = [];
        setChat((prev) => [...prev, ...batch].slice(-MAX_CHAT));
      }
      if (b.gifts.length) {
        const batch = b.gifts.slice().reverse();
        b.gifts = [];
        setGifts((prev) => [...batch, ...prev].slice(0, MAX_GIFTS));
      }

      const a = acc.current;
      setStats({
        viewers: a.viewers,
        likes: Math.max(a.likesReported, a.likesCounted),
        diamonds: a.diamonds,
        gifts: a.gifts,
        messages: a.messages,
        follows: a.follows,
        shares: a.shares,
        joins: a.joins,
      });
      setDonors([...donorMap.current.values()].sort((x, y) => y.diamonds - x.diamonds).slice(0, 8));
    }, FLUSH_MS);

    return () => {
      if (unsub) unsub();
      clearInterval(timer);
    };
  }, []);

  function handleEvent(p) {
    const a = acc.current;
    const b = buf.current;
    switch (p.kind) {
      case 'chat':
        a.messages++;
        b.chat.push({ id: ++idRef.current, type: 'chat', user: p.user, content: p.content });
        b.dirty = true;
        break;
      case 'gift':
        if (p.streakInProgress) break;
        a.gifts++;
        a.diamonds += p.diamondsTotal;
        if (p.diamondsTotal > 0 && p.user && p.user.id) {
          const cur = donorMap.current.get(p.user.id) || { id: p.user.id, name: p.user.name, avatar: p.user.avatar, diamonds: 0 };
          cur.diamonds += p.diamondsTotal;
          cur.name = p.user.name;
          cur.avatar = p.user.avatar;
          donorMap.current.set(p.user.id, cur);
        }
        b.gifts.push({ id: ++idRef.current, user: p.user, giftName: p.giftName, giftImage: p.giftImage, count: p.count, diamonds: p.diamondsTotal });
        b.dirty = true;
        break;
      case 'like':
        a.likesCounted += p.count;
        if (p.totalLikes) a.likesReported = Math.max(a.likesReported, p.totalLikes);
        b.dirty = true;
        break;
      case 'viewers':
        a.viewers = p.viewerCount;
        b.dirty = true;
        break;
      case 'follow':
        a.follows++;
        b.chat.push({ id: ++idRef.current, type: 'follow', user: p.user });
        b.dirty = true;
        break;
      case 'share':
        a.shares++;
        b.chat.push({ id: ++idRef.current, type: 'share', user: p.user });
        b.dirty = true;
        break;
      case 'subscribe':
        b.chat.push({ id: ++idRef.current, type: 'sub', user: p.user });
        b.dirty = true;
        break;
      case 'member':
        a.joins++;
        b.dirty = true;
        break;
      default:
        break;
    }
  }

  function reset() {
    buf.current = { chat: [], gifts: [], dirty: false };
    acc.current = emptyAcc();
    donorMap.current = new Map();
    setChat([]);
    setGifts([]);
    setDonors([]);
    setStats(emptyStats());
  }

  return { chat, gifts, donors, stats, reset };
}

function emptyStats() {
  return { viewers: 0, likes: 0, diamonds: 0, gifts: 0, messages: 0, follows: 0, shares: 0, joins: 0 };
}
function emptyAcc() {
  return { viewers: 0, likesReported: 0, likesCounted: 0, diamonds: 0, gifts: 0, messages: 0, follows: 0, shares: 0, joins: 0 };
}
