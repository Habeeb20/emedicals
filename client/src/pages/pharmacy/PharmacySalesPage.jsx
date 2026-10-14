import { useCallback, useEffect, useState } from 'react';
import api  from './api';
import { useDebounced } from '../appointments/hooks';

import { Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from  '../appointments/ui';
import {
  DownloadReceiptButton,
  Field, PharmacyNav, Pill, Receipt, Sheet, field, fmtDate, ghostBtn, money, primaryBtn, usePharmacyMe,
} from './PharmacyShared';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

function ReturnForm({ sale, onDone }) {
  const [qty, setQty] = useState({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const items = Object.entries(qty).filter(([, q]) => Number(q) > 0).map(([i, q]) => ({ itemIndex: Number(i), quantity: Number(q) }));
    if (!items.length) return setError('Enter how many units are being returned.');
    setBusy(true); setError('');
    try { await api(`/pharmacy/sales/${sale._id}/return`, { method: 'POST', body: { items, reason } }); onDone(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="mt-5 space-y-3 border-t border-gray-100 pt-4">
      <h3 className="font-semibold text-navy-900">Return or refund</h3>
      <p className="text-xs text-gray-600">Returned units go to quarantine, not back on the shelf, until you release or destroy them from Inventory.</p>
      <ErrorNote>{error}</ErrorNote>
      <ul className="space-y-2">
        {sale.items.map((it, i) => {
          const left = it.quantity - (it.returnedQty || 0);
          return (
            <li key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{it.name}<span className="block text-xs text-gray-500">{left} can be returned</span></span>
              <input type="number" min="0" max={left} disabled={left === 0} value={qty[i] ?? ''} onChange={(e) => setQty({ ...qty, [i]: Math.min(Number(e.target.value) || '', left) })}
                aria-label={`Return quantity for ${it.name}`} className="h-11 w-20 rounded-xl border border-gray-300 px-2 text-center focus:border-pharmacy-500 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/30 disabled:bg-gray-100" />
            </li>
          );
        })}
      </ul>
      <Field label="Reason"><input required value={reason} onChange={(e) => setReason(e.target.value)} className={`${field} h-11`} placeholder="Wrong item, patient reaction, duplicate…" /></Field>
      <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>{busy ? 'Processing…' : 'Refund selected items'}</button>
    </form>
  );
}

export default function PharmacySalesPage() {
  const me = usePharmacyMe();
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 350);
  const [type, setType] = useState('');
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null); // full sale

  const load = useCallback(() => {
    const params = { page, limit: 20, from, to, ...(type ? { type } : {}), ...(dq.trim() ? { q: dq.trim() } : {}) };
    api('/pharmacy/sales', { params }).then((r) => { setRows(r.data?.data); setMeta(r.meta); setError(''); }).catch((e) => setError(e.message));
  }, [page, from, to, type, dq]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [from, to, type, dq]);

  const view = async (id) => {
    try { const r = await api(`/pharmacy/sales/${id}`);   setOpen(r.data?.data ?? r.data); } catch (e) { setError(e.message); }
  };

  return (
    <PageShell className="max-w-4xl">
      <PageHeader title="Sales and dispensing history" subtitle="Every sale and prescription you've attended to." />
      <PharmacyNav />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Receipt no. or customer" aria-label="Search sales" className={`${field} h-11 sm:col-span-2`} />
        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className={`${field} h-11`} />
        <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="To date" className={`${field} h-11`} />
      </div>
      <div className="mb-4 flex gap-2">
        {[['', 'All'], ['prescription', 'Prescriptions'], ['walk_in', 'Walk-in']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setType(id)} className={`h-10 rounded-full px-4 text-sm font-medium ${type === id ? 'bg-navy-800 text-white' : 'bg-white text-navy-700 ring-1 ring-gray-200'}`}>{label}</button>
        ))}
      </div>
      <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>

      {!rows ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        : rows.length === 0 ? <EmptyState icon="search" title="No sales in this period" body="Try a wider date range." />
        : (
          <ul className="space-y-3">
            {rows.map((s) => (
              <li key={s._id}>
                <button type="button" onClick={() => view(s._id)} className="block w-full text-left">
                  <Card className="transition hover:ring-2 hover:ring-pharmacy-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium text-navy-900">{s.receiptNo}</p>
                        <p className="truncate text-sm text-gray-600">{s.patient?.fullName || s.customerName || 'Walk-in customer'} · {fmtDate(s.createdAt, true)}</p>
                        <p className="mt-1 truncate text-xs text-gray-500">{s.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-navy-900">{money(s.total)}</p>
                        <div className="mt-1 flex flex-wrap justify-end gap-1">
<Pill tone={s.type === 'walk_in' ? 'gray' : 'pharmacy'}>
  {s.type === 'prescription' ? 'Rx' : s.type === 'online' ? 'Online' : 'Walk-in'}
</Pill>
                          {s.status !== 'completed' && <Pill tone="warning">{s.status.replace('_', ' ')}</Pill>}
                          {['partial', 'unpaid', 'claim_pending'].includes(s.paymentStatus) && <Pill tone="info">{s.paymentStatus.replace('_', ' ')}</Pill>}
                        </div>
                      </div>
                    </div>
                  </Card>
                </button>
              </li>
            ))}
          </ul>
        )}

      {meta?.pages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={ghostBtn}>Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {meta.pages}</span>
          <button type="button" disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)} className={ghostBtn}>Next</button>
        </div>
      )}

      <Sheet open={!!open} title="Receipt" onClose={() => setOpen(null)}>
        {open && (
          <>
            <Receipt sale={open} pharmacyName={me?.pharmacy?.name} />
            {open.prescription?.code && <p className="mt-3 text-center text-xs text-gray-600">Prescription {open.prescription.code}</p>}
            {open.paymentMethod === 'insurance' && <p className="mt-1 text-center text-xs text-gray-600">HMO: {open.insurer}{open.authCode ? ` · auth ${open.authCode}` : ''}</p>}
            <div className="mt-4 flex justify-center gap-2">
  <button type="button" onClick={() => window.print()} className={ghostBtn}>Print</button>
  <DownloadReceiptButton sale={open} />
</div>
      

            {me?.isManager && open.status !== 'refunded' && <ReturnForm sale={open} onDone={() => { setOpen(null); load(); }} />}
          </>
        )}
      </Sheet>
    </PageShell>
  );
}