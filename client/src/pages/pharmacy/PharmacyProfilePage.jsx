


// import { useCallback, useEffect, useState } from 'react';
// import { Link, useLocation, useNavigate } from 'react-router-dom';
// import api, { getErrorMessage } from './api';
// import { Avatar, Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../appointments/ui';
// import { addressLine, shareOrg } from './FindPharmacyPage';

// /* ------------------------------------------------------------------ */
// /* Local helpers (previously imported from ./PharmacyShared)           */
// /* ------------------------------------------------------------------ */

// const field =
//   'w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-navy-900 placeholder:text-gray-400 ' +
//   'focus:border-pharmacy-700 focus:outline-none focus:ring-2 focus:ring-pharmacy-700/20';

// const primaryBtn =
//   'inline-flex h-11 items-center justify-center rounded-xl bg-pharmacy-600 px-4 text-sm font-semibold text-white ' +
//   'hover:bg-pharmacy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pharmacy-700/40 ' +
//   'disabled:cursor-not-allowed disabled:opacity-60';

// const ghostBtn =
//   'inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-navy-900 ' +
//   'hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pharmacy-700/40 ' +
//   'disabled:cursor-not-allowed disabled:opacity-60';

// function fmtDate(value) {
//   if (!value) return '';
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) return '';
//   return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
// }

// function Field({ label, children }) {
//   return (
//     <label className="block space-y-1">
//       <span className="text-sm font-medium text-navy-900">{label}</span>
//       {children}
//     </label>
//   );
// }

// const PILL_TONES = {
//   success: 'bg-green-50 text-green-700',
//   info: 'bg-blue-50 text-blue-700',
//   neutral: 'bg-gray-100 text-gray-700',
// };

// function Pill({ tone = 'neutral', children }) {
//   return (
//     <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PILL_TONES[tone] || PILL_TONES.neutral}`}>
//       {children}
//     </span>
//   );
// }

// function Stars({ value = 0, size = 'text-base' }) {
//   const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
//   return (
//     <span className={`inline-flex ${size}`} role="img" aria-label={`${Number(value) || 0} out of 5 stars`}>
//       {[1, 2, 3, 4, 5].map((i) => (
//         <span key={i} aria-hidden="true" className={i <= n ? 'text-warning' : 'text-gray-300'}>★</span>
//       ))}
//     </span>
//   );
// }

// /* ------------------------------------------------------------------ */

// const ID_KEY = 'pharmacyId';

// // axios gives { data: <response body> }. The body may be { data: ... } or the payload itself.
// const pick = (r) => r?.data?.data ?? r?.data;

// function ReviewForm({ orgId, existing, onSaved, onCancel }) {
//   const [rating, setRating] = useState(existing?.rating || 0);
//   const [title, setTitle] = useState(existing?.title || '');
//   const [comment, setComment] = useState(existing?.comment || '');
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState('');

//   const submit = async (e) => {
//     e.preventDefault();
//     if (!rating) return setError('Choose a star rating.');
//     setBusy(true); setError('');
//     try {
//       // axios sends the payload from `data`, not `body`
//       const payload = { rating, title, comment };
//       const r = existing
//         ? await api.patch(`/reviews/${existing._id}`, payload)
//         : await api.post(`/reviews/organization/${orgId}`, payload);
//       onSaved(r.data);
//     } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(false); }
//   };

//   return (
//     <form onSubmit={submit} className="space-y-3">
//       <ErrorNote>{error}</ErrorNote>
//       <div role="radiogroup" aria-label="Your rating" className="flex gap-1">
//         {[1, 2, 3, 4, 5].map((n) => (
//           <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)}
//             className={`h-11 w-11 rounded-full text-2xl ${n <= rating ? 'text-warning' : 'text-gray-300'} hover:bg-warning-light`}>★</button>
//         ))}
//       </div>
//       <Field label="Headline"><input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={`${field} h-11`} placeholder="Quick and helpful" /></Field>
//       <Field label="Your experience"><textarea maxLength={2000} rows={4} value={comment} onChange={(e) => setComment(e.target.value)} className={`${field} py-2`} placeholder="Were they friendly, was the drug in stock, did they explain how to take it?" /></Field>
//       <div className="flex gap-2">
//         <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Saving…' : existing ? 'Save changes' : 'Post review'}</button>
//         {onCancel && <button type="button" onClick={onCancel} className={ghostBtn}>Cancel</button>}
//       </div>
//     </form>
//   );
// }

