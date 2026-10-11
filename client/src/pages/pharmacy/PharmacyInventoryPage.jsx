// import { useCallback, useEffect, useState } from 'react';
// import  api from './api';
// import { useDebounced } from '../appointments/hooks';

// import { Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../appointments/ui';
// import {
//   DrugPicker, Field, PharmacyNav, Pill, Sheet, daysUntil, drugLabel, field, fmtDate, ghostBtn, money, primaryBtn, usePharmacyMe,
// } from './PharmacyShared';

// const FORMS = ['tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'suppository', 'powder', 'other'];
// const SCHEDULES = [
//   { id: 'otc', label: 'Over the counter' },
//   { id: 'prescription_only', label: 'Prescription only' },
//   { id: 'controlled', label: 'Controlled drug' },
// ];
// const blankDrug = {
//   genericName: '', brandName: '', strength: '', form: 'tablet', unit: 'unit', schedule: 'prescription_only',
//   sellingPrice: '', reorderLevel: 10, barcode: '', nafdacNumber: '', manufacturer: '', category: '', coldChain: false, highAlert: false,
// };

// /* ------------------------------ add / edit ------------------------------ */
// function DrugForm({ initial, onSaved, onClose }) {
//   const [f, setF] = useState(initial ? { ...blankDrug, ...initial } : blankDrug);
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState('');
//   const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

//   const save = async (e) => {
//     e.preventDefault();
//     setBusy(true); setError('');
//     try {
//       const body = { ...f, sellingPrice: Number(f.sellingPrice), reorderLevel: Number(f.reorderLevel) };
//       delete body._id; delete body.stock; delete body.sellable; delete body.expired; delete body.nearestExpiry;
//       delete body.pharmacy; delete body.createdAt; delete body.updatedAt; delete body.__v; delete body.costPrice;
//       if (initial) await api(`/pharmacy/drugs/${initial._id}`, { method: 'PATCH', body });
//       else await api('/pharmacy/drugs', { method: 'POST', body });
//       onSaved();
//     } catch (err) { setError(err.message); } finally { setBusy(false); }
//   };

//   return (
//     <form onSubmit={save} className="space-y-4">
//       <ErrorNote>{error}</ErrorNote>
//       <div className="grid gap-3 sm:grid-cols-2">
//         <Field label="Generic name *"><input required value={f.genericName} onChange={set('genericName')} className={`${field} h-11`} placeholder="Paracetamol" /></Field>
//         <Field label="Brand name"><input value={f.brandName} onChange={set('brandName')} className={`${field} h-11`} placeholder="Panadol" /></Field>
//         <Field label="Strength"><input value={f.strength} onChange={set('strength')} className={`${field} h-11`} placeholder="500mg" /></Field>
//         <Field label="Form">
//           <select value={f.form} onChange={set('form')} className={`${field} h-11`}>{FORMS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
//         </Field>
//         <Field label="Drug class">
//           <select value={f.schedule} onChange={set('schedule')} className={`${field} h-11`}>{SCHEDULES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
//         </Field>
//         <Field label="Selling price (₦) *"><input required inputMode="decimal" value={f.sellingPrice} onChange={set('sellingPrice')} className={`${field} h-11`} /></Field>
//         <Field label="Stock unit" hint="What one unit of stock is: tablet, bottle, vial"><input value={f.unit} onChange={set('unit')} className={`${field} h-11`} /></Field>
//         <Field label="Reorder level" hint="Alert when stock falls to this number"><input inputMode="numeric" value={f.reorderLevel} onChange={set('reorderLevel')} className={`${field} h-11`} /></Field>
//         <Field label="Barcode"><input value={f.barcode} onChange={set('barcode')} className={`${field} h-11`} /></Field>
//         <Field label="NAFDAC number"><input value={f.nafdacNumber} onChange={set('nafdacNumber')} className={`${field} h-11`} /></Field>
//         <Field label="Manufacturer"><input value={f.manufacturer} onChange={set('manufacturer')} className={`${field} h-11`} /></Field>
//         <Field label="Category"><input value={f.category} onChange={set('category')} className={`${field} h-11`} placeholder="Analgesic" /></Field>
//       </div>
//       <div className="flex flex-wrap gap-5 text-sm">
//         <label className="flex items-center gap-2"><input type="checkbox" checked={f.coldChain} onChange={set('coldChain')} className="h-4 w-4 accent-pharmacy-600" /> Needs cold storage</label>
//         <label className="flex items-center gap-2"><input type="checkbox" checked={f.highAlert} onChange={set('highAlert')} className="h-4 w-4 accent-pharmacy-600" /> High-alert drug</label>
//       </div>
//       <div className="flex justify-end gap-2">
//         <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
//         <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Add drug'}</button>
//       </div>
//     </form>
//   );
// }

