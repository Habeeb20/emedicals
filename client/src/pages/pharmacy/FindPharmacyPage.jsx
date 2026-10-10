import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import  api from './api';
import { useDebounced } from '../appointments/hooks';

import { Avatar, Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../appointments/ui';
import { Pill, Stars, field, ghostBtn } from './PharmacyShared';

const SORTS = [
  { id: 'rating', label: 'Top rated' },
  { id: 'likes', label: 'Most liked' },
  { id: 'views', label: 'Most viewed' },
  { id: 'nearest', label: 'Nearest to me' },
];

// Shared by the list and the profile page
export async function shareOrg(org) {
  const url = `${window.location.origin}/pharmacies/${org._id}`;
  let channel = 'copy_link';
  try {
    if (navigator.share) { await navigator.share({ title: org.name, text: `Check out ${org.name} on eMedicals`, url }); channel = 'other'; }
    else { await navigator.clipboard.writeText(url); }
  } catch (e) { if (e?.name === 'AbortError') return null; }
  try { const r = await api(`/interactions/organization/${org._id}/share`, { method: 'POST', body: { channel } }); return { channel, sharesCount: r.sharesCount }; }
  catch { return { channel }; }
}

export const addressLine = (a = {}) => [a.street, a.city, a.state].filter(Boolean).join(', ');

export function PharmacyCard({ org, onChange }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const like = async () => {
    setBusy(true); setNote('');
    try {
      const r = await api(`/interactions/organization/${org._id}/like`, { method: 'POST' });
      onChange({ ...org, isLiked: r.liked, likesCount: r.likesCount });
    } catch (e) { setNote(e.message); } finally { setBusy(false); }
  };
  const share = async () => {
    const r = await shareOrg(org);
    if (!r) return;
    setNote(r.channel === 'copy_link' ? 'Link copied' : '');
    if (r.sharesCount != null) onChange({ ...org, sharesCount: r.sharesCount });
  };

  return (
    <Card className="space-y-3">
      <Link to={`/pharmacies/${org._id}`} className="flex items-start gap-3">
        {org.logo?.url ? <img src={org.logo.url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" /> : <Avatar tone="pharmacy" name={org.name} />}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-navy-900">{org.name}</h3>
          <p className="truncate text-sm text-gray-600">{addressLine(org.address) || 'Address not listed'}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
            <Stars value={org.ratingAverage} />
            <span>{org.ratingCount ? `${org.ratingAverage} (${org.ratingCount})` : 'No reviews yet'}</span>
            {org.distanceKm != null && <span>· {org.distanceKm} km away</span>}
          </div>
        </div>
      </Link>
      <div className="flex flex-wrap gap-1.5">
        {org.is24Hours && <Pill tone="success">Open 24 hours</Pill>}
        {org.offersDelivery && <Pill tone="info">Delivers</Pill>}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 text-sm">
        <button type="button" onClick={like} disabled={busy} aria-pressed={org.isLiked}
          className={`inline-flex h-10 items-center gap-1.5 rounded-full px-4 font-medium ring-1 transition ${org.isLiked ? 'bg-pharmacy-600 text-white ring-pharmacy-600' : 'bg-white text-navy-700 ring-gray-200 hover:bg-pharmacy-50'}`}>
          <span aria-hidden="true">{org.isLiked ? '♥' : '♡'}</span> {org.likesCount || 0}
        </button>
        <button type="button" onClick={share} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 font-medium text-navy-700 ring-1 ring-gray-200 hover:bg-pharmacy-50">Share {org.sharesCount ? `· ${org.sharesCount}` : ''}</button>
        <span className="ml-auto text-xs text-gray-500">{org.viewsCount || 0} views</span>
        {note && <span role="status" className="w-full text-xs text-gray-600">{note}</span>}
      </div>
    </Card>
  );
}

export default function FindPharmacyPage() {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 400);
  const [sort, setSort] = useState('rating');
  const [coords, setCoords] = useState(null);
  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (sort === 'nearest' && !coords) return;
    const params = { page, limit: 12, sort, ...(dq.trim() ? { q: dq.trim() } : {}), ...(sort === 'nearest' ? coords : {}) };
    api('/pharmacies', { params }).then((r) => { setItems(r.data?.data); setMeta(r.meta); setError(''); }).catch((e) => setError(e.message));
    console.log(items)
  }, [dq, sort, page, coords]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [dq, sort]);

  const choose = (id) => {
    if (id !== 'nearest') return setSort(id);
    if (!navigator.geolocation) return setError('Your browser cannot share your location.');
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setSort('nearest'); setError(''); },
      () => setError('Allow location access to see the nearest pharmacies.')
    );
  };

  return (
    <PageShell className="max-w-3xl">
      <PageHeader title="Find a pharmacy" subtitle="Compare pharmacies, read reviews, and chat with a pharmacist." />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by pharmacy name" aria-label="Search pharmacies" className={`${field} mb-3 h-12`} />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {SORTS.map((s) => (
          <button key={s.id} type="button" onClick={() => choose(s.id)} className={`h-10 whitespace-nowrap rounded-full px-4 text-sm font-medium ${sort === s.id ? 'bg-pharmacy-600 text-white' : 'bg-white text-navy-700 ring-1 ring-gray-200'}`}>{s.label}</button>
        ))}
      </div>
      <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>

      {!items ? <div className="space-y-4"><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-44 rounded-2xl" /></div>
        : items.length === 0 ? <EmptyState icon="pill" title="No pharmacies found" body="Try a different name or sort order." />
        : (
          <ul className="space-y-4">
            {items?.map((o) => <li key={o._id}><PharmacyCard org={o} onChange={(n) => setItems((l) => l.map((x) => (x._id === n._id ? n : x)))} /></li>)}
          </ul>
        )}

      {meta?.pages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={ghostBtn}>Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {meta.pages}</span>
          <button type="button" disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)} className={ghostBtn}>Next</button>
        </div>
      )}
    </PageShell>
  );
}