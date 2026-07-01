import { useEffect, useRef, useState } from 'react';

const MAX_CHAT = 200;
const MAX_GIFTS = 40;
const FLUSH_MS = 180;
// Types d'événements liés à un utilisateur → filtrables par le blocage local.
const BLOCKABLE = new Set(['chat', 'gift', 'follow', 'share', 'subscribe', 'member']);

// Agrège le flux d'événements TikTok et le pousse dans l'état React de façon throttlée.
// Les « Top donateurs » proviennent du classement cumulé de TikTok (ROOM_USER.ranks),
// donc depuis le DÉBUT du live ; à défaut, on retombe sur le cumul depuis la connexion.
// `blockedIds` (Set de ids/uniqueId) masque les utilisateurs bloqués localement.
export function useLiveData(blockedIds) {
  const [chat, setChat] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [donors, setDonors] = useState([]);
  const [stats, setStats] = useState(emptyStats());

  const buf = useRef({ chat: [], gifts: [], dirty: false });
  const acc = useRef(emptyAcc());
  const donorMap = useRef(new Map()); // cumul local (repli)
  const ranksRef = useRef([]); // classement cumulé fourni par TikTok
  const idRef = useRef(0);
  const blockedRef = useRef(blockedIds || new Set());

  useEffect(() => {
    blockedRef.current = blockedIds || new Set();
  }, [blockedIds]);

  // Purge des entrées déjà affichées quand la liste de blocage change.
  useEffect(() => {
    const set = blockedIds || new Set();
    if (set.size === 0) return;
    setChat((prev) => prev.filter((m) => !userBlocked(m.user, set)));
    setGifts((prev) => prev.filter((g) => !userBlocked(g.user, set)));
    setDonors((prev) => prev.filter((d) => !userBlocked(d, set)));
  }, [blockedIds]);

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
        coins: a.coins,
        gifts: a.gifts,
        messages: a.messages,
        follows: a.follows,
        shares: a.shares,
        joins: a.joins,
      });

      // Top donateurs : classement TikTok (depuis le début) si dispo, sinon cumul local.
      const bset = blockedRef.current;
      let donorList;
      if (ranksRef.current.length) {
        donorList = ranksRef.current;
      } else {
        donorList = [...donorMap.current.values()]
          .sort((x, y) => y.coins - x.coins)
          .map((d) => ({ id: d.id, uniqueId: '', name: d.name, avatar: d.avatar, coins: d.coins }));
      }
      setDonors(donorList.filter((d) => !userBlocked(d, bset)).slice(0, 8));
    }, FLUSH_MS);

    return () => {
      if (unsub) unsub();
      clearInterval(timer);
    };
  }, []);

  function handleEvent(p) {
    if (BLOCKABLE.has(p.kind) && userBlocked(p.user, blockedRef.current)) return;

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
        a.coins += p.diamondsTotal;
        if (p.diamondsTotal > 0 && p.user && p.user.id) {
          const cur = donorMap.current.get(p.user.id) || { id: p.user.id, name: p.user.name, avatar: p.user.avatar, coins: 0 };
          cur.coins += p.diamondsTotal;
          cur.name = p.user.name;
          cur.avatar = p.user.avatar;
          donorMap.current.set(p.user.id, cur);
        }
        b.gifts.push({ id: ++idRef.current, user: p.user, giftName: p.giftName, giftImage: p.giftImage, count: p.count, coins: p.diamondsTotal });
        b.dirty = true;
        break;
      case 'like':
        a.likesCounted += p.count;
        if (p.totalLikes) a.likesReported = Math.max(a.likesReported, p.totalLikes);
        b.dirty = true;
        break;
      case 'viewers':
        a.viewers = p.viewerCount;
        if (Array.isArray(p.top) && p.top.length) {
          ranksRef.current = p.top.map((t) => ({
            id: t.user.id,
            uniqueId: t.user.uniqueId,
            name: t.user.name,
            avatar: t.user.avatar,
            coins: t.score,
          }));
        }
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
    ranksRef.current = [];
    setChat([]);
    setGifts([]);
    setDonors([]);
    setStats(emptyStats());
  }

  return { chat, gifts, donors, stats, reset };
}

function userBlocked(user, set) {
  if (!user || !set || set.size === 0) return false;
  return (!!user.id && set.has(user.id)) || (!!user.uniqueId && set.has(user.uniqueId));
}

function emptyStats() {
  return { viewers: 0, likes: 0, coins: 0, gifts: 0, messages: 0, follows: 0, shares: 0, joins: 0 };
}
function emptyAcc() {
  return { viewers: 0, likesReported: 0, likesCounted: 0, coins: 0, gifts: 0, messages: 0, follows: 0, shares: 0, joins: 0 };
}
