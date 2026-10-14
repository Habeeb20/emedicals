
// import { useEffect, useState } from 'react';
// import api, { getErrorMessage } from '@/lib/api.js'; // your axios instance (token + /api base URL)
// import { toast } from 'sonner';
// import ImagePicker from '../../utils/ImagePicker';
// import DrugCategorySelect from '../../components/DrugCategorySelect'; // adjust path to where you put it
// import SelectOther from '../../components/SelectOther';

// /**
//  * Add drug (with photos) + Add stock, in one self-contained page.
//  * Backend it calls:
//  *   POST /pharmacy/drugs      -> create the product (body includes images: [cloudinaryUrl, ...])
//  *   GET  /pharmacy/drugs?q=   -> search products
//  *   POST /pharmacy/receipts   -> add stock (batch, expiry, quantity, cost)
//  */

// const FORMS = ['tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'suppository', 'powder', 'other'];
// const CLASSES = [
//   { id: 'otc', label: 'Over the counter' },
//   { id: 'prescription_only', label: 'Prescription only' },
//   { id: 'controlled', label: 'Controlled drug' },
// ];
// const ROUTES = ['Oral', 'Topical', 'Intravenous (IV)', 'Intramuscular (IM)', 'Subcutaneous', 'Sublingual', 'Rectal', 'Vaginal', 'Inhalation', 'Nasal', 'Ophthalmic (eye)', 'Otic (ear)'];
// const PACK_SIZES = ['1 x 1', '1 x 10', '1 x 100', '10 x 10', '10 x 3', '3 x 10', '2 x 10', '1 x 30', '1 x 60', '1 x 5', '60ml bottle', '100ml bottle', '200ml bottle', '15g tube', '30g tube'];
// const UNITS = ['unit', 'tablet', 'capsule', 'strip', 'sachet', 'bottle', 'vial', 'ampoule', 'tube', 'pack', 'box', 'inhaler', 'piece'];
// const REORDER_LEVELS = [5, 10, 20, 30, 50, 100];
// const MAX_STOCKS = [50, 100, 200, 500, 1000, 5000];
// const MANUFACTURERS = [
//   'Emzor Pharmaceutical', 'Fidson Healthcare', 'May & Baker Nigeria', 'GlaxoSmithKline', 'Pfizer', 'Neimeth',
//   'Swipha', 'Juhel Nigeria', 'Drugfield', 'Greenlife Pharmaceuticals', 'Sanofi', 'Cipla', 'Novartis',
// ];

// const input = 'h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-navy-900 focus:border-pharmacy-500 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/30';
// const btn = 'inline-flex h-11 items-center justify-center rounded-xl bg-pharmacy-600 px-5 text-sm font-semibold text-white hover:bg-pharmacy-700 disabled:cursor-not-allowed disabled:opacity-50';
// const ghost = 'inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-navy-800 ring-1 ring-gray-200 hover:bg-gray-50';

// const Field = ({ label, hint, children }) => (
//   <label className="block">
//     <span className="mb-1 block text-sm font-medium text-navy-800">{label}</span>
//     {children}
//     {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
//   </label>
// );

// const Message = ({ type, children }) =>
//   children ? (
//     <p role={type === 'error' ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-sm ${type === 'error' ? 'bg-danger-light text-danger-dark' : 'bg-success-light text-success-dark'}`}>
//       {children}
//     </p>
//   ) : null;

// // Works whether the helper returns the response body ({ success, data }) or the payload itself
// const payload = (r) => {
//   let d = r?.data ?? r;
//   if (d && !Array.isArray(d) && typeof d === 'object' && 'success' in d && 'data' in d) d = d.data;
//   return d;
// };
// const toList = (r) => {
//   const d = payload(r);
//   return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
// };

// const drugName = (d) => [d.genericName, d.brandName && `(${d.brandName})`, d.strength].filter(Boolean).join(' ');

// /* ------------------------------ ADD DRUG ------------------------------ */
// const blankDrug = () => ({
//   genericName: '', brandName: '', strength: '', form: 'tablet', route: '', packSize: '', schedule: 'prescription_only',
//   sellingPrice: '', reorderLevel: 10, maxStock: '', unit: 'unit', barcode: '', nafdacNumber: '', manufacturer: '',
//   category: '', coldChain: false, highAlert: false, images: [],
// });