// /* ------------------------------ receive stock ------------------------------ */
// const blankRow = () => ({ key: Math.random().toString(36).slice(2), drug: null, batchNo: '', expiryDate: '', quantity: '', costPrice: '' });

// function ReceiveForm({ onSaved, onClose }) {
//   const [suppliers, setSuppliers] = useState([]);
//   const [supplierId, setSupplierId] = useState('');
//   const [invoiceNo, setInvoiceNo] = useState('');
//   const [rows, setRows] = useState([blankRow()]);
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState('');

//   useEffect(() => { api('/pharmacy/suppliers').then((r) => setSuppliers(r.data)).catch(() => {}); }, []);
//   const patch = (key, p) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

//   const addSupplier = async () => {
//     const name = window.prompt('Supplier name');
//     if (!name?.trim()) return;
//     try {
//       const r = await api('/pharmacy/suppliers', { method: 'POST', body: { name: name.trim() } });
//       setSuppliers((s) => [...s, r.data]); setSupplierId(r.data._id);
//     } catch (e) { setError(e.message); }
//   };

//   const save = async (e) => {
//     e.preventDefault();
//     setError('');
//     if (rows.some((r) => !r.drug)) return setError('Choose a drug for every row, or remove the empty row.');
//     setBusy(true);
//     try {
//       await api('/pharmacy/receipts', {
//         method: 'POST',
//         body: {
//           supplierId: supplierId || undefined, invoiceNo: invoiceNo || undefined,
//           items: rows.map((r) => ({ drugId: r.drug._id, batchNo: r.batchNo, expiryDate: r.expiryDate, quantity: Number(r.quantity), costPrice: Number(r.costPrice) })),
//         },
//       });
//       onSaved();
//     } catch (err) { setError(err.message); } finally { setBusy(false); }
//   };

//   return (
//     <form onSubmit={save} className="space-y-4">
//       <ErrorNote>{error}</ErrorNote>
//       <div className="grid gap-3 sm:grid-cols-2">
//         <Field label="Supplier">
//           <div className="flex gap-2">
//             <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={`${field} h-11`}>
//               <option value="">No supplier</option>
//               {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
//             </select>
//             <button type="button" onClick={addSupplier} className={`${ghostBtn} shrink-0 px-3`}>New</button>
//           </div>
//         </Field>
//         <Field label="Invoice number"><input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={`${field} h-11`} /></Field>
//       </div>

//       <ul className="space-y-3">
//         {rows.map((r, n) => (
//           <li key={r.key} className="space-y-3 rounded-2xl bg-gray-50 p-3">
//             <div className="flex items-center justify-between text-sm font-medium text-navy-800">
//               <span>Item {n + 1}</span>
//               {rows.length > 1 && <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="text-danger-dark">Remove</button>}
//             </div>
//             {r.drug ? (
//               <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-gray-200">
//                 <span className="truncate">{drugLabel(r.drug)}</span>
//                 <button type="button" onClick={() => patch(r.key, { drug: null })} className="text-pharmacy-700">Change</button>
//               </div>
//             ) : <DrugPicker inStock={false} placeholder="Search the drug you received" onPick={(d) => patch(r.key, { drug: d })} />}
//             <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
//               <Field label="Batch no."><input required value={r.batchNo} onChange={(e) => patch(r.key, { batchNo: e.target.value })} className={`${field} h-11`} /></Field>
//               <Field label="Expiry"><input required type="date" value={r.expiryDate} onChange={(e) => patch(r.key, { expiryDate: e.target.value })} className={`${field} h-11`} /></Field>
//               <Field label="Quantity"><input required inputMode="numeric" value={r.quantity} onChange={(e) => patch(r.key, { quantity: e.target.value })} className={`${field} h-11`} /></Field>
//               <Field label="Cost each (₦)"><input required inputMode="decimal" value={r.costPrice} onChange={(e) => patch(r.key, { costPrice: e.target.value })} className={`${field} h-11`} /></Field>
//             </div>
//           </li>
//         ))}
//       </ul>
//       <button type="button" onClick={() => setRows((rs) => [...rs, blankRow()])} className={ghostBtn}>Add another item</button>
//       <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
//         <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
//         <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Saving…' : 'Add to stock'}</button>
//       </div>
//     </form>
//   );
// }