// export default function PharmacyProfilePage() {
//   const nav = useNavigate();
//   const { state } = useLocation();

//   // The id comes from the click on the Find Pharmacy page (router state), not from the URL.
//   // sessionStorage keeps it across a refresh of this page.
//   const id = state?.orgId ?? sessionStorage.getItem(ID_KEY);
//   useEffect(() => { if (state?.orgId) sessionStorage.setItem(ID_KEY, state.orgId); }, [state]);

//   const [org, setOrg] = useState(null);
//   const [reviews, setReviews] = useState(null);
//   const [error, setError] = useState('');
//   const [chatBusy, setChatBusy] = useState(false);
//   const [editing, setEditing] = useState(false);
//   const [note, setNote] = useState('');

//   const loadReviews = useCallback(() => {
//     if (!id) return Promise.resolve();
//     return api.get(`/reviews/organization/${id}`, { params: { limit: 10 } })
//       .then((r) => {
//         const d = pick(r);
//         setReviews({
//           reviews: d?.reviews || [],
//           summary: d?.summary || r.data?.summary || { average: 0, count: 0, distribution: {} },
//         });
//       })
//       .catch(() => setReviews({ reviews: [], summary: { average: 0, count: 0, distribution: {} } }));
//   }, [id]);

//   const loadOrg = useCallback(() => {
//     if (!id) return Promise.resolve();
//     return api.get(`/pharmacies/${id}`).then((r) => setOrg(pick(r))).catch((e) => setError(getErrorMessage(e)));
//   }, [id]);

//   useEffect(() => {
//     if (!id) return;
//     setOrg(null); setReviews(null); setError('');
//     loadOrg(); loadReviews();
//     api.post(`/interactions/organization/${id}/view`).catch(() => {}); // counted once per viewer per day
//   }, [id, loadOrg, loadReviews]);

//   const like = async () => {
//     try {
//       const r = pick(await api.post(`/interactions/organization/${id}/like`));
//       setOrg((o) => ({ ...o, isLiked: r.liked, likesCount: r.likesCount }));
//     } catch (e) { setNote(getErrorMessage(e)); }
//   };

//   const share = async () => {
//     const r = await shareOrg(org);
//     if (r) {
//       setNote(r.channel === 'copy_link' ? 'Link copied' : '');
//       if (r.sharesCount != null) setOrg((o) => ({ ...o, sharesCount: r.sharesCount }));
//     }
//   };

//   const startChat = async () => {
//     setChatBusy(true); setNote('');
//     try {
//       const r = await api.post('/pharmacy-chat/rooms', { pharmacyId: id });
//       const room = pick(r);
//       nav(`/chat/pharmacy/${room._id}`);
//     } catch (e) {
//       if (e.response?.status === 402 || /chat pass/i.test(getErrorMessage(e))) nav('/chat/pharmacy?need=pass');
//       else setNote(getErrorMessage(e));
//     } finally { setChatBusy(false); }
//   };

//   const onReviewSaved = (body) => {
//     setEditing(false);
//     loadOrg(); loadReviews();
//     const awarded = body?.loyalty?.awarded ?? body?.data?.loyalty?.awarded;
//     if (awarded) setNote(`Thanks for your review. You earned ${awarded} points.`);
//   };

//   if (!id) return <PageShell className="max-w-3xl"><EmptyState icon="search" title="No pharmacy selected" body="Pick a pharmacy from the list to view it." /></PageShell>;
//   if (error) return <PageShell className="max-w-3xl"><EmptyState icon="search" title="Pharmacy not found" body={error} /></PageShell>;
//   if (!org) return <PageShell className="max-w-3xl"><Skeleton className="h-64 rounded-2xl" /></PageShell>;

//   const dist = reviews?.summary?.distribution || {};
//   const total = reviews?.summary?.count || 0;

