import { useCallback, useEffect, useState } from 'react';
import  api from './api';
import { useDebounced } from '../appointments/hooks';

import { Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../appointments/ui';
import {
  DrugPicker, Field, PharmacyNav, Pill, Sheet, daysUntil, drugLabel, field, fmtDate, ghostBtn, money, primaryBtn, usePharmacyMe,
} from './PharmacyShared';

const FORMS = ['tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'suppository', 'powder', 'other'];
const SCHEDULES = [
  { id: 'otc', label: 'Over the counter' },
  { id: 'prescription_only', label: 'Prescription only' },
  { id: 'controlled', label: 'Controlled drug' },
];
const blankDrug = {
  genericName: '', brandName: '', strength: '', form: 'tablet', unit: 'unit', schedule: 'prescription_only',
  sellingPrice: '', reorderLevel: 10, barcode: '', nafdacNumber: '', manufacturer: '', category: '', coldChain: false, highAlert: false,
};

/* ------------------------------ add / edit ------------------------------ */
function DrugForm({ initial, onSaved, onClose }) {
  const [f, setF] = useState(initial ? { ...blankDrug, ...initial } : blankDrug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const body = { ...f, sellingPrice: Number(f.sellingPrice), reorderLevel: Number(f.reorderLevel) };
      delete body._id; delete body.stock; delete body.sellable; delete body.expired; delete body.nearestExpiry;
      delete body.pharmacy; delete body.createdAt; delete body.updatedAt; delete body.__v; delete body.costPrice;
      if (initial) await api(`/pharmacy/drugs/${initial._id}`, { method: 'PATCH', body });
      else await api('/pharmacy/drugs', { method: 'POST', body });
      onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <ErrorNote>{error}</ErrorNote>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Generic name *"><input required value={f.genericName} onChange={set('genericName')} className={`${field} h-11`} placeholder="Paracetamol" /></Field>
        <Field label="Brand name"><input value={f.brandName} onChange={set('brandName')} className={`${field} h-11`} placeholder="Panadol" /></Field>
        <Field label="Strength"><input value={f.strength} onChange={set('strength')} className={`${field} h-11`} placeholder="500mg" /></Field>
        <Field label="Form">
          <select value={f.form} onChange={set('form')} className={`${field} h-11`}>{FORMS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        </Field>
        <Field label="Drug class">
          <select value={f.schedule} onChange={set('schedule')} className={`${field} h-11`}>{SCHEDULES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        </Field>
        <Field label="Selling price (₦) *"><input required inputMode="decimal" value={f.sellingPrice} onChange={set('sellingPrice')} className={`${field} h-11`} /></Field>
        <Field label="Stock unit" hint="What one unit of stock is: tablet, bottle, vial"><input value={f.unit} onChange={set('unit')} className={`${field} h-11`} /></Field>
        <Field label="Reorder level" hint="Alert when stock falls to this number"><input inputMode="numeric" value={f.reorderLevel} onChange={set('reorderLevel')} className={`${field} h-11`} /></Field>
        <Field label="Barcode"><input value={f.barcode} onChange={set('barcode')} className={`${field} h-11`} /></Field>
        <Field label="NAFDAC number"><input value={f.nafdacNumber} onChange={set('nafdacNumber')} className={`${field} h-11`} /></Field>
        <Field label="Manufacturer"><input value={f.manufacturer} onChange={set('manufacturer')} className={`${field} h-11`} /></Field>
        <Field label="Category"><input value={f.category} onChange={set('category')} className={`${field} h-11`} placeholder="Analgesic" /></Field>
      </div>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.coldChain} onChange={set('coldChain')} className="h-4 w-4 accent-pharmacy-600" /> Needs cold storage</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.highAlert} onChange={set('highAlert')} className="h-4 w-4 accent-pharmacy-600" /> High-alert drug</label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Add drug'}</button>
      </div>
    </form>
  );
}

/* ------------------------------ receive stock ------------------------------ */
const blankRow = () => ({ key: Math.random().toString(36).slice(2), drug: null, batchNo: '', expiryDate: '', quantity: '', costPrice: '' });

function ReceiveForm({ onSaved, onClose }) {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [rows, setRows] = useState([blankRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api('/pharmacy/suppliers').then((r) => setSuppliers(r.data)).catch(() => {}); }, []);
  const patch = (key, p) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const addSupplier = async () => {
    const name = window.prompt('Supplier name');
    if (!name?.trim()) return;
    try {
      const r = await api('/pharmacy/suppliers', { method: 'POST', body: { name: name.trim() } });
      setSuppliers((s) => [...s, r.data]); setSupplierId(r.data._id);
    } catch (e) { setError(e.message); }
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (rows.some((r) => !r.drug)) return setError('Choose a drug for every row, or remove the empty row.');
    setBusy(true);
    try {
      await api('/pharmacy/receipts', {
        method: 'POST',
        body: {
          supplierId: supplierId || undefined, invoiceNo: invoiceNo || undefined,
          items: rows.map((r) => ({ drugId: r.drug._id, batchNo: r.batchNo, expiryDate: r.expiryDate, quantity: Number(r.quantity), costPrice: Number(r.costPrice) })),
        },
      });
      onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <ErrorNote>{error}</ErrorNote>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Supplier">
          <div className="flex gap-2">
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={`${field} h-11`}>
              <option value="">No supplier</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <button type="button" onClick={addSupplier} className={`${ghostBtn} shrink-0 px-3`}>New</button>
          </div>
        </Field>
        <Field label="Invoice number"><input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={`${field} h-11`} /></Field>
      </div>

      <ul className="space-y-3">
        {rows.map((r, n) => (
          <li key={r.key} className="space-y-3 rounded-2xl bg-gray-50 p-3">
            <div className="flex items-center justify-between text-sm font-medium text-navy-800">
              <span>Item {n + 1}</span>
              {rows.length > 1 && <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="text-danger-dark">Remove</button>}
            </div>
            {r.drug ? (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-gray-200">
                <span className="truncate">{drugLabel(r.drug)}</span>
                <button type="button" onClick={() => patch(r.key, { drug: null })} className="text-pharmacy-700">Change</button>
              </div>
            ) : <DrugPicker inStock={false} placeholder="Search the drug you received" onPick={(d) => patch(r.key, { drug: d })} />}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Batch no."><input required value={r.batchNo} onChange={(e) => patch(r.key, { batchNo: e.target.value })} className={`${field} h-11`} /></Field>
              <Field label="Expiry"><input required type="date" value={r.expiryDate} onChange={(e) => patch(r.key, { expiryDate: e.target.value })} className={`${field} h-11`} /></Field>
              <Field label="Quantity"><input required inputMode="numeric" value={r.quantity} onChange={(e) => patch(r.key, { quantity: e.target.value })} className={`${field} h-11`} /></Field>
              <Field label="Cost each (₦)"><input required inputMode="decimal" value={r.costPrice} onChange={(e) => patch(r.key, { costPrice: e.target.value })} className={`${field} h-11`} /></Field>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setRows((rs) => [...rs, blankRow()])} className={ghostBtn}>Add another item</button>
      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Saving…' : 'Add to stock'}</button>
      </div>
    </form>
  );
}

/* ------------------------------ batches + history ------------------------------ */
function BatchRow({ batch, onChanged, isManager }) {
  const [mode, setMode] = useState(null); // 'count' | 'writeoff' | 'release' | 'destroy'
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const d = daysUntil(batch.expiryDate);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      if (mode === 'count' || mode === 'writeoff') {
        await api('/pharmacy/adjustments', { method: 'POST', body: { batchId: batch._id, mode, quantity: Number(qty), reason } });
      } else {
        await api(`/pharmacy/batches/${batch._id}/quarantine`, { method: 'POST', body: { action: mode === 'release' ? 'release' : 'writeoff', quantity: Number(qty) } });
      }
      setMode(null); setQty(''); setReason(''); onChanged();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <li className="rounded-2xl bg-gray-50 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-navy-900">Batch {batch.batchNo}</p>
          <p className="text-xs text-gray-600">Expires {fmtDate(batch.expiryDate)} · cost {money(batch.costPrice)}{batch.supplier?.name ? ` · ${batch.supplier.name}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={d <= 0 ? 'danger' : d <= 90 ? 'warning' : 'success'}>{d <= 0 ? 'Expired' : `${d} days left`}</Pill>
          <span className="font-semibold text-navy-900">{batch.quantity} units</span>
        </div>
      </div>
      {batch.quarantinedQty > 0 && (
        <p className="mt-2 rounded-lg bg-warning-light px-3 py-2 text-xs text-warning-dark">{batch.quarantinedQty} returned units are in quarantine and can't be sold yet.</p>
      )}
      {isManager && !mode && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-pharmacy-700">
          <button type="button" onClick={() => setMode('count')}>Recount</button>
          <button type="button" onClick={() => setMode('writeoff')}>Write off</button>
          {batch.quarantinedQty > 0 && <button type="button" onClick={() => { setMode('release'); setQty(String(batch.quarantinedQty)); }}>Release quarantine</button>}
          {batch.quarantinedQty > 0 && <button type="button" onClick={() => { setMode('destroy'); setQty(String(batch.quarantinedQty)); }}>Destroy quarantine</button>}
        </div>
      )}
      {mode && (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <ErrorNote>{error}</ErrorNote>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={mode === 'count' ? 'Counted quantity' : 'Quantity'}><input required inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className={`${field} h-11`} /></Field>
            {(mode === 'count' || mode === 'writeoff') && (
              <Field label="Reason"><input required value={reason} onChange={(e) => setReason(e.target.value)} className={`${field} h-11`} placeholder="Damaged, expired, stock count…" /></Field>
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={`${primaryBtn} h-10`}>{busy ? 'Saving…' : 'Confirm'}</button>
            <button type="button" onClick={() => setMode(null)} className={`${ghostBtn} h-10`}>Cancel</button>
          </div>
        </form>
      )}
    </li>
  );
}

function BatchesSheet({ drug, isManager, onChanged }) {
  const [tab, setTab] = useState('batches');
  const [batches, setBatches] = useState(null);
  const [moves, setMoves] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => api(`/pharmacy/drugs/${drug._id}/batches`).then((r) => setBatches(r.data)).catch((e) => setError(e.message)), [drug._id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tab === 'history' && !moves) api(`/pharmacy/drugs/${drug._id}/movements`, { params: { limit: 30 } }).then((r) => setMoves(r.data)).catch((e) => setError(e.message));
  }, [tab, moves, drug._id]);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {['batches', 'history'].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`h-9 rounded-full px-4 text-sm font-medium ${tab === t ? 'bg-pharmacy-600 text-white' : 'bg-gray-100 text-navy-700'}`}>{t === 'batches' ? 'Batches' : 'Stock history'}</button>
        ))}
      </div>
      <ErrorNote>{error}</ErrorNote>
      {tab === 'batches' && (!batches ? <Skeleton className="h-24 rounded-2xl" /> : batches.length === 0 ? <p className="text-sm text-gray-600">No stock has been received for this drug yet.</p> : (
        <ul className="space-y-3">{batches.map((b) => <BatchRow key={b._id} batch={b} isManager={isManager} onChanged={() => { load(); setMoves(null); onChanged(); }} />)}</ul>
      ))}
      {tab === 'history' && (!moves ? <Skeleton className="h-24 rounded-2xl" /> : moves.length === 0 ? <p className="text-sm text-gray-600">No movements yet.</p> : (
        <ul className="divide-y divide-gray-100 text-sm">
          {moves.map((m) => (
            <li key={m._id} className="flex items-start justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block capitalize text-navy-900">{m.type.replace(/_/g, ' ')}{m.batch?.batchNo ? ` · batch ${m.batch.batchNo}` : ''}</span>
                <span className="block text-xs text-gray-500">{fmtDate(m.createdAt, true)}{m.by?.fullName ? ` · ${m.by.fullName}` : ''}{m.reason ? ` · ${m.reason}` : ''}</span>
              </span>
              <span className={`shrink-0 font-semibold ${m.quantity < 0 ? 'text-danger' : 'text-pharmacy-700'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

/* ------------------------------ page ------------------------------ */
export default function PharmacyInventoryPage() {
  const me = usePharmacyMe();
  const isManager = !!me?.isManager;
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 350);
  const [filter, setFilter] = useState('all');
  const [drugs, setDrugs] = useState(null);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(null); // { kind: 'add'|'edit'|'receive'|'batches', drug? }

  const load = useCallback(() => {
    const params = { page, limit: 20, ...(dq.trim() ? { q: dq.trim() } : {}), ...(filter !== 'all' ? { stock: filter } : {}) };
    api('/pharmacy/drugs', { params }).then((r) => { setDrugs(r.data); setMeta(r.meta); setError(''); }).catch((e) => setError(e.message));
  }, [dq, filter, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [dq, filter]);

  const done = () => { setSheet(null); load(); };

  return (
    <PageShell className="max-w-5xl">
      <PageHeader title="Inventory" subtitle="Your drug catalog and stock, tracked batch by batch." />
      <PharmacyNav />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or barcode" aria-label="Search inventory" className={`${field} h-11 sm:max-w-sm`} />
        <div className="flex gap-2 overflow-x-auto">
          {[['all', 'All'], ['low', 'Low stock'], ['out', 'Out of stock']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} className={`h-10 whitespace-nowrap rounded-full px-4 text-sm font-medium ${filter === id ? 'bg-navy-800 text-white' : 'bg-white text-navy-700 ring-1 ring-gray-200'}`}>{label}</button>
          ))}
        </div>
        {isManager && (
          <div className="flex gap-2 sm:ml-auto">
            <button type="button" onClick={() => setSheet({ kind: 'receive' })} className={ghostBtn}>Receive stock</button>
            <button type="button" onClick={() => setSheet({ kind: 'add' })} className={primaryBtn}>Add drug</button>
          </div>
        )}
      </div>
      <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>

      {!drugs ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        : drugs.length === 0 ? <EmptyState icon="pill" title="No drugs found" body={isManager ? 'Add your first drug, then receive stock for it.' : 'Nothing matches your search.'} />
        : (
          <ul className="space-y-3">
            {drugs.map((d) => {
              const expDays = d.nearestExpiry ? daysUntil(d.nearestExpiry) : null;
              return (
                <li key={d._id}>
                  <Card className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-navy-900">{drugLabel(d)}</h3>
                        <p className="text-sm text-gray-600 capitalize">{d.form}{d.category ? ` · ${d.category}` : ''}</p>
                      </div>
                      <p className="shrink-0 font-semibold text-pharmacy-700">{money(d.sellingPrice)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={d.stock === 0 ? 'danger' : d.stock <= d.reorderLevel ? 'warning' : 'success'}>{d.stock === 0 ? 'Out of stock' : `${d.stock} on hand`}</Pill>
                      {d.expired > 0 && <Pill tone="danger">{d.expired} expired</Pill>}
                      {expDays != null && expDays <= 90 && <Pill tone="warning">Nearest expiry in {expDays} days</Pill>}
                      {d.schedule === 'controlled' && <Pill tone="info">Controlled</Pill>}
                      {d.schedule === 'prescription_only' && <Pill>Rx only</Pill>}
                      {d.coldChain && <Pill tone="info">Cold storage</Pill>}
                      {d.highAlert && <Pill tone="warning">High alert</Pill>}
                    </div>
                    <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-3 text-sm font-medium text-pharmacy-700">
                      <button type="button" onClick={() => setSheet({ kind: 'batches', drug: d })}>Batches and history</button>
                      {isManager && <button type="button" onClick={() => setSheet({ kind: 'edit', drug: d })}>Edit</button>}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

      {meta?.pages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={ghostBtn}>Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {meta.pages}</span>
          <button type="button" disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)} className={ghostBtn}>Next</button>
        </div>
      )}

      <Sheet open={sheet?.kind === 'add'} title="Add a drug" onClose={() => setSheet(null)} wide><DrugForm onSaved={done} onClose={() => setSheet(null)} /></Sheet>
      <Sheet open={sheet?.kind === 'edit'} title="Edit drug" onClose={() => setSheet(null)} wide>{sheet?.kind === 'edit' && <DrugForm initial={sheet.drug} onSaved={done} onClose={() => setSheet(null)} />}</Sheet>
      <Sheet open={sheet?.kind === 'receive'} title="Receive stock" onClose={() => setSheet(null)} wide><ReceiveForm onSaved={done} onClose={() => setSheet(null)} /></Sheet>
      <Sheet open={sheet?.kind === 'batches'} title={sheet?.drug ? drugLabel(sheet.drug) : ''} onClose={() => { setSheet(null); load(); }} wide>
        {sheet?.kind === 'batches' && <BatchesSheet drug={sheet.drug} isManager={isManager} onChanged={load} />}
      </Sheet>
    </PageShell>
  );
}