// function AddDrug({ onAdded }) {
//   const [f, setF] = useState(blankDrug);
//   const [formKey, setFormKey] = useState(0); // remounts dropdowns after a successful save so "Other" boxes reset
//   const [busy, setBusy] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [error, setError] = useState('');
//   const [ok, setOk] = useState('');
//   const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
//   const setVal = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

//   const submit = async (e) => {
//     e.preventDefault();
//     if (uploading) return;
//     setBusy(true); setError(''); setOk('');
//     try {
//       const body = { ...f, sellingPrice: Number(f.sellingPrice), reorderLevel: Number(f.reorderLevel) };
//       if (f.maxStock === '' || f.maxStock == null) delete body.maxStock; else body.maxStock = Number(f.maxStock);
//       const r = await api.post('/pharmacy/drugs', body);
//       const drug = payload(r);
//       setOk(`${drugName(drug)} added. Now add stock for it below.`);
//       setF(blankDrug());
//       setFormKey((k) => k + 1);
//       onAdded(drug);
//     } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(false); }
//   };

//   return (
//     <form key={formKey} onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-gray-200">
//       <h2 className="text-lg font-semibold text-navy-900">1. Add a drug (product)</h2>
//       <Message type="error">{error}</Message>
//       <Message type="ok">{ok}</Message>

//       <Field label="Photos">
//         <ImagePicker value={f.images} onChange={(images) => setF((x) => ({ ...x, images }))} onBusyChange={setUploading} />
//       </Field>

//       <div className="grid gap-3 sm:grid-cols-2">
//         {/* Names, strength, price, barcode and NAFDAC number stay as text inputs: they are unique per product */}
//         <Field label="Generic name *"><input required className={input} value={f.genericName} onChange={set('genericName')} placeholder="Paracetamol" /></Field>
//         <Field label="Brand name"><input className={input} value={f.brandName} onChange={set('brandName')} placeholder="Panadol" /></Field>
//         <Field label="Strength"><input className={input} value={f.strength} onChange={set('strength')} placeholder="500mg" /></Field>
//         <Field label="Form">
//           <select className={input} value={f.form} onChange={set('form')}>{FORMS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
//         </Field>
//         <Field label="Route">
//           <SelectOther value={f.route} onChange={setVal('route')} options={ROUTES} placeholder="Select route" otherPlaceholder="Type the route" />
//         </Field>
//         <Field label="Pack size">
//           <SelectOther value={f.packSize} onChange={setVal('packSize')} options={PACK_SIZES} placeholder="Select pack size" otherPlaceholder="e.g. 10 x 10" />
//         </Field>
//         <Field label="Drug class">
//           <select className={input} value={f.schedule} onChange={set('schedule')}>{CLASSES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
//         </Field>
//         <Field label="Selling price (₦) *"><input required inputMode="decimal" className={input} value={f.sellingPrice} onChange={set('sellingPrice')} /></Field>
//         <Field label="Stock unit" hint="What one unit is: tablet, bottle, vial">
//           <SelectOther value={f.unit} onChange={setVal('unit')} options={UNITS} placeholder="Select unit" otherPlaceholder="Type the unit" />
//         </Field>
//         <Field label="Reorder level" hint="Alert when stock falls to this number">
//           <SelectOther value={f.reorderLevel} onChange={setVal('reorderLevel')} options={REORDER_LEVELS} placeholder="Select level" otherPlaceholder="Type a number" />
//         </Field>
//         <Field label="Max stock" hint="Optional upper limit">
//           <SelectOther value={f.maxStock} onChange={setVal('maxStock')} options={MAX_STOCKS} placeholder="No limit" otherPlaceholder="Type a number" />
//         </Field>
//         <Field label="Barcode"><input className={input} value={f.barcode} onChange={set('barcode')} /></Field>
//         <Field label="NAFDAC number"><input className={input} value={f.nafdacNumber} onChange={set('nafdacNumber')} /></Field>
//         <Field label="Manufacturer">
//           <SelectOther value={f.manufacturer} onChange={setVal('manufacturer')} options={MANUFACTURERS} placeholder="Select manufacturer" otherPlaceholder="Type the manufacturer" />
//         </Field>
//         <Field label="Category">
//           <DrugCategorySelect value={f.category} onChange={setVal('category')} />
//         </Field>
//       </div>

