import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import  api  from './api';
import { Avatar, Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../appointments/ui';
import { Field, Pill, Stars, field, fmtDate, ghostBtn, primaryBtn } from './PharmacyShared';
import { addressLine, shareOrg } from './FindPharmacyPage';

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
      const r = existing
        ? await api(`/reviews/${existing._id}`, { method: 'PATCH', body: { rating, title, comment } })
        : await api(`/reviews/organization/${orgId}`, { method: 'POST', body: { rating, title, comment } });
      onSaved(r);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <ErrorNote>{error}</ErrorNote>
      <div role="radiogroup" aria-label="Your rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)}
            className={`h-11 w-11 rounded-full text-2xl ${n <= rating ? 'text-warning' : 'text-gray-300'} hover:bg-warning-light`}>★</button>
        ))}
      </div>
      <Field label="Headline"><input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={`${field} h-11`} placeholder="Quick and helpful" /></Field>
      <Field label="Your experience"><textarea maxLength={2000} rows={4} value={comment} onChange={(e) => setComment(e.target.value)} className={`${field} py-2`} placeholder="Were they friendly, was the drug in stock, did they explain how to take it?" /></Field>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Saving…' : existing ? 'Save changes' : 'Post review'}</button>
        {onCancel && <button type="button" onClick={onCancel} className={ghostBtn}>Cancel</button>}
      </div>
    </form>
  );
}

