import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Navigation, Building2, Flower2, LayoutGrid } from 'lucide-react';
import { memorialApi, errMsg } from './memorialApi';
import OrgCard from './OrgCard';
import { EmptyState, ToastHost, btnGhost, btnPrimary, cx, inputCls, toast, useDebounce } from './ui';

const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
const TABS = [
  { id: '', label: 'All', Icon: LayoutGrid },
  { id: 'mortuary', label: 'Mortuaries', Icon: Building2 },
  { id: 'cemetery', label: 'Cemeteries', Icon: Flower2 },
];

export default function MemorialDirectoryPage() {
  const [sp, setSp] = useSearchParams();
  const type = sp.get('type') || '';
  const state = sp.get('state') || '';
  const sort = sp.get('sort') || 'popular';
  const [search, setSearch] = useState(sp.get('q') || '');
  const q = useDebounce(search);
  const [coords, setCoords] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState('');
  const reqId = useRef(0);

  const setParam = (k, v) => setSp((p) => { const n = new URLSearchParams(p); v ? n.set(k, v) : n.delete(k); return n; }, { replace: true });
  useEffect(() => setParam('q', q), [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async (p = 1) => {
    const id = ++reqId.current;
    setLoading(true);
    setFailed('');
    try {
      const r = await memorialApi.listOrgs({ type, q, state, sort, page: p, ...(coords || {}) });
      if (id !== reqId.current) return;
      setItems((cur) => (p === 1 ? r.items : [...cur, ...r.items]));
      setTotal(r.total); setPage(r.page); setPages(r.pages);
    } catch (e) {
      if (id === reqId.current) setFailed(errMsg(e));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [type, q, state, sort, coords]);
  useEffect(() => { load(1); }, [load]);

  const nearMe = () => {
    if (!navigator.geolocation) return toast('Location is not available on this device', 'error');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setParam('sort', 'nearest'); },
      () => toast('Allow location access to sort by distance', 'error')
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastHost />
      <header className="relative overflow-hidden bg-memorial-900 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-16 top-10 hidden h-80 w-64 rounded-t-full border border-memorial-700 md:block" />
        <div aria-hidden className="pointer-events-none absolute -right-4 top-20 hidden h-72 w-52 rounded-t-full border border-memorial-800 md:block" />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pt-20">
          <h1 className="max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">A calm place to start, when you need one.</h1>
          <p className="mt-4 max-w-xl text-memorial-300">Find a mortuary or cemetery near you, see honest prices, and book without making a single phone call.</p>

          <div className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-memorial-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, area or city" aria-label="Search"
                className="w-full rounded-2xl border-0 bg-white py-3.5 pl-11 pr-4 text-navy-900 placeholder:text-memorial-400 focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>
            <button onClick={nearMe} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 px-5 py-3.5 text-sm font-medium text-white hover:bg-white/10">
              <Navigation size={16} /> Near me
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-2xl border border-memorial-200 bg-white p-1" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={type === t.id} onClick={() => setParam('type', t.id)}
                className={cx('inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition', type === t.id ? 'bg-memorial-800 text-white' : 'text-memorial-600 hover:bg-memorial-50')}>
                <t.Icon size={15} /> {t.label}
              </button>
            ))}
          </div>
          <select value={state} onChange={(e) => setParam('state', e.target.value)} className={cx(inputCls, '!w-auto')} aria-label="State">
            <option value="">All states</option>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={sort} onChange={(e) => setParam('sort', e.target.value)} className={cx(inputCls, '!w-auto')} aria-label="Sort">
            <option value="popular">Most loved</option>
            <option value="rating">Best rated</option>
            <option value="nearest" disabled={!coords}>Nearest</option>
            <option value="newest">Newest</option>
            <option value="name">Name A to Z</option>
          </select>
          <p className="ml-auto text-sm text-memorial-500">{loading && !items.length ? 'Searching' : `${total} place${total === 1 ? '' : 's'}`}</p>
        </div>

        <div className="mt-6">
          {failed ? (
            <EmptyState title="We couldn't load the list" hint={failed} action={<button onClick={() => load(1)} className={btnPrimary}>Try again</button>} />
          ) : loading && !items.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-3xl bg-memorial-100" />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState title="Nothing matches yet" hint="Try another area, or clear your filters to see everything we list."
              action={<button onClick={() => { setSearch(''); setSp({}); }} className={btnGhost}>Clear filters</button>} />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((o) => <OrgCard key={o._id} org={o} />)}</div>
              {page < pages && <div className="mt-8 text-center"><button onClick={() => load(page + 1)} disabled={loading} className={btnGhost}>{loading ? 'Loading' : 'Show more'}</button></div>}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
