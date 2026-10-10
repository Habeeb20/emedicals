// import { Avatar, Badge, Button, Icon, Card } from './ui';
// import { formatKm, formatMinutes, naira, PAYMENT_MODES } from './format';

// export default function ProviderCard({ provider: p, onBook }) {
//   const isDoctor = p.kind === 'doctor';
//   const km = p.travel?.distanceKm ?? p.distanceKm;
//   const mins = p.travel?.durationMin;
//   const approx = p.travel?.estimated ? '~' : '';

//   return (
//     <Card className="flex flex-col gap-4 transition-shadow hover:shadow-md">
//       <div className="flex items-start gap-3">
//         <Avatar name={p.name} src={(isDoctor ? p.avatar : p.logo)?.url} rounded={isDoctor ? 'rounded-full' : 'rounded-xl'} size="h-14 w-14" />
//         <div className="min-w-0 flex-1">
//           <h3 className="truncate text-base font-semibold text-navy-900">{p.name}</h3>
//           <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-600">
//             <Icon name={isDoctor ? 'doctor' : 'hospital'} className="h-4 w-4 text-primary-600" />
//             <span className="truncate">{isDoctor ? p.department : p.type === 'clinic' ? 'Clinic' : 'Hospital'}</span>
//           </p>
//           {isDoctor && p.hospitals?.length > 0 && (
//             <p className="mt-0.5 truncate text-sm text-gray-500">{p.hospitals.map((h) => h.name).join(', ')}</p>
//           )}
//         </div>
//         {isDoctor && p.isAvailableOnline && <Badge tone="success">Online</Badge>}
//       </div>

//       {!isDoctor && p.departments?.length > 0 && (
//         <div className="flex flex-wrap gap-1.5">
//           {p.departments.slice(0, 4).map((d) => <Badge key={d} tone="primary">{d}</Badge>)}
//           {p.departments.length > 4 && <Badge>+{p.departments.length - 4} more</Badge>}
//         </div>
//       )}

//       <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-700">
//         {km != null ? (
//           <span className="inline-flex items-center gap-1.5"><Icon name="pin" className="h-4 w-4 text-gray-500" />{approx}{formatKm(km)} away</span>
//         ) : (
//           <span className="text-gray-500">Distance unavailable</span>
//         )}
//         {mins != null && <span className="inline-flex items-center gap-1.5"><Icon name="car" className="h-4 w-4 text-gray-500" />{approx}{formatMinutes(mins)} drive</span>}
//       </div>

//       <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
//         <div>
//           <p className="text-lg font-semibold text-navy-900">{p.fee ? naira(p.fee) : 'Free'}</p>
//           <p className="text-xs text-gray-500">{PAYMENT_MODES[p.paymentMode]?.label}</p>
//         </div>
//         <Button onClick={() => onBook(p)} icon="calendar">Book</Button>
//       </div>
//     </Card>
//   );
// }












import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, Star } from 'lucide-react';
import { Avatar, Badge, Button, Icon, Card } from './ui';
import { formatKm, formatMinutes, naira, PAYMENT_MODES } from './format';
import EngagementBar from './EngagementBar';
import { hasToken, targetFor, getStats, toggleLike, recordShare, recordView, getReviews } from './engagementApi';

const DAYS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

const addressOf = (p) => {
  const a = p.address ?? p.location?.address;
  const text = typeof a === 'string' ? a : [a?.street, a?.city, a?.state].filter(Boolean).join(', ');
  return text || [p.lga, p.state].filter(Boolean).join(', ');
};

const Stars = ({ value }) => (
  <span className="inline-flex" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={`h-3.5 w-3.5 ${n <= Math.round(value) ? 'fill-current text-warning' : 'text-gray-300'}`} />
    ))}
  </span>
);

const when = (d) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * One doctor or hospital. Likes, shares, views and reviews come from /api/engagement.
 * `getShareUrl(provider)` should return the public link for a provider.
 */
