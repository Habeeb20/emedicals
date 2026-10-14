import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, Share2, Eye, Link2, Mail, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; // ASSUMPTION: exposes { user }
import { memorialApi, errMsg } from './memorialApi';
import { cx, compact, toast } from './ui';

export default function EngagementBar({ org, initialLiked = false, onDark = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [liked, setLiked] = useState(initialLiked);
  const [counts, setCounts] = useState({ likes: org.likesCount || 0, shares: org.sharesCount || 0 });
  const [menu, setMenu] = useState(false);

  const url = `${window.location.origin}/memorial/${org._id}`;
  const text = `${org.name}, ${org.type} on eMedicals`;
  const enc = encodeURIComponent;
  const channels = [
    { id: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, href: `https://wa.me/?text=${enc(`${text} ${url}`)}` },
    { id: 'facebook', label: 'Facebook', Icon: Share2, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { id: 'x', label: 'X', Icon: Share2, href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
    { id: 'email', label: 'Email', Icon: Mail, href: `mailto:?subject=${enc(text)}&body=${enc(url)}` },
    { id: 'copy_link', label: 'Copy link', Icon: Link2 },
  ];

  const needLogin = () => navigate(`/login?redirect=${enc(loc.pathname)}`);

  const toggleLike = async () => {
    if (!user) return needLogin();
    const was = liked;
    setLiked(!was);
    setCounts((c) => ({ ...c, likes: c.likes + (was ? -1 : 1) }));
    try {
      const r = await memorialApi.like(org._id);
      setLiked(r.liked);
      setCounts((c) => ({ ...c, likes: r.likesCount }));
      if (r.pointsAwarded) toast(`+${r.pointsAwarded} loyalty point`);
    } catch (e) {
      setLiked(was);
      setCounts((c) => ({ ...c, likes: c.likes + (was ? 1 : -1) }));
      toast(errMsg(e), 'error');
    }
  };

  const share = async (ch) => {
    setMenu(false);
    if (ch.id === 'copy_link') {
      await navigator.clipboard?.writeText(url).catch(() => {});
      toast('Link copied');
    } else window.open(ch.href, '_blank', 'noopener');
    memorialApi.share(org._id, ch.id).then((r) => setCounts((c) => ({ ...c, shares: r.sharesCount }))).catch(() => {});
  };

  const base = onDark
    ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
    : 'border-memorial-200 bg-white text-memorial-700 hover:bg-memorial-50';

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <button onClick={toggleLike} aria-pressed={liked} className={cx('inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition', base, liked && 'border-danger/40')}>
        <Heart size={16} className={liked ? 'fill-danger text-danger' : ''} /> {compact(counts.likes)}
      </button>
      <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} className={cx('inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition', base)}>
        <Share2 size={16} /> {compact(counts.shares)}
      </button>
      <span className={cx('inline-flex items-center gap-2 px-2 text-sm', onDark ? 'text-memorial-300' : 'text-memorial-500')}>
        <Eye size={16} /> {compact(org.viewsCount || 0)} views
      </span>
      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute left-0 top-12 z-20 w-52 rounded-2xl border border-memorial-200 bg-white p-1.5">
            {channels.map((c) => (
              <button key={c.id} onClick={() => share(c)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-navy-800 hover:bg-memorial-50">
                <c.Icon size={16} className="text-memorial-500" /> {c.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
