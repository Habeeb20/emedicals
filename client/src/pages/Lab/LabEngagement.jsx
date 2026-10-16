import { useState } from 'react';
import { Eye, Heart, Share2, Star, MessageSquare, Link2, Mail } from 'lucide-react';

export function Stars({ value = 0, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
        />
      ))}
    </span>
  );
}

const compact = (n = 0) => new Intl.NumberFormat('en', { notation: 'compact' }).format(n);

/* Read-only stats row used on directory cards */
export function StatRow({ lab }) {
  const items = [
    { icon: Eye, v: lab.viewsCount, label: 'views' },
    { icon: Heart, v: lab.likesCount, label: 'likes' },
    { icon: Share2, v: lab.sharesCount, label: 'shares' },
    { icon: MessageSquare, v: lab.ratingCount, label: 'reviews' },
  ];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
      {items.map(({ icon: Icon, v, label }) => (
        <span key={label} className="inline-flex items-center gap-1" title={label}>
          <Icon size={14} /> {compact(v || 0)}
        </span>
      ))}
    </div>
  );
}

export function RatingLine({ average = 0, count = 0 }) {
  return (
    <div className="mt-1 flex items-center gap-2 text-sm">
      <Stars value={average} />
      <span className="font-semibold text-navy-900">{count ? average.toFixed(1) : 'New'}</span>
      {count > 0 && <span className="text-gray-500">({count})</span>}
    </div>
  );
}

/* Share dropdown: calls onShare(channel) after the user picks a channel */
export function ShareMenu({ url, title, onShare }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = encodeURIComponent(`${title} - ${url}`);
  const u = encodeURIComponent(url);

  const channels = [
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${text}` },
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: 'x', label: 'X (Twitter)', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${u}` },
    { key: 'email', label: 'Email', href: `mailto:?subject=${encodeURIComponent(title)}&body=${text}`, icon: Mail },
  ];

  const pick = (key) => { onShare?.(key); setOpen(false); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
    onShare?.('copy_link');
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn-outline inline-flex items-center gap-2">
        <Share2 size={16} /> Share
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {channels.map((c) => (
            <a key={c.key} href={c.href} target="_blank" rel="noreferrer" onClick={() => pick(c.key)}
               className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              {c.label}
            </a>
          ))}
          <button type="button" onClick={copy} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
            <Link2 size={14} /> {copied ? 'Link copied!' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}