//       <div className="flex flex-wrap gap-5 text-sm">
//         <label className="flex items-center gap-2"><input type="checkbox" checked={f.coldChain} onChange={set('coldChain')} className="h-4 w-4 accent-pharmacy-600" /> Needs cold storage</label>
//         <label className="flex items-center gap-2"><input type="checkbox" checked={f.highAlert} onChange={set('highAlert')} className="h-4 w-4 accent-pharmacy-600" /> High-alert drug</label>
//       </div>

//       <button type="submit" disabled={busy || uploading} className={btn}>
//         {uploading ? 'Uploading photos…' : busy ? 'Saving…' : 'Add drug'}
//       </button>
//     </form>
//   );
// }

// /* ------------------------------ ADD STOCK ------------------------------ */
// const blankRow = () => ({ key: Math.random().toString(36).slice(2), drug: null, batchNo: '', expiryDate: '', quantity: '', costPrice: '' });

// function DrugThumb({ drug }) {
//   return drug.images?.[0]
//     ? <img src={drug.images[0]} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-gray-200" />
//     : <span className="h-8 w-8 shrink-0 rounded-lg bg-gray-100" />;
// }

// function DrugSearch({ onPick, refreshKey }) {
//   const [q, setQ] = useState('');
//   const [results, setResults] = useState([]);
//   const [busy, setBusy] = useState(false);

//   useEffect(() => {
//     if (q.trim().length < 2) { setResults([]); return undefined; }
//     let off = false;
//     const t = setTimeout(() => {
//       setBusy(true);
//       api.get('/pharmacy/drugs', { params: { q: q.trim(), limit: 8 } })
//         .then((r) => !off && setResults(toList(r)))
//         .catch(() => !off && setResults([]))
//         .finally(() => !off && setBusy(false));
//     }, 300);
//     return () => { off = true; clearTimeout(t); };
//   }, [q, refreshKey]);

//   return (
//     <div className="relative">
//       <input className={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the drug you received" aria-label="Search drug" />
//       {q.trim().length >= 2 && (
//         <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
//           {busy && <li className="px-4 py-3 text-sm text-gray-500">Searching…</li>}
//           {!busy && results.length === 0 && <li className="px-4 py-3 text-sm text-gray-600">No drug found. Add it in step 1 first.</li>}
//           {results.map((d) => (
//             <li key={d._id}>
//               <button type="button" onClick={() => { onPick(d); setQ(''); setResults([]); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-pharmacy-50">
//                 <DrugThumb drug={d} />
//                 <span className="min-w-0 flex-1 truncate font-medium text-navy-900">{drugName(d)}</span>
//                 <span className="shrink-0 text-xs text-gray-500">{d.stock} in stock</span>
//               </button>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }

// function AddStock({ preset, refreshKey }) {
//   const [suppliers, setSuppliers] = useState([]);
//   const [supplierId, setSupplierId] = useState('');
//   const [invoiceNo, setInvoiceNo] = useState('');
//   const [rows, setRows] = useState([blankRow()]);
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState('');
//   const [ok, setOk] = useState('');

//   useEffect(() => { api.get('/pharmacy/suppliers').then((r) => setSuppliers(toList(r))).catch(() => setSuppliers([])); }, []);

//   // When a drug was just added in step 1, drop it into the first empty row
//   useEffect(() => {
//     if (!preset) return;
//     setRows((rs) => {
//       const i = rs.findIndex((r) => !r.drug);
//       if (i === -1) return [...rs, { ...blankRow(), drug: preset }];
//       return rs.map((r, n) => (n === i ? { ...r, drug: preset } : r));
//     });
//   }, [preset]);

//   const patch = (key, p) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

//   const addSupplier = async () => {
//     const name = window.prompt('Supplier name');
//     if (!name?.trim()) return;
//     try {
//       const r = await api.post('/pharmacy/suppliers', { name: name.trim() });
//       const created = payload(r);
//       toast.success('Supplier added');
//       setSuppliers((s) => [...s, created]); setSupplierId(created._id);
//     } catch (e) { setError(getErrorMessage(e)); }
//   };