// /* ------------------------------ batches + history ------------------------------ */
// function BatchRow({ batch, onChanged, isManager }) {
//   const [mode, setMode] = useState(null); // 'count' | 'writeoff' | 'release' | 'destroy'
//   const [qty, setQty] = useState('');
//   const [reason, setReason] = useState('');
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState('');
//   const d = daysUntil(batch.expiryDate);

//   const submit = async (e) => {
//     e.preventDefault();
//     setBusy(true); setError('');
//     try {
//       if (mode === 'count' || mode === 'writeoff') {
//         await api('/pharmacy/adjustments', { method: 'POST', body: { batchId: batch._id, mode, quantity: Number(qty), reason } });
//       } else {
//         await api(`/pharmacy/batches/${batch._id}/quarantine`, { method: 'POST', body: { action: mode === 'release' ? 'release' : 'writeoff', quantity: Number(qty) } });
//       }
//       setMode(null); setQty(''); setReason(''); onChanged();
//     } catch (err) { setError(err.message); } finally { setBusy(false); }
//   };

//   return (
//     <li className="rounded-2xl bg-gray-50 p-3 text-sm">
//       <div className="flex flex-wrap items-center justify-between gap-2">
//         <div>
//           <p className="font-medium text-navy-900">Batch {batch.batchNo}</p>
//           <p className="text-xs text-gray-600">Expires {fmtDate(batch.expiryDate)} · cost {money(batch.costPrice)}{batch.supplier?.name ? ` · ${batch.supplier.name}` : ''}</p>
//         </div>
//         <div className="flex items-center gap-2">
//           <Pill tone={d <= 0 ? 'danger' : d <= 90 ? 'warning' : 'success'}>{d <= 0 ? 'Expired' : `${d} days left`}</Pill>
//           <span className="font-semibold text-navy-900">{batch.quantity} units</span>
//         </div>
//       </div>
//       {batch.quarantinedQty > 0 && (
//         <p className="mt-2 rounded-lg bg-warning-light px-3 py-2 text-xs text-warning-dark">{batch.quarantinedQty} returned units are in quarantine and can't be sold yet.</p>
//       )}
//       {isManager && !mode && (
//         <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-pharmacy-700">
//           <button type="button" onClick={() => setMode('count')}>Recount</button>
//           <button type="button" onClick={() => setMode('writeoff')}>Write off</button>
//           {batch.quarantinedQty > 0 && <button type="button" onClick={() => { setMode('release'); setQty(String(batch.quarantinedQty)); }}>Release quarantine</button>}
//           {batch.quarantinedQty > 0 && <button type="button" onClick={() => { setMode('destroy'); setQty(String(batch.quarantinedQty)); }}>Destroy quarantine</button>}
//         </div>
//       )}
//       {mode && (
//         <form onSubmit={submit} className="mt-3 space-y-3">
//           <ErrorNote>{error}</ErrorNote>
//           <div className="grid gap-3 sm:grid-cols-2">
//             <Field label={mode === 'count' ? 'Counted quantity' : 'Quantity'}><input required inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className={`${field} h-11`} /></Field>
//             {(mode === 'count' || mode === 'writeoff') && (
//               <Field label="Reason"><input required value={reason} onChange={(e) => setReason(e.target.value)} className={`${field} h-11`} placeholder="Damaged, expired, stock count…" /></Field>
//             )}
//           </div>
//           <div className="flex gap-2">
//             <button type="submit" disabled={busy} className={`${primaryBtn} h-10`}>{busy ? 'Saving…' : 'Confirm'}</button>
//             <button type="button" onClick={() => setMode(null)} className={`${ghostBtn} h-10`}>Cancel</button>
//           </div>
//         </form>
//       )}
//     </li>
//   );
// }

// function BatchesSheet({ drug, isManager, onChanged }) {
//   const [tab, setTab] = useState('batches');
//   const [batches, setBatches] = useState(null);
//   const [moves, setMoves] = useState(null);
//   const [error, setError] = useState('');
//   const load = useCallback(() => api(`/pharmacy/drugs/${drug._id}/batches`).then((r) => setBatches(r.data?.data)).catch((e) => setError(e.message)), [drug._id]);
//   useEffect(() => { load(); }, [load]);
//   useEffect(() => {
//     if (tab === 'history' && !moves) api(`/pharmacy/drugs/${drug._id}/movements`, { params: { limit: 30 } }).then((r) => setMoves(r.data?.data)).catch((e) => setError(e.message));
//   }, [tab, moves, drug._id]);

