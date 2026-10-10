import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Heart, Share2, Eye, Star } from 'lucide-react';

const compact = (n = 0) => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers and non-https pages
    const box = document.createElement('textarea');
    box.value = text;
    box.style.position = 'fixed';
    box.style.opacity = '0';
    document.body.appendChild(box);
    box.select();
    const done = document.execCommand?.('copy');
    document.body.removeChild(box);
    return Boolean(done);
  }
};

const stat = 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition';

/**
 * Like / share / views / reviews row.
 *  stats:     { likes, shares, views, liked }
 *  rating:    { average, count }  (count === null while unknown)
 *  shareInfo: { title, text, getUrl }
 *  onShare(channel) is called after a share actually starts, so it can be counted.
 */
export default function EngagementBar({ stats, rating, onLike, onShare, onOpenReviews, shareInfo }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!menuRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const share = async (channel) => {
    setOpen(false);
    const url = shareInfo.getUrl();
    const { title, text } = shareInfo;
    const enc = encodeURIComponent;

    if (channel === 'copy_link') {
      if (!(await copyText(url))) { toast.error('Could not copy the link'); return; }
      toast.success('Link copied');
    } else if (channel === 'native') {
      try { await navigator.share({ title, text, url }); } catch { return; }   // closed the share sheet: don't count it
    } else if (channel === 'email') {
      window.location.href = `mailto:?subject=${enc(title)}&body=${enc(`${text}\n${url}`)}`;
    } else {
      const links = {
        whatsapp: `https://wa.me/?text=${enc(`${text} ${url}`)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
        x: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
      };
      window.open(links[channel], '_blank', 'noopener,noreferrer');
    }
    onShare(channel === 'native' ? 'other' : channel);
  };

  const options = [
    ...(typeof navigator !== 'undefined' && navigator.share ? [['native', 'Share…']] : []),
    ['whatsapp', 'WhatsApp'], ['facebook', 'Facebook'], ['x', 'X (Twitter)'], ['email', 'Email'], ['copy_link', 'Copy link'],
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-gray-100 pt-3">
      <button
        type="button" onClick={onLike} aria-pressed={stats.liked}
        aria-label={`${stats.liked ? 'Unlike' : 'Like'}, ${stats.likes} likes`}
        className={`${stat} ${stats.liked ? 'bg-danger-light text-danger' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        <Heart className={`h-4 w-4 ${stats.liked ? 'fill-current' : ''}`} />
        {compact(stats.likes)}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}
          aria-label={`Share, ${stats.shares} shares`} className={`${stat} text-gray-600 hover:bg-gray-100`}
        >
          <Share2 className="h-4 w-4" />
          {compact(stats.shares)}
        </button>
        {open && (
          <div role="menu" className="absolute bottom-full left-0 z-20 mb-2 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
            {options.map(([channel, label]) => (
              <button key={channel} type="button" role="menuitem" onClick={() => share(channel)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-navy-800 hover:bg-gray-50">
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className={`${stat} text-gray-600`} aria-label={`${stats.views} views`}>
        <Eye className="h-4 w-4" />
        {compact(stats.views)}
      </span>

      <button type="button" onClick={onOpenReviews} className={`${stat} ml-auto text-gray-600 hover:bg-gray-100`}>
        <Star className={`h-4 w-4 ${rating.count > 0 ? 'fill-current text-warning' : ''}`} />
        {rating.count > 0 ? (
          <>
            <span className="text-navy-900">{Number(rating.average).toFixed(1)}</span>
            <span className="text-gray-500">({compact(rating.count)})</span>
          </>
        ) : rating.count === 0 ? 'No reviews' : 'Reviews'}
      </button>
    </div>
  );
}