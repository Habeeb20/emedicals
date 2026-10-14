import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useDebounced } from '../../appointments/hooks';
import { EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../../appointments/ui';
import { field, ghostBtn } from '../PharmacyShared';
import { AddToCart, CartButton, DrugImage, body, money } from './cart';

const SORTS = [['', 'Name'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low']];

export default function ShopPage() {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 350);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('');
  const [page, setPage] = useState(1);
  const [cats, setCats] = useState([]);
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/shop/categories').then((r) => setCats(body(r).data || [])).catch(() => { }); }, []);
  useEffect(() => { setPage(1); }, [dq, category, sort]);
  useEffect(() => {
    setRows(null);
    const params = { page, limit: 24, ...(dq.trim() && { q: dq.trim() }), ...(category && { category }), ...(sort && { sort }) };
    api('/shop/drugs', { params })
      .then((r) => { const b = body(r); setRows(b.data); setMeta(b.meta); setError(''); })
      .catch((e) => { setError(e.message); setRows([]); });
  }, [page, dq, category, sort]);

  return (
    <PageShell className="max-w-6xl mt-10">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Pharmacy" subtitle="Order medicines from licensed pharmacies near you." />
        <div className="flex items-center gap-2">
          <Link to="/shop/orders" className={`${ghostBtn} hidden sm:inline-flex`}>My orders</Link>
          <CartButton />
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search medicines, brands or categories" aria-label="Search medicines" className={`${field} h-11 sm:col-span-2`} />
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className={`${field} h-11`}>
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {cats.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {['', ...cats].map((c) => (
            <button key={c || 'all'} type="button" onClick={() => setCategory(c)}
              className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium ${category === c ? 'bg-navy-800 text-white' : 'bg-white text-navy-700 ring-1 ring-gray-200'}`}>
              {c || 'All'}
            </button>
          ))}
        </div>
      )}
      <ErrorNote>{error}</ErrorNote>

      {!rows ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon="search" title="No medicines found" body="Try a different search or category." />
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {rows.map((d) => (
            <li key={d.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
              <Link to={`/shop/drugs/${d.id}`} className="block">
                <DrugImage src={d.images[0]} alt={d.genericName} className="h-36 w-full" />
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-navy-900">{d.genericName}{d.brandName ? ` (${d.brandName})` : ''}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{[d.strength, d.form].filter(Boolean).join(' · ')}</p>
                  <p className="mt-2 font-semibold text-navy-900">{money(d.sellingPrice)}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">{d.pharmacy.name}{d.pharmacy.city ? `, ${d.pharmacy.city}` : ''}</p>
                </div>
              </Link>
              <div className="mt-auto p-3 pt-0"><AddToCart drug={d} size="sm" /></div>
            </li>
          ))}
        </ul>
      )}

      {meta?.pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={ghostBtn}>Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {meta.pages}</span>
          <button type="button" disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)} className={ghostBtn}>Next</button>
        </div>
      )}
    </PageShell>
  );
}