//   const submit = async (e) => {
//     e.preventDefault();
//     setError(''); setOk('');
//     if (rows.some((r) => !r.drug)) return setError('Choose a drug for every row, or remove the empty row.');
//     setBusy(true);
//     try {
//       await api.post('/pharmacy/receipts', {
//         supplierId: supplierId || undefined,
//         invoiceNo: invoiceNo || undefined,
//         items: rows.map((r) => ({
//           drugId: r.drug._id, batchNo: r.batchNo, expiryDate: r.expiryDate,
//           quantity: Number(r.quantity), costPrice: Number(r.costPrice),
//         })),
//       });
//       setOk('Stock added successfully.');
//       setRows([blankRow()]); setInvoiceNo('');
//     } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(false); }
//   };

//   return (
//     <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-gray-200">
//       <h2 className="text-lg font-semibold text-navy-900">2. Add stock</h2>
//       <Message type="error">{error}</Message>
//       <Message type="ok">{ok}</Message>

//       <div className="grid gap-3 sm:grid-cols-2">
//         <Field label="Supplier">
//           <div className="flex gap-2">
//             <select className={input} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
//               <option value="">No supplier</option>
//               {(suppliers || []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
//             </select>
//             <button type="button" onClick={addSupplier} className={`${ghost} shrink-0 px-3`}>New</button>
//           </div>
//         </Field>
//         <Field label="Invoice number"><input className={input} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></Field>
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
//                 <span className="flex min-w-0 items-center gap-3">
//                   <DrugThumb drug={r.drug} />
//                   <span className="truncate">{drugName(r.drug)}</span>
//                 </span>
//                 <button type="button" onClick={() => patch(r.key, { drug: null })} className="shrink-0 text-pharmacy-700">Change</button>
//               </div>
//             ) : <DrugSearch refreshKey={refreshKey} onPick={(d) => patch(r.key, { drug: d })} />}
//             {/* Batch no, expiry date, quantity and cost are unique values per delivery, so they stay as inputs */}
//             <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
//               <Field label="Batch no. *"><input required className={input} value={r.batchNo} onChange={(e) => patch(r.key, { batchNo: e.target.value })} /></Field>
//               <Field label="Expiry date *"><input required type="date" className={input} value={r.expiryDate} onChange={(e) => patch(r.key, { expiryDate: e.target.value })} /></Field>
//               <Field label="Quantity *"><input required inputMode="numeric" className={input} value={r.quantity} onChange={(e) => patch(r.key, { quantity: e.target.value })} /></Field>
//               <Field label="Cost each (₦) *"><input required inputMode="decimal" className={input} value={r.costPrice} onChange={(e) => patch(r.key, { costPrice: e.target.value })} /></Field>
//             </div>
//           </li>
//         ))}
//       </ul>

//       <div className="flex flex-wrap gap-2">
//         <button type="button" onClick={() => setRows((rs) => [...rs, blankRow()])} className={ghost}>Add another item</button>
//         <button type="submit" disabled={busy} className={btn}>{busy ? 'Saving…' : 'Add to stock'}</button>
//       </div>
//     </form>
//   );
// }

// /* ------------------------------ PAGE ------------------------------ */
// export default function AddDrugStockPage() {
//   const [justAdded, setJustAdded] = useState(null);
//   const [refreshKey, setRefreshKey] = useState(0);

//   return (
//     <div className="mx-auto w-full max-w-3xl space-y-6">
//       <div>
//         <h1 className="text-2xl font-bold text-navy-900">Add drug and stock</h1>
//         <p className="mt-1 text-sm text-gray-600">First create the drug with its photos, then add the stock you received for it.</p>
//       </div>
//       <AddDrug onAdded={(d) => { setJustAdded(d); setRefreshKey((k) => k + 1); }} />
//       <AddStock preset={justAdded} refreshKey={refreshKey} />
//     </div>
//   );


// }






















import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '@/lib/api.js'; // your axios instance (token + /api base URL)
import { toast } from 'sonner';
import ImagePicker from '../../utils/ImagePicker';
import DrugCategorySelect from '../../components/DrugCategorySelect'; // adjust path to where you put it
import SelectOther from '../../components/SelectOther';