//   return (
//     <PageShell className="max-w-3xl">
//       <PageHeader title={org.name} subtitle={addressLine(org.address)} />
//       <div className="space-y-4">
//         <Card className="space-y-4">
//           <div className="flex items-center gap-3">
//             {org.logo?.url ? <img src={org.logo.url} alt="" className="h-14 w-14 rounded-full object-cover" /> : <Avatar tone="pharmacy" name={org.name} />}
//             <div>
//               <div className="flex items-center gap-2"><Stars value={org.ratingAverage} size="text-lg" /><span className="text-sm text-gray-600">{org.ratingCount ? `${org.ratingAverage} from ${org.ratingCount} review${org.ratingCount > 1 ? 's' : ''}` : 'No reviews yet'}</span></div>
//               <div className="mt-1 flex flex-wrap gap-1.5">{org.is24Hours && <Pill tone="success">Open 24 hours</Pill>}{org.offersDelivery && <Pill tone="info">Delivers</Pill>}</div>
//             </div>
//           </div>
//           {org.about && <p className="text-sm leading-relaxed text-gray-700">{org.about}</p>}
//           <dl className="grid gap-3 text-sm sm:grid-cols-2">
//             {org.openingHours && <div><dt className="text-gray-500">Opening hours</dt><dd className="font-medium text-navy-900">{org.openingHours}</dd></div>}
//             {org.phone && <div><dt className="text-gray-500">Phone</dt><dd><a href={`tel:${org.phone}`} className="font-medium text-pharmacy-700">{org.phone}</a></dd></div>}
//           </dl>
//           <div className="flex flex-wrap gap-2">
//             <button type="button" onClick={startChat} disabled={chatBusy} className={primaryBtn}>{chatBusy ? 'Opening…' : 'Chat with a pharmacist'}</button>
//             <button type="button" onClick={like} aria-pressed={org.isLiked} className={org.isLiked ? `${primaryBtn} !bg-pharmacy-700` : ghostBtn}>{org.isLiked ? '♥' : '♡'} {org.likesCount || 0}</button>
//             <button type="button" onClick={share} className={ghostBtn}>Share{org.sharesCount ? ` · ${org.sharesCount}` : ''}</button>
//           </div>
//           {note && <p role="status" className="text-sm text-gray-700">{note}</p>}
//           <p className="text-xs text-gray-500">{org.viewsCount || 0} views</p>
//         </Card>

//         <Card className="space-y-4">
//           <h2 className="font-semibold text-navy-900">Reviews</h2>
//           {org.myReview && !editing ? (
//             <div className="rounded-xl bg-pharmacy-50 p-3 text-sm">
//               <p className="font-medium text-navy-900">Your review</p>
//               <Stars value={org.myReview.rating} />
//               {org.myReview.comment && <p className="mt-1 text-gray-700">{org.myReview.comment}</p>}
//               <button type="button" onClick={() => setEditing(true)} className="mt-2 font-medium text-pharmacy-700">Edit</button>
//             </div>
//           ) : org.myReview && editing ? (
//             <ReviewForm orgId={id} existing={org.myReview} onSaved={onReviewSaved} onCancel={() => setEditing(false)} />
//           ) : org.canReview ? (
//             <div className="rounded-xl bg-pharmacy-50 p-4"><p className="mb-3 text-sm font-medium text-navy-900">The pharmacy attended to you. How was it?</p><ReviewForm orgId={id} onSaved={onReviewSaved} /></div>
//           ) : (
//             <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">You can review this pharmacy after it has attended to you, either by dispensing your prescription or answering your chat.</p>
//           )}

//           {total > 0 && (
//             <ul className="space-y-1.5" aria-label="Rating breakdown">
//               {[5, 4, 3, 2, 1].map((n) => (
//                 <li key={n} className="flex items-center gap-2 text-xs text-gray-600">
//                   <span className="w-3">{n}</span>
//                   <div className="h-2 flex-1 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-warning" style={{ width: `${((dist[n] || 0) / total) * 100}%` }} /></div>
//                   <span className="w-6 text-right">{dist[n] || 0}</span>
//                 </li>
//               ))}
//             </ul>
//           )}

//           {!reviews ? <Skeleton className="h-20 rounded-xl" /> : reviews.reviews.length === 0 ? <p className="text-sm text-gray-600">No reviews yet.</p> : (
//             <ul className="divide-y divide-gray-100">
//               {reviews.reviews.map((r) => (
//                 <li key={r._id} className="space-y-1 py-3 text-sm">
//                   <div className="flex items-center justify-between gap-2">
//                     <span className="font-medium text-navy-900">{r.reviewer?.fullName || 'Patient'}</span>
//                     <span className="text-xs text-gray-500">{fmtDate(r.createdAt)}</span>
//                   </div>
//                   <div className="flex items-center gap-2"><Stars value={r.rating} />{r.isVerifiedVisit && <Pill tone="success">Attended to</Pill>}</div>
//                   {r.title && <p className="font-medium text-navy-900">{r.title}</p>}
//                   {r.comment && <p className="text-gray-700">{r.comment}</p>}
//                   {r.reply?.text && <div className="mt-2 rounded-xl bg-gray-50 p-3"><p className="text-xs font-medium text-gray-600">Reply from the pharmacy</p><p className="text-gray-700">{r.reply.text}</p></div>}
//                 </li>
//               ))}
//             </ul>
//           )}
//         </Card>
//         <p className="text-center text-sm"><Link to="/pharmacies" className="font-medium text-pharmacy-700">Back to all pharmacies</Link></p>
//       </div>
//     </PageShell>
//   );
// }

