export default function PharmacyProfilePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [org, setOrg] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState('');

  const loadReviews = useCallback(() => api(`/reviews/organization/${id}`, { params: { limit: 10 } }).then(setReviews).catch(() => setReviews({ reviews: [], summary: { average: 0, count: 0, distribution: {} } })), [id]);
  const loadOrg = useCallback(() => api(`/pharmacies/${id}`).then((r) => setOrg(r.data)).catch((e) => setError(e.message)), [id]);

  useEffect(() => {
    loadOrg(); loadReviews();
    api(`/interactions/organization/${id}/view`, { method: 'POST' }).catch(() => {}); // counted once per viewer per day
  }, [id, loadOrg, loadReviews]);

  const like = async () => {
    try { const r = await api(`/interactions/organization/${id}/like`, { method: 'POST' }); setOrg((o) => ({ ...o, isLiked: r.liked, likesCount: r.likesCount })); }
    catch (e) { setNote(e.message); }
  };
  const share = async () => { const r = await shareOrg(org); if (r) { setNote(r.channel === 'copy_link' ? 'Link copied' : ''); if (r.sharesCount != null) setOrg((o) => ({ ...o, sharesCount: r.sharesCount })); } };

  const startChat = async () => {
    setChatBusy(true); setNote('');
    try {
      const r = await api('/pharmacy-chat/rooms', { method: 'POST', body: { pharmacyId: id } });
      nav(`/chat/pharmacy/${r.data._id}`);
    } catch (e) {
      if (e.status === 402 || /chat pass/i.test(e.message)) nav('/chat/pharmacy?need=pass');
      else setNote(e.message);
    } finally { setChatBusy(false); }
  };

  const onReviewSaved = (r) => {
    setEditing(false);
    loadOrg(); loadReviews();
    if (r.loyalty?.awarded) setNote(`Thanks for your review. You earned ${r.loyalty.awarded} points.`);
  };

  if (error) return <PageShell className="max-w-3xl"><EmptyState icon="search" title="Pharmacy not found" body={error} /></PageShell>;
  if (!org) return <PageShell className="max-w-3xl"><Skeleton className="h-64 rounded-2xl" /></PageShell>;

  const dist = reviews?.summary?.distribution || {};
  const total = reviews?.summary?.count || 0;

  return (
    <PageShell className="max-w-3xl">
      <PageHeader title={org.name} subtitle={addressLine(org.address)} />
      <div className="space-y-4">
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            {org.logo?.url ? <img src={org.logo.url} alt="" className="h-14 w-14 rounded-full object-cover" /> : <Avatar tone="pharmacy" name={org.name} />}
            <div>
              <div className="flex items-center gap-2"><Stars value={org.ratingAverage} size="text-lg" /><span className="text-sm text-gray-600">{org.ratingCount ? `${org.ratingAverage} from ${org.ratingCount} review${org.ratingCount > 1 ? 's' : ''}` : 'No reviews yet'}</span></div>
              <div className="mt-1 flex flex-wrap gap-1.5">{org.is24Hours && <Pill tone="success">Open 24 hours</Pill>}{org.offersDelivery && <Pill tone="info">Delivers</Pill>}</div>
            </div>
          </div>
          {org.about && <p className="text-sm leading-relaxed text-gray-700">{org.about}</p>}
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {org.openingHours && <div><dt className="text-gray-500">Opening hours</dt><dd className="font-medium text-navy-900">{org.openingHours}</dd></div>}
            {org.phone && <div><dt className="text-gray-500">Phone</dt><dd><a href={`tel:${org.phone}`} className="font-medium text-pharmacy-700">{org.phone}</a></dd></div>}
          </dl>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={startChat} disabled={chatBusy} className={primaryBtn}>{chatBusy ? 'Opening…' : 'Chat with a pharmacist'}</button>
            <button type="button" onClick={like} aria-pressed={org.isLiked} className={org.isLiked ? `${primaryBtn} !bg-pharmacy-700` : ghostBtn}>{org.isLiked ? '♥' : '♡'} {org.likesCount || 0}</button>
            <button type="button" onClick={share} className={ghostBtn}>Share{org.sharesCount ? ` · ${org.sharesCount}` : ''}</button>
          </div>
          {note && <p role="status" className="text-sm text-gray-700">{note}</p>}
          <p className="text-xs text-gray-500">{org.viewsCount || 0} views</p>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold text-navy-900">Reviews</h2>
          {org.myReview && !editing ? (
            <div className="rounded-xl bg-pharmacy-50 p-3 text-sm">
              <p className="font-medium text-navy-900">Your review</p>
              <Stars value={org.myReview.rating} />
              {org.myReview.comment && <p className="mt-1 text-gray-700">{org.myReview.comment}</p>}
              <button type="button" onClick={() => setEditing(true)} className="mt-2 font-medium text-pharmacy-700">Edit</button>
            </div>
          ) : org.myReview && editing ? (
            <ReviewForm orgId={id} existing={org.myReview} onSaved={onReviewSaved} onCancel={() => setEditing(false)} />
          ) : org.canReview ? (
            <div className="rounded-xl bg-pharmacy-50 p-4"><p className="mb-3 text-sm font-medium text-navy-900">The pharmacy attended to you. How was it?</p><ReviewForm orgId={id} onSaved={onReviewSaved} /></div>
          ) : (
            <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">You can review this pharmacy after it has attended to you, either by dispensing your prescription or answering your chat.</p>
          )}

          {total > 0 && (
            <ul className="space-y-1.5" aria-label="Rating breakdown">
              {[5, 4, 3, 2, 1].map((n) => (
                <li key={n} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-3">{n}</span>
                  <div className="h-2 flex-1 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-warning" style={{ width: `${((dist[n] || 0) / total) * 100}%` }} /></div>
                  <span className="w-6 text-right">{dist[n] || 0}</span>
                </li>
              ))}
            </ul>
          )}

          {!reviews ? <Skeleton className="h-20 rounded-xl" /> : reviews.reviews.length === 0 ? <p className="text-sm text-gray-600">No reviews yet.</p> : (
            <ul className="divide-y divide-gray-100">
              {reviews.reviews.map((r) => (
                <li key={r._id} className="space-y-1 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-navy-900">{r.reviewer?.fullName || 'Patient'}</span>
                    <span className="text-xs text-gray-500">{fmtDate(r.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2"><Stars value={r.rating} />{r.isVerifiedVisit && <Pill tone="success">Attended to</Pill>}</div>
                  {r.title && <p className="font-medium text-navy-900">{r.title}</p>}
                  {r.comment && <p className="text-gray-700">{r.comment}</p>}
                  {r.reply?.text && <div className="mt-2 rounded-xl bg-gray-50 p-3"><p className="text-xs font-medium text-gray-600">Reply from the pharmacy</p><p className="text-gray-700">{r.reply.text}</p></div>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <p className="text-center text-sm"><Link to="/pharmacies" className="font-medium text-pharmacy-700">Back to all pharmacies</Link></p>
      </div>
    </PageShell>
  );
}