//   return (
//     <div>
//       <div className="mb-4 flex gap-2">
//         {['batches', 'history'].map((t) => (
//           <button key={t} type="button" onClick={() => setTab(t)} className={`h-9 rounded-full px-4 text-sm font-medium ${tab === t ? 'bg-pharmacy-600 text-white' : 'bg-gray-100 text-navy-700'}`}>{t === 'batches' ? 'Batches' : 'Stock history'}</button>
//         ))}
//       </div>
//       <ErrorNote>{error}</ErrorNote>
//       {tab === 'batches' && (!batches ? <Skeleton className="h-24 rounded-2xl" /> : batches.length === 0 ? <p className="text-sm text-gray-600">No stock has been received for this drug yet.</p> : (
//         <ul className="space-y-3">{batches.map((b) => <BatchRow key={b._id} batch={b} isManager={isManager} onChanged={() => { load(); setMoves(null); onChanged(); }} />)}</ul>
//       ))}
//       {tab === 'history' && (!moves ? <Skeleton className="h-24 rounded-2xl" /> : moves.length === 0 ? <p className="text-sm text-gray-600">No movements yet.</p> : (
//         <ul className="divide-y divide-gray-100 text-sm">
//           {moves.map((m) => (
//             <li key={m._id} className="flex items-start justify-between gap-3 py-2.5">
//               <span className="min-w-0">
//                 <span className="block capitalize text-navy-900">{m.type.replace(/_/g, ' ')}{m.batch?.batchNo ? ` · batch ${m.batch.batchNo}` : ''}</span>
//                 <span className="block text-xs text-gray-500">{fmtDate(m.createdAt, true)}{m.by?.fullName ? ` · ${m.by.fullName}` : ''}{m.reason ? ` · ${m.reason}` : ''}</span>
//               </span>
//               <span className={`shrink-0 font-semibold ${m.quantity < 0 ? 'text-danger' : 'text-pharmacy-700'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span>
//             </li>
//           ))}
//         </ul>
//       ))}
//     </div>
//   );
// }

// /* ------------------------------ page ------------------------------ */
// export default function PharmacyInventoryPage() {
//   const me = usePharmacyMe();
//   const isManager = !!me?.isManager;
//   const [q, setQ] = useState('');
//   const dq = useDebounced(q, 350);
//   const [filter, setFilter] = useState('all');
//   const [drugs, setDrugs] = useState(null);
//   const [meta, setMeta] = useState(null);
//   const [page, setPage] = useState(1);
//   const [error, setError] = useState('');
//   const [sheet, setSheet] = useState(null); // { kind: 'add'|'edit'|'receive'|'batches', drug? }

//   const load = useCallback(() => {
//     const params = { page, limit: 20, ...(dq.trim() ? { q: dq.trim() } : {}), ...(filter !== 'all' ? { stock: filter } : {}) };
//     api('/pharmacy/drugs', { params }).then((r) => { setDrugs(r.data?.data); setMeta(r.meta); setError(''); }).catch((e) => setError(e.message));
//   }, [dq, filter, page]);
//   useEffect(() => { load(); }, [load]);
//   useEffect(() => { setPage(1); }, [dq, filter]);

//   const done = () => { setSheet(null); load(); };

//   return (
//     <PageShell className="max-w-5xl">
//       <PageHeader title="Inventory" subtitle="Your drug catalog and stock, tracked batch by batch." />
//       <PharmacyNav />

//       <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
//         <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or barcode" aria-label="Search inventory" className={`${field} h-11 sm:max-w-sm`} />
//         <div className="flex gap-2 overflow-x-auto">
//           {[['all', 'All'], ['low', 'Low stock'], ['out', 'Out of stock']].map(([id, label]) => (
//             <button key={id} type="button" onClick={() => setFilter(id)} className={`h-10 whitespace-nowrap rounded-full px-4 text-sm font-medium ${filter === id ? 'bg-navy-800 text-white' : 'bg-white text-navy-700 ring-1 ring-gray-200'}`}>{label}</button>
//           ))}
//         </div>
//         {isManager && (
//           <div className="flex gap-2 sm:ml-auto">
//             <button type="button" onClick={() => setSheet({ kind: 'receive' })} className={ghostBtn}>Receive stock</button>
//             <button type="button" onClick={() => setSheet({ kind: 'add' })} className={primaryBtn}>Add drug</button>
//           </div>
//         )}
//       </div>
//       <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>