export default function ProviderCard({ provider: p, onBook, getShareUrl }) {
  const isDoctor = p.kind === 'doctor';
  const target = useMemo(() => targetFor(p), [p]);

  const km = p.travel?.distanceKm ?? p.distanceKm;
  const mins = p.travel?.durationMin;
  const approx = p.travel?.estimated ? '~' : '';
  const address = addressOf(p);

  // Counts start from what /providers returned, then are refreshed from the engagement API
  const [stats, setStats] = useState({
    likes: p.likesCount ?? 0, shares: p.sharesCount ?? 0, views: p.viewsCount ?? 0, liked: false,
  });
  const [rating, setRating] = useState({ average: p.ratingAverage ?? 0, count: p.ratingCount ?? null });
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState(null);       // null = not loaded yet
  const viewed = useRef(false);
  const liking = useRef(false);
  const cardRef = useRef(null);

  // When the card scrolls into view: find out whether this user already liked it, and get fresh counts.
  // Guests only need the call if /providers did not include counts.
  useEffect(() => {
    if (!target.id || !(hasToken() || p.likesCount === undefined)) return undefined;
    let cancelled = false;
    const load = () => getStats(target)
      .then((s) => { if (!cancelled) setStats({ likes: s.likesCount, shares: s.sharesCount, views: s.viewsCount, liked: s.isLiked }); })
      .catch(() => {});
    if (typeof IntersectionObserver === 'undefined' || !cardRef.current) { load(); return () => { cancelled = true; }; }
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '200px' });
    io.observe(cardRef.current);
    return () => { cancelled = true; io.disconnect(); };
  }, [target]);   // eslint-disable-line react-hooks/exhaustive-deps

  const award = (loyalty) => {
    if (loyalty?.awarded > 0) toast.success(`+${loyalty.awarded} loyalty point${loyalty.awarded === 1 ? '' : 's'}`);
  };

  const handleLike = async () => {
    if (!hasToken()) { toast.info('Log in to like providers'); return; }
    if (liking.current) return;
    liking.current = true;
    const before = stats;
    setStats((s) => ({ ...s, liked: !s.liked, likes: Math.max(0, s.likes + (s.liked ? -1 : 1)) }));   // instant feedback
    try {
      const r = await toggleLike(target);
      setStats((s) => ({ ...s, liked: r.liked, likes: r.likesCount }));
      award(r.loyalty);
    } catch (err) {
      setStats(before);
      toast.error(err.status === 401 ? 'Your session expired. Please log in again.' : err.message);
    } finally {
      liking.current = false;
    }
  };

  const handleShare = (channel) => {
    if (!hasToken()) return;   // sharing works for everyone; only logged-in shares are counted
    recordShare(target, channel)
      .then((r) => { setStats((s) => ({ ...s, shares: r.sharesCount ?? s.shares + 1 })); award(r.loyalty); })
      .catch(() => {});
  };

  // Opening the details is a "view": counted once per visitor per day by the server
  const toggleDetails = () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    if (!viewed.current) {
      viewed.current = true;
      recordView(target).then((r) => { if (r.counted) setStats((s) => ({ ...s, views: s.views + 1 })); }).catch(() => {});
    }
    if (reviews === null) {
      getReviews(target, { limit: 3 })
        .then((r) => { setReviews(r.reviews); setRating({ average: r.summary.average, count: r.summary.count }); })
        .catch(() => setReviews([]));
    }
  };

  const shareInfo = {
    title: p.name,
    text: `${p.name} on eMedicals`,
    getUrl: () => (getShareUrl ? getShareUrl(p) : `${window.location.origin}/providers?provider=${p.kind}:${p.id}`),
  };

  return (
    <Card className="flex flex-col gap-4 transition-shadow hover:shadow-md">
      <div ref={cardRef} className="flex items-start gap-3">
        <Avatar name={p.name} src={(isDoctor ? p.avatar : p.logo)?.url} rounded={isDoctor ? 'rounded-full' : 'rounded-xl'} size="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-navy-900">{p.name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-600">
            <Icon name={isDoctor ? 'doctor' : 'hospital'} className="h-4 w-4 text-primary-600" />
            <span className="truncate">
              {isDoctor ? [p.specialization, p.department].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ') : p.type === 'clinic' ? 'Clinic' : 'Hospital'}
            </span>
          </p>
          {isDoctor && p.hospitals?.length > 0 && (
            <p className="mt-0.5 truncate text-sm text-gray-500">{p.hospitals.map((h) => h.name).join(', ')}</p>
          )}
          {address && <p className="mt-0.5 truncate text-sm text-gray-500">{address}</p>}
        </div>
        {isDoctor && p.isAvailableOnline && <Badge tone="success">Online</Badge>}
      </div>

      {!isDoctor && p.departments?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.departments.slice(0, 4).map((d) => <Badge key={d} tone="primary">{d}</Badge>)}
          {p.departments.length > 4 && <Badge>+{p.departments.length - 4} more</Badge>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-700">
        {km != null ? (
          <span className="inline-flex items-center gap-1.5"><Icon name="pin" className="h-4 w-4 text-gray-500" />{approx}{formatKm(km)} away</span>
        ) : (
          <span className="text-gray-500">Distance unavailable</span>
        )}
        {mins != null && <span className="inline-flex items-center gap-1.5"><Icon name="car" className="h-4 w-4 text-gray-500" />{approx}{formatMinutes(mins)} drive</span>}
        {p.waitingToday > 0 && <span className="text-gray-500">{p.waitingToday} waiting today</span>}
      </div>

      <EngagementBar
        stats={stats} rating={rating} shareInfo={shareInfo}
        onLike={handleLike} onShare={handleShare}
        onOpenReviews={() => { if (!open) toggleDetails(); }}
      />

      {open && (
        <div className="space-y-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
          {(p.bio || p.description) && <p>{p.bio || p.description}</p>}

          {!isDoctor && p.departments?.length > 4 && (
            <div className="flex flex-wrap gap-1.5">{p.departments.map((d) => <Badge key={d} tone="primary">{d}</Badge>)}</div>
          )}

          {isDoctor && p.availability?.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-navy-900">Working hours</p>
              <ul className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                {p.availability.map((s) => <li key={`${s.day}${s.start}`}>{DAYS[s.day] || s.day}: {s.start} to {s.end}</li>)}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-2 flex items-center gap-2 font-medium text-navy-900">
              Reviews
              {rating.count > 0 && <><Stars value={rating.average} /><span className="font-normal text-gray-500">{Number(rating.average).toFixed(1)} from {rating.count}</span></>}
            </p>
            {reviews === null ? (
              <p className="text-gray-500">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="text-gray-500">No reviews yet.</p>
            ) : (
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r._id} className="rounded-lg bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-navy-900">{r.reviewer?.fullName || 'Patient'}</span>
                      <span className="text-xs text-gray-500">{when(r.createdAt)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Stars value={r.rating} />
                      {r.isVerifiedVisit && <span className="text-xs text-success-dark">Verified visit</span>}
                    </div>
                    {r.comment && <p className="mt-1.5 text-gray-600">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <button type="button" onClick={toggleDetails} aria-expanded={open}
        className="-mt-1 inline-flex items-center gap-1 self-start text-sm font-medium text-primary-600 hover:text-primary-700">
        {open ? 'Hide details' : 'View details'}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <div>
          <p className="text-lg font-semibold text-navy-900">{p.fee ? naira(p.fee) : 'Free'}</p>
          <p className="text-xs text-gray-500">{PAYMENT_MODES[p.paymentMode]?.label}</p>
        </div>
        <Button onClick={() => onBook(p)} icon="calendar">Book</Button>
      </div>
    </Card>
  );
}