import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, CalendarDays, Clock, Eye, FileCheck2, Heart, Mail, MapPin,
  MessageCircle, Navigation, Phone, Pill as PillIcon, Share2, Star, Store, Truck, Users, Layers,
} from 'lucide-react';
import api, { getErrorMessage } from './api';
import { EmptyState, ErrorNote, PageShell, Skeleton } from '../appointments/ui';
import { shareOrg } from './FindPharmacyPage';

/* ------------------------------------------------------------------ */
/* Local helpers (this page does not depend on PharmacyShared)         */
/* ------------------------------------------------------------------ */

const ID_KEY = 'pharmacyId';
const BACK_TO_LIST = '/dashboard?tab=find-pharmacy';

// axios gives { data: <response body> }. The body may be { data: ... } or the payload itself.
const pick = (r) => r?.data?.data ?? r?.data;

const addressLine = (a = {}) => [a.street, a.city, a.state, a.country].filter(Boolean).join(', ');

const initials = (name = '') =>
  name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';

const fmtDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtCount = (n) => new Intl.NumberFormat(undefined, { notation: 'compact' }).format(n || 0);

const field =
  'w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-navy-900 placeholder:text-gray-400 ' +
  'focus:border-pharmacy-600 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/25';

const primaryBtn =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-pharmacy-600 px-4 text-sm font-semibold text-white ' +
  'shadow-sm transition-colors hover:bg-pharmacy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pharmacy-500/50 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const ghostBtn =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-navy-900 ' +
  'transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pharmacy-500/50 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

function Stars({ value = 0, className = 'text-base' }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <span className={`inline-flex leading-none ${className}`} role="img" aria-label={`${Number(value) || 0} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden="true" className={i <= n ? 'text-amber-400' : 'text-gray-300'}>★</span>
      ))}
    </span>
  );
}

const PILL_TONES = {
  success: 'bg-green-50 text-green-700 ring-green-600/15',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  warn: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  neutral: 'bg-gray-100 text-gray-700 ring-gray-500/10',
  glass: 'bg-white/15 text-white ring-white/25',
};

function Pill({ tone = 'neutral', icon: Icon, children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${PILL_TONES[tone] || PILL_TONES.neutral}`}>
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

function Initials({ name, className = 'h-10 w-10 text-sm' }) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-pharmacy-50 font-semibold text-pharmacy-700 ${className}`}>
      {initials(name)}
    </span>
  );
}

function Section({ icon: Icon, title, children, className = '' }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-6 ${className}`}>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy-900">
        {Icon && <Icon className="h-[18px] w-[18px] text-pharmacy-600" aria-hidden="true" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pharmacy-50 text-pharmacy-700">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="break-words text-sm font-medium text-navy-900">{children}</div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1 py-1 text-center">
      <Icon className="h-4 w-4 text-pharmacy-600" aria-hidden="true" />
      <span className="text-base font-semibold text-navy-900 sm:text-lg">{value}</span>
      <span className="text-[11px] text-gray-500 sm:text-xs">{label}</span>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <PageShell className="max-w-5xl">
      <div className="space-y-4">
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Review form                                                         */
/* ------------------------------------------------------------------ */

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

function ReviewForm({ orgId, existing, onSaved, onCancel }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [title, setTitle] = useState(existing?.title || '');
  const [comment, setComment] = useState(existing?.comment || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Choose a star rating.');
    setBusy(true); setError('');
    try {
      // axios sends the payload from `data`, not `body`
      const payload = { rating, title, comment };
      const r = existing
        ? await api.patch(`/reviews/${existing._id}`, payload)
        : await api.post(`/reviews/organization/${orgId}`, payload);
      onSaved(r.data);
    } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorNote>{error}</ErrorNote>
      <div>
        <div role="radiogroup" aria-label="Your rating" className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => setRating(n)}
              className={`h-11 w-11 rounded-full text-3xl leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pharmacy-500/50 ${n <= rating ? 'text-amber-400' : 'text-gray-300'} hover:bg-amber-50`}
            >★</button>
          ))}
          {rating > 0 && <span className="ml-2 text-sm font-medium text-gray-600">{RATING_WORDS[rating]}</span>}
        </div>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-navy-900">Headline</span>
        <input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={`${field} h-11`} placeholder="Quick and helpful" />
      </label>
      <label className="block space-y-1">
        <span className="flex items-center justify-between text-sm font-medium text-navy-900">
          Your experience <span className="text-xs font-normal text-gray-500">{comment.length}/2000</span>
        </span>
        <textarea maxLength={2000} rows={4} value={comment} onChange={(e) => setComment(e.target.value)} className={`${field} py-2`}
          placeholder="Were they friendly, was the drug in stock, did they explain how to take it?" />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Saving…' : existing ? 'Save changes' : 'Post review'}</button>
        {onCancel && <button type="button" onClick={onCancel} className={ghostBtn}>Cancel</button>}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const EMPTY_SUMMARY = { average: 0, count: 0, distribution: {} };