/**
 * One form: the pharmacist enters the drug AND the stock received, then presses one button.
 * Behind the scenes it calls:
 *   POST /pharmacy/drugs      -> create the product (body includes images: [cloudinaryUrl, ...])
 *   POST /pharmacy/receipts   -> add the stock (batch, expiry, quantity, cost) for that new drug
 *   GET  /pharmacy/suppliers  -> supplier dropdown
 *   POST /pharmacy/suppliers  -> "New" supplier
 *
 * If the drug saves but the stock call fails, the drug is remembered so a retry only re-sends the
 * stock (no duplicate drug is created).
 */

const FORMS = ['tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'suppository', 'powder', 'other'];
const CLASSES = [
  { id: 'otc', label: 'Over the counter' },
  { id: 'prescription_only', label: 'Prescription only' },
  { id: 'controlled', label: 'Controlled drug' },
];
const ROUTES = ['Oral', 'Topical', 'Intravenous (IV)', 'Intramuscular (IM)', 'Subcutaneous', 'Sublingual', 'Rectal', 'Vaginal', 'Inhalation', 'Nasal', 'Ophthalmic (eye)', 'Otic (ear)'];
const PACK_SIZES = ['1 x 1', '1 x 10', '1 x 100', '10 x 10', '10 x 3', '3 x 10', '2 x 10', '1 x 30', '1 x 60', '1 x 5', '60ml bottle', '100ml bottle', '200ml bottle', '15g tube', '30g tube'];
const UNITS = ['unit', 'tablet', 'capsule', 'strip', 'sachet', 'bottle', 'vial', 'ampoule', 'tube', 'pack', 'box', 'inhaler', 'piece'];
const REORDER_LEVELS = [5, 10, 20, 30, 50, 100];
const MAX_STOCKS = [50, 100, 200, 500, 1000, 5000];
const MANUFACTURERS = [
  'Emzor Pharmaceutical', 'Fidson Healthcare', 'May & Baker Nigeria', 'GlaxoSmithKline', 'Pfizer', 'Neimeth',
  'Swipha', 'Juhel Nigeria', 'Drugfield', 'Greenlife Pharmaceuticals', 'Sanofi', 'Cipla', 'Novartis',
];

const input = 'h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-navy-900 focus:border-pharmacy-500 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/30 disabled:bg-gray-100 disabled:text-gray-500';
const btn = 'inline-flex h-11 items-center justify-center rounded-xl bg-pharmacy-600 px-5 text-sm font-semibold text-white hover:bg-pharmacy-700 disabled:cursor-not-allowed disabled:opacity-50';
const ghost = 'inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-navy-800 ring-1 ring-gray-200 hover:bg-gray-50';

const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-navy-800">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
  </label>
);

