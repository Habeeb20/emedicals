import { useEffect, useState } from 'react';
import { api } from './api';
import { useDebounced, useFetch } from './hooks';
import { Button, EmptyState, ErrorNote, Icon, inputCls, PageHeader, PageShell, Skeleton, Tabs, Card } from './ui';
import ProviderCard from './ProviderCard';
import BookingSheet from './BookingSheet';

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'doctor', label: 'Doctors' },
  { value: 'hospital', label: 'Hospitals' },
];

export default function ProviderSearchPage({ onNavigate }) {
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [department, setDepartment] = useState('');
  const [coords, setCoords] = useState(null);
  const [geo, setGeo] = useState('idle'); // idle | loading | denied
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const dq = useDebounced(q);
  const departments = useFetch(() => api('/providers/departments'), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api('/providers', { params: { type, q: dq, department, lat: coords?.lat, lng: coords?.lng, page, limit: 9 } })
      .then((r) => { if (!cancelled) { setItems((prev) => (page === 1 ? r.data : [...prev, ...r.data])); setMeta(r.meta); setError(''); } })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [type, dq, department, coords, page]);

  const reset = (fn) => (v) => { fn(v); setPage(1); };

  const locate = () => {
    if (!navigator.geolocation) return setGeo('denied');
    setGeo('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeo('idle'); setPage(1); },
      () => setGeo('denied'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const hasMore = meta && items.length < meta.total;

  return (
    <PageShell>
      <PageHeader title="Find care near you" subtitle="Search doctors and hospitals, see how far they are, and book a place in line." />

      <Card className="mb-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_14rem_auto]">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="Search by doctor or hospital name"
              aria-label="Search by name" className={`${inputCls} pl-11`} />
          </div>
          <select value={department} onChange={(e) => reset(setDepartment)(e.target.value)} aria-label="Department" className={inputCls}>
            <option value="">All departments</option>
            {(departments.data || []).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <Button variant={coords ? 'secondary' : 'primary'} icon="locate" loading={geo === 'loading'} onClick={locate}>
            {coords ? 'Using your location' : 'Use my location'}
          </Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={type} onChange={reset(setType)} options={TYPES} />
          <p className="text-sm text-gray-600" aria-live="polite">
            {geo === 'denied'
              ? 'Location is blocked, so distances use your saved address.'
              : coords ? 'Sorted by distance from where you are.' : 'Distances use your saved address.'}
            {meta ? ` ${meta.total} found.` : ''}
          </p>
        </div>
      </Card>

      <ErrorNote>{error}</ErrorNote>

      {loading && page === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div>
      ) : items.length === 0 && !error ? (
        <EmptyState icon="search" title="No matches" body="Try a different name, or clear the department filter." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((p) => <ProviderCard key={`${p.kind}-${p.id}`} provider={p} onBook={setSelected} />)}
          </div>
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" loading={loading} onClick={() => setPage((n) => n + 1)}>Show more</Button>
            </div>
          )}
        </>
      )}

      {selected && <BookingSheet provider={selected} onClose={() => setSelected(null)} onBooked={() => { setSelected(null); onNavigate?.('my-appointments'); }} />}
    </PageShell>
  );
}