const PAGE_SIZE = 10;

export default function PharmacyProfilePage() {
  const nav = useNavigate();
  const { state } = useLocation();

  // The id comes from the click on the Find Pharmacy page (router state), not from the URL.
  // sessionStorage keeps it across a refresh of this page.
  const id = state?.orgId ?? sessionStorage.getItem(ID_KEY);
  useEffect(() => { if (state?.orgId) sessionStorage.setItem(ID_KEY, state.orgId); }, [state]);

  const [org, setOrg] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState('');
  const limitRef = useRef(PAGE_SIZE);

  const loadReviews = useCallback(() => {
    if (!id) return Promise.resolve();
    return api.get(`/reviews/organization/${id}`, { params: { limit: limitRef.current } })
      .then((r) => {
        const d = pick(r);
        setReviews({
          reviews: d?.reviews || [],
          summary: d?.summary || r.data?.summary || EMPTY_SUMMARY,
        });
      })
      .catch(() => setReviews((cur) => cur ?? { reviews: [], summary: EMPTY_SUMMARY }));
  }, [id]);

  const loadOrg = useCallback(() => {
    if (!id) return Promise.resolve();
    return api.get(`/pharmacies/${id}`).then((r) => setOrg(pick(r))).catch((e) => setError(getErrorMessage(e)));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    limitRef.current = PAGE_SIZE;
    setOrg(null); setReviews(null); setError('');
    loadOrg(); loadReviews();
    api.post(`/interactions/organization/${id}/view`).catch(() => {}); // counted once per viewer per day
  }, [id, loadOrg, loadReviews]);

  const showMore = async () => {
    setMoreBusy(true);
    limitRef.current += PAGE_SIZE;
    await loadReviews();
    setMoreBusy(false);
  };

  const like = async () => {
    try {
      const r = pick(await api.post(`/interactions/organization/${id}/like`));
      setOrg((o) => ({ ...o, isLiked: r.liked, likesCount: r.likesCount }));
    } catch (e) { setNote(getErrorMessage(e)); }
  };

  const share = async () => {
    const r = await shareOrg(org);
    if (r) {
      setNote(r.channel === 'copy_link' ? 'Link copied' : '');
      if (r.sharesCount != null) setOrg((o) => ({ ...o, sharesCount: r.sharesCount }));
    }
  };

  const startChat = async () => {
    setChatBusy(true); setNote('');
    try {
      const r = await api.post('/pharmacy-chat/rooms', { pharmacyId: id });
      const room = pick(r);
      nav(`/chat/pharmacy/${room._id}`);
    } catch (e) {
      if (e.response?.status === 402 || /chat pass/i.test(getErrorMessage(e))) nav('/chat/pharmacy?need=pass');
      else setNote(getErrorMessage(e));
    } finally { setChatBusy(false); }
  };

  const onReviewSaved = (body) => {
    setEditing(false);
    loadOrg(); loadReviews();
    const awarded = body?.loyalty?.awarded ?? body?.data?.loyalty?.awarded;
    if (awarded) setNote(`Thanks for your review. You earned ${awarded} points.`);
  };

  if (!id) return <PageShell className="max-w-5xl"><EmptyState icon="search" title="No pharmacy selected" body="Pick a pharmacy from the list to view it." /></PageShell>;
  if (error) return <PageShell className="max-w-5xl"><EmptyState icon="search" title="Pharmacy not found" body={error} /></PageShell>;
  if (!org) return <ProfileSkeleton />;

  const summary = reviews?.summary || EMPTY_SUMMARY;
  const dist = summary.distribution || {};
  const total = summary.count || org.ratingCount || 0;
  const average = Number(summary.average || org.ratingAverage || 0);
  const address = addressLine(org.address);
  const coords = org.coordinates?.lat != null && org.coordinates?.lng != null ? org.coordinates : null;
  const mapsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    : address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${org.name} ${address}`)}` : null;
  const staff = Array.isArray(org.staff) ? org.staff : [];
  const hasCredentials = org.registrationNumber || org.licenseNumber;
  const reviewList = reviews?.reviews || [];

  return (
    <PageShell className="max-w-5xl">
      {/* ---------- Hero ---------- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pharmacy-900 via-pharmacy-700 to-pharmacy-500 text-white">
        <svg aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 text-white/10 sm:h-80 sm:w-80" viewBox="0 0 100 100" fill="currentColor">
          <path d="M38 6h24v32h32v24H62v32H38V62H6V38h32z" />
        </svg>
        <div className="relative px-5 pb-16 pt-5 sm:px-8 sm:pb-20 sm:pt-6">
          <Link to={BACK_TO_LIST} className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All pharmacies
          </Link>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {org.logo?.url ? (
              <img src={org.logo.url} alt={`${org.name} logo`} className="h-20 w-20 shrink-0 rounded-2xl bg-white object-cover p-1 shadow-lg ring-4 ring-white/25 sm:h-24 sm:w-24" />
            ) : (
              <span aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-pharmacy-700 shadow-lg ring-4 ring-white/25 sm:h-24 sm:w-24 sm:text-3xl">
                {initials(org.name)}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill tone="glass" icon={Store}>Pharmacy</Pill>
                {org.status === 'approved'
                  ? <Pill tone="glass" icon={BadgeCheck}>Verified</Pill>
                  : org.status && <Pill tone="warn">{org.status === 'suspended' ? 'Suspended' : 'Pending approval'}</Pill>}
                {org.is24Hours && <Pill tone="glass" icon={Clock}>Open 24 hours</Pill>}
              </div>
              <h1 className="mt-2 break-words text-2xl font-semibold leading-tight sm:text-3xl">{org.name}</h1>
              {address && (
                <p className="mt-1 flex items-start gap-1.5 text-sm text-white/85">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> <span>{address}</span>
                </p>
              )}
              <div className="mt-2 flex items-center gap-2 text-sm text-white/90">
                <Stars value={average} className="text-lg" />
                <span>{total ? `${average.toFixed(1)} from ${total} review${total > 1 ? 's' : ''}` : 'No reviews yet'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Actions + stats (overlaps the hero) ---------- */}
      <div className="relative z-10 -mt-10 space-y-4 rounded-2xl bg-white p-4 shadow-md ring-1 ring-gray-100 sm:mx-6 sm:p-5">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button type="button" onClick={startChat} disabled={chatBusy} className={`${primaryBtn} col-span-2 sm:col-span-1`}>
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> {chatBusy ? 'Opening…' : 'Chat with a pharmacist'}
          </button>
          <button
            type="button" onClick={like} aria-pressed={!!org.isLiked}
            className={org.isLiked
              ? `${primaryBtn} !bg-rose-500 hover:!bg-rose-600`
              : ghostBtn}
          >
            <Heart className={`h-4 w-4 ${org.isLiked ? 'fill-current' : ''}`} aria-hidden="true" /> {org.isLiked ? 'Liked' : 'Like'}
          </button>
          <button type="button" onClick={share} className={ghostBtn}>
            <Share2 className="h-4 w-4" aria-hidden="true" /> Share
          </button>
          {org.phone && (
            <a href={`tel:${org.phone}`} className={ghostBtn}><Phone className="h-4 w-4" aria-hidden="true" /> Call</a>
          )}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={ghostBtn}>
              <Navigation className="h-4 w-4" aria-hidden="true" /> Directions
            </a>
          )}
        </div>
        {note && <p role="status" className="rounded-xl bg-pharmacy-50 px-3 py-2 text-sm text-pharmacy-700">{note}</p>}

        <div className="grid grid-cols-4 divide-x divide-gray-100 border-t border-gray-100 pt-3">
          <Stat icon={Star} value={total ? average.toFixed(1) : '–'} label="Rating" />
          <Stat icon={Heart} value={fmtCount(org.likesCount)} label="Likes" />
          <Stat icon={Share2} value={fmtCount(org.sharesCount)} label="Shares" />
          <Stat icon={Eye} value={fmtCount(org.viewsCount)} label="Views" />
        </div>
      </div>

      {/* ---------- Details ---------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section icon={PillIcon} title="About this pharmacy">
            {org.about
              ? <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{org.about}</p>
              : <p className="text-sm text-gray-500">This pharmacy has not added a description yet.</p>}
          </Section>

          <Section icon={BadgeCheck} title="Services and features">
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                { on: org.is24Hours, icon: Clock, title: 'Open 24 hours', yes: 'Open day and night', no: 'Not open around the clock' },
                { on: org.offersDelivery, icon: Truck, title: 'Home delivery', yes: 'Delivers to your address', no: 'Pick up in store only' },
                { on: true, icon: MessageCircle, title: 'Pharmacist chat', yes: 'Ask a pharmacist a question', no: '' },
                { on: org.status === 'approved', icon: BadgeCheck, title: 'Verified listing', yes: 'Approved on the platform', no: 'Awaiting approval' },
              ].map((f) => (
                <li key={f.title} className={`flex items-start gap-3 rounded-xl p-3 ring-1 ${f.on ? 'bg-pharmacy-50 ring-pharmacy-500/15' : 'bg-gray-50 ring-gray-100'}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${f.on ? 'bg-white text-pharmacy-700' : 'bg-white text-gray-400'}`}>
                    <f.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${f.on ? 'text-navy-900' : 'text-gray-500'}`}>{f.title}</p>
                    <p className="text-xs text-gray-500">{f.on ? f.yes : f.no}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          {org.departments?.length > 0 && (
            <Section icon={Layers} title="Departments">
              <ul className="flex flex-wrap gap-2">
                {org.departments.map((d) => (
                  <li key={d} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">{d}</li>
                ))}
              </ul>
            </Section>
          )}

          {staff.length > 0 && (
            <Section icon={Users} title="Pharmacy team">
              <ul className="grid gap-3 sm:grid-cols-2">
                {staff.map((s, i) => {
                  const name = s.user?.fullName ?? s.fullName ?? 'Pharmacist';
                  const avatar = s.user?.avatar?.url ?? s.avatar?.url;
                  return (
                    <li key={s._id ?? i} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                      {avatar
                        ? <img src={avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                        : <Initials name={name} />}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-navy-900">{name}</p>
                        <p className="truncate text-xs text-gray-500">{[s.designation, s.department].filter(Boolean).join(', ') || 'Pharmacy staff'}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}
        </div>

        {/* Sidebar: first on mobile so contact details are never buried */}
        <aside className="order-first space-y-6 lg:order-none">
          <Section icon={Phone} title="Contact and hours">
            <div className="space-y-4">
              {org.openingHours && <InfoRow icon={Clock} label="Opening hours">{org.is24Hours ? 'Open 24 hours' : org.openingHours}</InfoRow>}
              {!org.openingHours && org.is24Hours && <InfoRow icon={Clock} label="Opening hours">Open 24 hours</InfoRow>}
              {org.phone && (
                <InfoRow icon={Phone} label="Phone">
                  <a href={`tel:${org.phone}`} className="text-pharmacy-700 hover:underline">{org.phone}</a>
                </InfoRow>
              )}
              {org.email && (
                <InfoRow icon={Mail} label="Email">
                  <a href={`mailto:${org.email}`} className="text-pharmacy-700 hover:underline">{org.email}</a>
                </InfoRow>
              )}
              {address && (
                <InfoRow icon={MapPin} label="Address">
                  {address}
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-xs font-medium text-pharmacy-700 hover:underline">
                      <Navigation className="h-3.5 w-3.5" aria-hidden="true" /> Get directions
                    </a>
                  )}
                </InfoRow>
              )}
              {!org.openingHours && !org.is24Hours && !org.phone && !org.email && !address && (
                <p className="text-sm text-gray-500">No contact details listed.</p>
              )}
            </div>
          </Section>

          {(hasCredentials || org.createdAt) && (
            <Section icon={FileCheck2} title="Credentials">
              <div className="space-y-4">
                {org.registrationNumber && <InfoRow icon={FileCheck2} label="Registration number">{org.registrationNumber}</InfoRow>}
                {org.licenseNumber && <InfoRow icon={BadgeCheck} label="Licence number">{org.licenseNumber}</InfoRow>}
                {org.createdAt && <InfoRow icon={CalendarDays} label="On eMedicals since">{fmtDate(org.createdAt)}</InfoRow>}
              </div>
            </Section>
          )}
        </aside>
      </div>

      {/* ---------- Reviews ---------- */}
      <Section icon={Star} title="Reviews" className="mt-6">
        <div className="grid gap-6 md:grid-cols-[16rem_1fr] md:gap-8">
          {/* Summary */}
          <div>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-semibold leading-none text-navy-900">{total ? average.toFixed(1) : '–'}</span>
              <span className="pb-1 text-sm text-gray-500">out of 5</span>
            </div>
            <div className="mt-2"><Stars value={average} className="text-xl" /></div>
            <p className="mt-1 text-sm text-gray-600">{total ? `${total} review${total > 1 ? 's' : ''}` : 'No reviews yet'}</p>

            {total > 0 && (
              <ul className="mt-4 space-y-1.5" aria-label="Rating breakdown">
                {[5, 4, 3, 2, 1].map((n) => (
                  <li key={n} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-3 text-right">{n}</span>
                    <span aria-hidden="true" className="text-amber-400">★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-amber-400" style={{ width: `${((dist[n] || 0) / total) * 100}%` }} />
                    </div>
                    <span className="w-6 text-right tabular-nums">{dist[n] || 0}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Write + list */}
          <div className="min-w-0 space-y-5">
            {org.myReview && !editing ? (
              <div className="rounded-xl bg-pharmacy-50 p-4 text-sm ring-1 ring-pharmacy-500/15">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-navy-900">Your review</p>
                  <button type="button" onClick={() => setEditing(true)} className="rounded-lg px-2 py-1 font-medium text-pharmacy-700 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pharmacy-500/50">Edit</button>
                </div>
                <div className="mt-1"><Stars value={org.myReview.rating} /></div>
                {org.myReview.title && <p className="mt-2 font-medium text-navy-900">{org.myReview.title}</p>}
                {org.myReview.comment && <p className="mt-1 text-gray-700">{org.myReview.comment}</p>}
              </div>
            ) : org.myReview && editing ? (
              <div className="rounded-xl bg-pharmacy-50 p-4 ring-1 ring-pharmacy-500/15">
                <ReviewForm orgId={id} existing={org.myReview} onSaved={onReviewSaved} onCancel={() => setEditing(false)} />
              </div>
            ) : org.canReview ? (
              <div className="rounded-xl bg-pharmacy-50 p-4 ring-1 ring-pharmacy-500/15">
                <p className="mb-3 text-sm font-medium text-navy-900">The pharmacy attended to you. How was it?</p>
                <ReviewForm orgId={id} onSaved={onReviewSaved} />
              </div>
            ) : (
              <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                You can review this pharmacy after it has attended to you, either by dispensing your prescription or answering your chat.
              </p>
            )}

            {!reviews ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : reviewList.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">No reviews yet. Be the first to share your experience.</p>
            ) : (
              <>
                <ul className="divide-y divide-gray-100">
                  {reviewList.map((r) => (
                    <li key={r._id} className="flex gap-3 py-4 first:pt-0">
                      <Initials name={r.reviewer?.fullName || 'Patient'} />
                      <div className="min-w-0 flex-1 space-y-1.5 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <span className="font-medium text-navy-900">{r.reviewer?.fullName || 'Patient'}</span>
                          <time className="text-xs text-gray-500" dateTime={r.createdAt}>{fmtDate(r.createdAt)}</time>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Stars value={r.rating} />
                          {r.isVerifiedVisit && <Pill tone="success" icon={BadgeCheck}>Attended to</Pill>}
                        </div>
                        {r.title && <p className="font-medium text-navy-900">{r.title}</p>}
                        {r.comment && <p className="whitespace-pre-line break-words text-gray-700">{r.comment}</p>}
                        {r.reply?.text && (
                          <div className="mt-2 rounded-xl border-l-4 border-pharmacy-500 bg-pharmacy-50 p-3">
                            <p className="text-xs font-medium text-pharmacy-700">
                              Reply from {org.name}{r.reply.repliedAt ? `, ${fmtDate(r.reply.repliedAt)}` : ''}
                            </p>
                            <p className="mt-1 break-words text-gray-700">{r.reply.text}</p>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {reviewList.length < total && (
                  <button type="button" onClick={showMore} disabled={moreBusy} className={`${ghostBtn} w-full sm:w-auto`}>
                    {moreBusy ? 'Loading…' : 'Show more reviews'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </Section>
    </PageShell>
  );
}