const Message = ({ type, children }) =>
  children ? (
    <p role={type === 'error' ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-sm ${type === 'error' ? 'bg-danger-light text-danger-dark' : 'bg-success-light text-success-dark'}`}>
      {children}
    </p>
  ) : null;

// Works whether the helper returns the response body ({ success, data }) or the payload itself
const payload = (r) => {
  let d = r?.data ?? r;
  if (d && !Array.isArray(d) && typeof d === 'object' && 'success' in d && 'data' in d) d = d.data;
  return d;
};
const toList = (r) => {
  const d = payload(r);
  return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
};

const drugName = (d) => [d.genericName, d.brandName && `(${d.brandName})`, d.strength].filter(Boolean).join(' ');
const today = () => new Date().toISOString().slice(0, 10);

const blankDrug = () => ({
  genericName: '', brandName: '', strength: '', form: 'tablet', route: '', packSize: '', schedule: 'prescription_only',
  sellingPrice: '', reorderLevel: 10, maxStock: '', unit: 'unit', barcode: '', nafdacNumber: '', manufacturer: '',
  category: '', coldChain: false, highAlert: false, images: [],
});
const blankBatch = () => ({ key: Math.random().toString(36).slice(2), batchNo: '', expiryDate: '', quantity: '', costPrice: '' });

export default function AddDrugStockPage() {
  const [f, setF] = useState(blankDrug);
  const [batches, setBatches] = useState([blankBatch()]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [savedDrug, setSavedDrug] = useState(null); // set once the drug exists but its stock is not saved yet
  const [formKey, setFormKey] = useState(0); // remounts the form after a save so "Other…" boxes reset
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setVal = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const patchBatch = (key, p) => setBatches((bs) => bs.map((b) => (b.key === key ? { ...b, ...p } : b)));

  useEffect(() => {
    api.get('/pharmacy/suppliers').then((r) => setSuppliers(toList(r))).catch(() => setSuppliers([]));
  }, []);

  const addSupplier = async () => {
    const name = window.prompt('Supplier name');
    if (!name?.trim()) return;
    try {
      const r = await api.post('/pharmacy/suppliers', { name: name.trim() });
      const created = payload(r);
      toast.success('Supplier added');
      setSuppliers((s) => [...s, created]);
      setSupplierId(created._id);
    } catch (e) { setError(getErrorMessage(e)); }
  };

  const resetAll = () => {
    setF(blankDrug()); setBatches([blankBatch()]); setSupplierId(''); setInvoiceNo('');
    setSavedDrug(null); setFormKey((k) => k + 1);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (uploading) return;
    setBusy(true); setError(''); setOk('');

    let drug = savedDrug;
    try {
      // Step 1: create the drug (skipped when a previous attempt already created it)
      if (!drug) {
        const body = { ...f, sellingPrice: Number(f.sellingPrice), reorderLevel: Number(f.reorderLevel) };
        if (f.maxStock === '' || f.maxStock == null) delete body.maxStock; else body.maxStock = Number(f.maxStock);
        drug = payload(await api.post('/pharmacy/drugs', body));
        setSavedDrug(drug);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
      return;
    }

    try {
      // Step 2: add the stock for that drug
      await api.post('/pharmacy/receipts', {
        supplierId: supplierId || undefined,
        invoiceNo: invoiceNo || undefined,
        items: batches.map((b) => ({
          drugId: drug._id, batchNo: b.batchNo, expiryDate: b.expiryDate,
          quantity: Number(b.quantity), costPrice: Number(b.costPrice),
        })),
      });
      setOk(`${drugName(drug)} added with its stock.`);
      toast.success('Drug and stock saved');
      resetAll();
    } catch (err) {
      setError(`${drugName(drug)} was saved, but its stock was not. ${getErrorMessage(err)} Fix the stock details and press the button again. The drug will not be created twice.`);
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Add drug and stock</h1>
        <p className="mt-1 text-sm text-gray-600">Enter the drug and the stock you received for it, then save once.</p>
      </div>

      <form key={formKey} onSubmit={submit} className="space-y-6">
        <Message type="error">{error}</Message>
        <Message type="ok">{ok}</Message>

        {/* ------------------------- DRUG ------------------------- */}
        <fieldset disabled={!!savedDrug || busy} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-gray-200">
          <legend className="sr-only">Drug details</legend>
          <h2 className="text-lg font-semibold text-navy-900">Drug details</h2>
          {savedDrug && (
            <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              This drug is already saved. Only the stock below still needs saving.{' '}
              <button type="button" onClick={resetAll} className="font-semibold text-pharmacy-700 underline">Start over</button>
            </p>
          )}

          <Field label="Photos">
            <ImagePicker value={f.images} onChange={(images) => setF((x) => ({ ...x, images }))} onBusyChange={setUploading} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Generic name *"><input required className={input} value={f.genericName} onChange={set('genericName')} placeholder="Paracetamol" /></Field>
            <Field label="Brand name"><input className={input} value={f.brandName} onChange={set('brandName')} placeholder="Panadol" /></Field>
            <Field label="Strength"><input className={input} value={f.strength} onChange={set('strength')} placeholder="500mg" /></Field>
            <Field label="Form">
              <select className={input} value={f.form} onChange={set('form')}>{FORMS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
            </Field>
            <Field label="Route">
              <SelectOther value={f.route} onChange={setVal('route')} options={ROUTES} placeholder="Select route" otherPlaceholder="Type the route" />
            </Field>
            <Field label="Pack size">
              <SelectOther value={f.packSize} onChange={setVal('packSize')} options={PACK_SIZES} placeholder="Select pack size" otherPlaceholder="e.g. 10 x 10" />
            </Field>
            <Field label="Drug class">
              <select className={input} value={f.schedule} onChange={set('schedule')}>{CLASSES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
            </Field>
            <Field label="Selling price (₦) *"><input required inputMode="decimal" className={input} value={f.sellingPrice} onChange={set('sellingPrice')} /></Field>
            <Field label="Stock unit" hint="What one unit is: tablet, bottle, vial">
              <SelectOther value={f.unit} onChange={setVal('unit')} options={UNITS} placeholder="Select unit" otherPlaceholder="Type the unit" />
            </Field>
            <Field label="Reorder level" hint="Alert when stock falls to this number">
              <SelectOther value={f.reorderLevel} onChange={setVal('reorderLevel')} options={REORDER_LEVELS} placeholder="Select level" otherPlaceholder="Type a number" />
            </Field>
            <Field label="Max stock" hint="Optional upper limit">
              <SelectOther value={f.maxStock} onChange={setVal('maxStock')} options={MAX_STOCKS} placeholder="No limit" otherPlaceholder="Type a number" />
            </Field>
            <Field label="Barcode"><input className={input} value={f.barcode} onChange={set('barcode')} /></Field>
            <Field label="NAFDAC number"><input className={input} value={f.nafdacNumber} onChange={set('nafdacNumber')} /></Field>
            <Field label="Manufacturer">
              <SelectOther value={f.manufacturer} onChange={setVal('manufacturer')} options={MANUFACTURERS} placeholder="Select manufacturer" otherPlaceholder="Type the manufacturer" />
            </Field>
            <Field label="Category">
              <DrugCategorySelect value={f.category} onChange={setVal('category')} />
            </Field>
          </div>

          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.coldChain} onChange={set('coldChain')} className="h-4 w-4 accent-pharmacy-600" /> Needs cold storage</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.highAlert} onChange={set('highAlert')} className="h-4 w-4 accent-pharmacy-600" /> High-alert drug</label>
          </div>
        </fieldset>

        {/* ------------------------- STOCK ------------------------- */}
        <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-navy-900">Stock received</h2>
            <p className="mt-1 text-sm text-gray-600">How much of this drug came in. Use one row per batch.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Supplier">
              <div className="flex gap-2">
                <select className={input} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">No supplier</option>
                  {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <button type="button" onClick={addSupplier} className={`${ghost} shrink-0 px-3`}>New</button>
              </div>
            </Field>
            <Field label="Invoice number"><input className={input} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></Field>
          </div>

          <ul className="space-y-3">
            {batches.map((b, n) => (
              <li key={b.key} className="space-y-3 rounded-2xl bg-gray-50 p-3">
                <div className="flex items-center justify-between text-sm font-medium text-navy-800">
                  <span>Batch {n + 1}</span>
                  {batches.length > 1 && (
                    <button type="button" onClick={() => setBatches((bs) => bs.filter((x) => x.key !== b.key))} className="text-danger-dark">Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Batch no. *"><input required className={input} value={b.batchNo} onChange={(e) => patchBatch(b.key, { batchNo: e.target.value })} /></Field>
                  <Field label="Expiry date *"><input required type="date" min={today()} className={input} value={b.expiryDate} onChange={(e) => patchBatch(b.key, { expiryDate: e.target.value })} /></Field>
                  <Field label="Quantity *"><input required inputMode="numeric" className={input} value={b.quantity} onChange={(e) => patchBatch(b.key, { quantity: e.target.value })} /></Field>
                  <Field label="Cost each (₦) *"><input required inputMode="decimal" className={input} value={b.costPrice} onChange={(e) => patchBatch(b.key, { costPrice: e.target.value })} /></Field>
                </div>
              </li>
            ))}
          </ul>

          <button type="button" onClick={() => setBatches((bs) => [...bs, blankBatch()])} className={ghost}>Add another batch</button>
        </section>

        <button type="submit" disabled={busy || uploading} className={`${btn} w-full sm:w-auto`}>
          {uploading ? 'Uploading photos…' : busy ? 'Saving…' : savedDrug ? 'Save stock' : 'Save drug and stock'}
        </button>
      </form>
    </div>
  );
}