//       {!drugs ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
//         : drugs.length === 0 ? <EmptyState icon="pill" title="No drugs found" body={isManager ? 'Add your first drug, then receive stock for it.' : 'Nothing matches your search.'} />
//         : (
//           <ul className="space-y-3">
//             {drugs.map((d) => {
//               const expDays = d.nearestExpiry ? daysUntil(d.nearestExpiry) : null;
//               return (
//                 <li key={d._id}>
//                   <Card className="space-y-3">
//                     <div className="flex items-start justify-between gap-3">
//                       <div className="min-w-0">
//                         <h3 className="truncate font-semibold text-navy-900">{drugLabel(d)}</h3>
//                         <p className="text-sm text-gray-600 capitalize">{d.form}{d.category ? ` · ${d.category}` : ''}</p>
//                       </div>
//                       <p className="shrink-0 font-semibold text-pharmacy-700">{money(d.sellingPrice)}</p>
//                     </div>
//                     <div className="flex flex-wrap items-center gap-2">
//                       <Pill tone={d.stock === 0 ? 'danger' : d.stock <= d.reorderLevel ? 'warning' : 'success'}>{d.stock === 0 ? 'Out of stock' : `${d.stock} on hand`}</Pill>
//                       {d.expired > 0 && <Pill tone="danger">{d.expired} expired</Pill>}
//                       {expDays != null && expDays <= 90 && <Pill tone="warning">Nearest expiry in {expDays} days</Pill>}
//                       {d.schedule === 'controlled' && <Pill tone="info">Controlled</Pill>}
//                       {d.schedule === 'prescription_only' && <Pill>Rx only</Pill>}
//                       {d.coldChain && <Pill tone="info">Cold storage</Pill>}
//                       {d.highAlert && <Pill tone="warning">High alert</Pill>}
//                     </div>
//                     <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-3 text-sm font-medium text-pharmacy-700">
//                       <button type="button" onClick={() => setSheet({ kind: 'batches', drug: d })}>Batches and history</button>
//                       {isManager && <button type="button" onClick={() => setSheet({ kind: 'edit', drug: d })}>Edit</button>}
//                     </div>
//                   </Card>
//                 </li>
//               );
//             })}
//           </ul>
//         )}

//       {meta?.pages > 1 && (
//         <div className="mt-5 flex items-center justify-between">
//           <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={ghostBtn}>Previous</button>
//           <span className="text-sm text-gray-600">Page {page} of {meta.pages}</span>
//           <button type="button" disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)} className={ghostBtn}>Next</button>
//         </div>
//       )}

//       <Sheet open={sheet?.kind === 'add'} title="Add a drug" onClose={() => setSheet(null)} wide><DrugForm onSaved={done} onClose={() => setSheet(null)} /></Sheet>
//       <Sheet open={sheet?.kind === 'edit'} title="Edit drug" onClose={() => setSheet(null)} wide>{sheet?.kind === 'edit' && <DrugForm initial={sheet.drug} onSaved={done} onClose={() => setSheet(null)} />}</Sheet>
//       <Sheet open={sheet?.kind === 'receive'} title="Receive stock" onClose={() => setSheet(null)} wide><ReceiveForm onSaved={done} onClose={() => setSheet(null)} /></Sheet>
//       <Sheet open={sheet?.kind === 'batches'} title={sheet?.drug ? drugLabel(sheet.drug) : ''} onClose={() => { setSheet(null); load(); }} wide>
//         {sheet?.kind === 'batches' && <BatchesSheet drug={sheet.drug} isManager={isManager} onChanged={load} />}
//       </Sheet>
//     </PageShell>
//   );
// }






























import { useCallback, useEffect, useState } from 'react';
import api from './api';
import { useDebounced } from '../appointments/hooks';

import { Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../appointments/ui';
import {
  DrugPicker, Field, PharmacyNav, Pill, Sheet, daysUntil, drugLabel, field, fmtDate, ghostBtn, money, primaryBtn, usePharmacyMe,
} from './PharmacyShared';
import ImagePicker from '../../utils/ImagePicker';

const FORMS = ['tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'suppository', 'powder', 'other'];
const SCHEDULES = [
  { id: 'otc', label: 'Over the counter' },
  { id: 'prescription_only', label: 'Prescription only' },
  { id: 'controlled', label: 'Controlled drug' },
];
const blankDrug = {
  genericName: '', brandName: '', strength: '', form: 'tablet', route: '', packSize: '', unit: 'unit',
  schedule: 'prescription_only', sellingPrice: '', reorderLevel: 10, maxStock: '', barcode: '',
  nafdacNumber: '', manufacturer: '', category: '', coldChain: false, highAlert: false, images: [],
};

/* The API helper may return the body ({ success, data, meta }) or an axios-style { data: body }.
   These helpers work with either shape. */
const unwrap = (r) => (r && typeof r === 'object' && 'success' in r ? r : r?.data ?? r);
const listOf = (r) => {
  const b = unwrap(r);
  return Array.isArray(b?.data) ? b.data : Array.isArray(b) ? b : [];
};
const metaOf = (r) => unwrap(r)?.meta ?? null;
const dataOf = (r) => unwrap(r)?.data ?? null;

/* ------------------------------ add / edit ------------------------------ */
function DrugForm({ initial, onSaved, onClose }) {
  const [f, setF] = useState(initial ? { ...blankDrug, ...initial, images: initial.images || [] } : blankDrug);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (uploading) return;
    setBusy(true); setError('');
    try {
      const body = { ...f, sellingPrice: Number(f.sellingPrice), reorderLevel: Number(f.reorderLevel) };
      if (f.maxStock === '' || f.maxStock == null) delete body.maxStock; else body.maxStock = Number(f.maxStock);
      ['_id', 'stock', 'sellable', 'expired', 'nearestExpiry', 'pharmacy', 'createdAt', 'updatedAt', '__v', 'costPrice']
        .forEach((k) => delete body[k]);
      if (initial) await api(`/pharmacy/drugs/${initial._id}`, { method: 'PATCH', body });
      else await api('/pharmacy/drugs', { method: 'POST', body });
      onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <ErrorNote>{error}</ErrorNote>

      <Field label="Photos">
        <ImagePicker value={f.images || []} onChange={(images) => setF((x) => ({ ...x, images }))} onBusyChange={setUploading} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Generic name *"><input required value={f.genericName} onChange={set('genericName')} className={`${field} h-11`} placeholder="Paracetamol" /></Field>
        <Field label="Brand name"><input value={f.brandName || ''} onChange={set('brandName')} className={`${field} h-11`} placeholder="Panadol" /></Field>
        <Field label="Strength"><input value={f.strength || ''} onChange={set('strength')} className={`${field} h-11`} placeholder="500mg" /></Field>
        <Field label="Form">
          <select value={f.form} onChange={set('form')} className={`${field} h-11`}>{FORMS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        </Field>
        <Field label="Route"><input value={f.route || ''} onChange={set('route')} className={`${field} h-11`} placeholder="Oral, topical, IV…" /></Field>
        <Field label="Pack size"><input value={f.packSize || ''} onChange={set('packSize')} className={`${field} h-11`} placeholder="10 x 10" /></Field>
        <Field label="Drug class">
          <select value={f.schedule} onChange={set('schedule')} className={`${field} h-11`}>{SCHEDULES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        </Field>
        <Field label="Selling price (₦) *"><input required inputMode="decimal" value={f.sellingPrice} onChange={set('sellingPrice')} className={`${field} h-11`} /></Field>
        <Field label="Stock unit" hint="What one unit of stock is: tablet, bottle, vial"><input value={f.unit || ''} onChange={set('unit')} className={`${field} h-11`} /></Field>
        <Field label="Reorder level" hint="Alert when stock falls to this number"><input inputMode="numeric" value={f.reorderLevel} onChange={set('reorderLevel')} className={`${field} h-11`} /></Field>
        <Field label="Max stock" hint="Optional upper limit"><input inputMode="numeric" value={f.maxStock ?? ''} onChange={set('maxStock')} className={`${field} h-11`} /></Field>
        <Field label="Barcode"><input value={f.barcode || ''} onChange={set('barcode')} className={`${field} h-11`} /></Field>
        <Field label="NAFDAC number"><input value={f.nafdacNumber || ''} onChange={set('nafdacNumber')} className={`${field} h-11`} /></Field>
        <Field label="Manufacturer"><input value={f.manufacturer || ''} onChange={set('manufacturer')} className={`${field} h-11`} /></Field>
        <Field label="Category"><input value={f.category || ''} onChange={set('category')} className={`${field} h-11`} placeholder="Analgesic" /></Field>
      </div>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.coldChain} onChange={set('coldChain')} className="h-4 w-4 accent-pharmacy-600" /> Needs cold storage</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.highAlert} onChange={set('highAlert')} className="h-4 w-4 accent-pharmacy-600" /> High-alert drug</label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
        <button type="submit" disabled={busy || uploading} className={primaryBtn}>
          {uploading ? 'Uploading photos…' : busy ? 'Saving…' : initial ? 'Save changes' : 'Add drug'}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------ details (all fields + gallery) ------------------------------ */
function DrugDetails({ drug }) {
  const [active, setActive] = useState(0);
  const imgs = drug.images || [];
  const rows = [
    ['Generic name', drug.genericName], ['Brand name', drug.brandName], ['Strength', drug.strength],
    ['Form', drug.form], ['Route', drug.route], ['Pack size', drug.packSize], ['Stock unit', drug.unit],
    ['Category', drug.category], ['Manufacturer', drug.manufacturer], ['Barcode', drug.barcode],
    ['NAFDAC number', drug.nafdacNumber],
    ['Drug class', SCHEDULES.find((s) => s.id === drug.schedule)?.label || drug.schedule],
    ['Selling price', money(drug.sellingPrice)], ['Latest cost price', money(drug.costPrice)],
    ['On hand', drug.stock], ['Sellable', drug.sellable], ['Expired', drug.expired],
    ['Reorder level', drug.reorderLevel], ['Max stock', drug.maxStock],
    ['Cold storage', drug.coldChain ? 'Yes' : 'No'], ['High alert', drug.highAlert ? 'Yes' : 'No'],
    ['Status', drug.isActive ? 'Active' : 'Archived'],
    ['Nearest expiry', drug.nearestExpiry ? fmtDate(drug.nearestExpiry) : null],
    ['Added', drug.createdAt ? fmtDate(drug.createdAt) : null],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '');

  return (
    <div className="space-y-4">
      {imgs.length > 0 ? (
        <div className="space-y-2">
          <img src={imgs[active] || imgs[0]} alt={drugLabel(drug)} className="h-64 w-full rounded-2xl bg-gray-50 object-contain" />
          {imgs.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {imgs.map((u, i) => (
                <button key={u} type="button" onClick={() => setActive(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-2 ${i === active ? 'ring-pharmacy-600' : 'ring-transparent'}`}>
                  <img src={u} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500">No photos added</p>}
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-gray-100 py-1.5">
            <dt className="text-gray-500">{k}</dt>
            <dd className="text-right font-medium capitalize text-navy-900">{String(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
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

  useEffect(() => { api('/pharmacy/suppliers').then((r) => setSuppliers(listOf(r))).catch(() => {}); }, []);
  const patch = (key, p) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const addSupplier = async () => {
    const name = window.prompt('Supplier name');
    if (!name?.trim()) return;
    try {
      const r = await api('/pharmacy/suppliers', { method: 'POST', body: { name: name.trim() } });
      const created = dataOf(r);
      setSuppliers((s) => [...s, created]); setSupplierId(created._id);
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
  const load = useCallback(
    () => api(`/pharmacy/drugs/${drug._id}/batches`).then((r) => setBatches(listOf(r))).catch((e) => setError(e.message)),
    [drug._id]
  );
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tab === 'history' && !moves) {
      api(`/pharmacy/drugs/${drug._id}/movements`, { params: { limit: 30 } }).then((r) => setMoves(listOf(r))).catch((e) => setError(e.message));
    }
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
const FILTERS = [['all', 'All'], ['low', 'Low stock'], ['out', 'Out of stock'], ['archived', 'Archived']];

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
  const [sheet, setSheet] = useState(null); // { kind: 'add'|'edit'|'view'|'receive'|'batches', drug? }

  const load = useCallback(() => {
    const params = {
      page, limit: 20,
      ...(dq.trim() ? { q: dq.trim() } : {}),
      ...(filter === 'low' || filter === 'out' ? { stock: filter } : {}),
      ...(filter === 'archived' ? { active: 'inactive' } : {}),
    };
    api('/pharmacy/drugs', { params })
      .then((r) => { setDrugs(listOf(r)); setMeta(metaOf(r)); setError(''); })
      .catch((e) => setError(e.message));
  }, [dq, filter, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [dq, filter]);

  const done = () => { setSheet(null); load(); };

  const remove = async (d) => {
    if (!window.confirm(`Delete ${drugLabel(d)}? Drugs with stock or sales history are archived instead of erased.`)) return;
    try {
      const r = await api(`/pharmacy/drugs/${d._id}`, { method: 'DELETE' });
      if (dataOf(r)?.archived) window.alert('This drug has stock or history, so it was archived. Restore it from the Archived filter.');
      load();
    } catch (e) { setError(e.message); }
  };

  const restore = async (d) => {
    try { await api(`/pharmacy/drugs/${d._id}`, { method: 'PATCH', body: { isActive: true } }); load(); }
    catch (e) { setError(e.message); }
  };

  return (
    <PageShell className="max-w-5xl">
      <PageHeader title="Inventory" subtitle="Your drug catalog and stock, tracked batch by batch." />
      <PharmacyNav />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or barcode" aria-label="Search inventory" className={`${field} h-11 sm:max-w-sm`} />
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map(([id, label]) => (
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
        : drugs.length === 0 ? (
          <EmptyState
            icon="pill"
            title={filter === 'archived' ? 'No archived drugs' : 'No drugs found'}
            body={filter === 'archived' ? 'Drugs you delete that have stock or history appear here.' : isManager ? 'Add your first drug, then receive stock for it.' : 'Nothing matches your search.'}
          />
        ) : (
          <ul className="space-y-3">
            {drugs.map((d) => {
              const expDays = d.nearestExpiry ? daysUntil(d.nearestExpiry) : null;
              return (
                <li key={d._id}>
                  <Card className="space-y-3">
                    <div className="flex items-start gap-3">
                      {d.images?.[0]
                        ? <img src={d.images[0]} alt={drugLabel(d)} className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-gray-200" />
                        : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400">No photo</div>}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-navy-900">{drugLabel(d)}</h3>
                        <p className="text-sm capitalize text-gray-600">{d.form}{d.category ? ` · ${d.category}` : ''}{d.manufacturer ? ` · ${d.manufacturer}` : ''}</p>
                        {(d.barcode || d.nafdacNumber) && (
                          <p className="text-xs text-gray-500">
                            {d.barcode ? `Barcode ${d.barcode}` : ''}{d.barcode && d.nafdacNumber ? ' · ' : ''}{d.nafdacNumber ? `NAFDAC ${d.nafdacNumber}` : ''}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 font-semibold text-pharmacy-700">{money(d.sellingPrice)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!d.isActive && <Pill tone="danger">Archived</Pill>}
                      <Pill tone={d.stock === 0 ? 'danger' : d.stock <= d.reorderLevel ? 'warning' : 'success'}>{d.stock === 0 ? 'Out of stock' : `${d.stock} on hand`}</Pill>
                      {d.expired > 0 && <Pill tone="danger">{d.expired} expired</Pill>}
                      {expDays != null && expDays <= 90 && <Pill tone="warning">Nearest expiry in {expDays} days</Pill>}
                      {d.schedule === 'controlled' && <Pill tone="info">Controlled</Pill>}
                      {d.schedule === 'prescription_only' && <Pill>Rx only</Pill>}
                      {d.coldChain && <Pill tone="info">Cold storage</Pill>}
                      {d.highAlert && <Pill tone="warning">High alert</Pill>}
                    </div>
                    <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-3 text-sm font-medium text-pharmacy-700">
                      <button type="button" onClick={() => setSheet({ kind: 'view', drug: d })}>View details</button>
                      <button type="button" onClick={() => setSheet({ kind: 'batches', drug: d })}>Batches and history</button>
                      {isManager && <button type="button" onClick={() => setSheet({ kind: 'edit', drug: d })}>Edit</button>}
                      {isManager && d.isActive && <button type="button" className="text-danger-dark" onClick={() => remove(d)}>Delete</button>}
                      {isManager && !d.isActive && <button type="button" onClick={() => restore(d)}>Restore</button>}
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

      <Sheet open={sheet?.kind === 'add'} title="Add a drug" onClose={() => setSheet(null)} wide>
        {sheet?.kind === 'add' && <DrugForm onSaved={done} onClose={() => setSheet(null)} />}
      </Sheet>
      <Sheet open={sheet?.kind === 'edit'} title="Edit drug" onClose={() => setSheet(null)} wide>
        {sheet?.kind === 'edit' && <DrugForm initial={sheet.drug} onSaved={done} onClose={() => setSheet(null)} />}
      </Sheet>
      <Sheet open={sheet?.kind === 'view'} title={sheet?.drug ? drugLabel(sheet.drug) : ''} onClose={() => setSheet(null)} wide>
        {sheet?.kind === 'view' && <DrugDetails drug={sheet.drug} />}
      </Sheet>
      <Sheet open={sheet?.kind === 'receive'} title="Receive stock" onClose={() => setSheet(null)} wide>
        {sheet?.kind === 'receive' && <ReceiveForm onSaved={done} onClose={() => setSheet(null)} />}
      </Sheet>
      <Sheet open={sheet?.kind === 'batches'} title={sheet?.drug ? drugLabel(sheet.drug) : ''} onClose={() => { setSheet(null); load(); }} wide>
        {sheet?.kind === 'batches' && <BatchesSheet drug={sheet.drug} isManager={isManager} onChanged={load} />}
      </Sheet>
    </PageShell>
  );
}